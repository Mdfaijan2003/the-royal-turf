import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import dayjs from "dayjs";
import { logAdminAction } from "../services/audit.service.js";

/**
 * GET /api/admin/slots?date=YYYY-MM-DD
 */
export const getAdminSlotsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // ⏰ Slot config
    const SLOT_MINUTES = 60;
    const OPEN_HOUR = 6; // 06:00 AM
    const CLOSE_HOUR = 1; // 01:00 AM next day

    const baseDate = dayjs(date).startOf("day");

    const startOfDay = baseDate.hour(OPEN_HOUR).toDate();
    const endOfDay = baseDate.add(1, "day").hour(CLOSE_HOUR).toDate();

    const now = new Date();

    // 🔴 PAID BOOKINGS
    const bookings = await Booking.find({
      status: "PAID",
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    }).lean();

    // 🟡 HELD / ⚫ BLOCKED LOCKS
    const locks = await SlotLock.find({
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
      $or: [{ status: "BLOCKED" }, { status: "HELD", expiresAt: { $gt: now } }],
    })
      .populate("blockedBy", "name email")
      .lean();

    // 🧱 Build slots
    const slots = [];
    let cursor = new Date(startOfDay);

    while (cursor < endOfDay) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);

      if (slotEnd > endOfDay) break;

      // 🔴 BOOKED?
      const booked = bookings.find(b => slotStart < b.end && slotEnd > b.start);

      if (booked) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          status: "BOOKED",
          bookingId: booked._id,
          customerName: booked.customerName,
          paymentStatus: booked.remainingAmount > 0 ? "PARTIAL" : "PAID",
        });
        cursor = slotEnd;
        continue;
      }

      // ⚫ BLOCKED?
      const blocked = locks.find(
        l => l.status === "CANCELLED" && slotStart < l.end && slotEnd > l.start
      );

      if (blocked) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          status: "BLOCKED",
          reason: blocked.blockedReason,
          blockedBy: blocked.blockedBy?.name || null,
        });
        cursor = slotEnd;
        continue;
      }

      // 🟡 HELD?
      const held = locks.find(
        l => l.status === "HELD" && slotStart < l.end && slotEnd > l.start
      );

      if (held) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          status: "HELD",
          expiresAt: held.expiresAt,
        });
        cursor = slotEnd;
        continue;
      }

      // 🟢 AVAILABLE
      slots.push({
        start: slotStart,
        end: slotEnd,
        status: "AVAILABLE",
      });

      cursor = slotEnd;
    }

    return res.json({
      date,
      slots,
      readOnly: dayjs(date).isBefore(dayjs(), "day"),
    });
  } catch (err) {
    console.error("Admin slot view error:", err);
    return res.status(500).json({ error: "Failed to load slots" });
  }
};

//Force Release HELD Slot
export const adminForceReleaseSlot = async (req, res) => {
  try {
    const { lockId } = req.params;

    const lock = await SlotLock.findById(lockId);

    if (!lock) {
      return res.status(404).json({ error: "Slot lock not found" });
    }

    if (lock.status !== "HELD") {
      return res.status(400).json({
        error: "Only HELD slots can be force released",
      });
    }

    // Mark as cancelled (released)
    lock.status = "CANCELLED";
    lock.expiresAt = new Date(); // expire immediately
    lock.blockedReason = "Force released by admin";

    await lock.save();

    //Audit log
    await logAdminAction({
      adminId: req.admin._id,
      action: "FORCE_RELEASE_SLOT",
      entityType: "SLOT",
      entityId: lock._id,
    });

    return res.json({
      success: true,
      message: "Slot force released successfully",
    });
  } catch (err) {
    console.error("adminForceReleaseSlot Error:", err);
    return res.status(500).json({ error: "Failed to release slot" });
  }
};

export const adminGetHeldSlots = async (req, res) => {
  try {
    const { date, status } = req.query;

    const query = {};

    // 1️⃣ STATUS FILTER (optional)
    if (status) {
      query.status = status.toUpperCase(); // HELD | CANCELLED | CONSUMED
    }

    // 2️⃣ DATE FILTER (optional)
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.start = { $lt: endOfDay };
      query.end = { $gt: startOfDay };
    }

    // ❌ NO expiresAt filtering for admin
    const slots = await SlotLock.find(query)
      .sort({ start: 1 })
      .populate("blockedBy", "name email")
      .lean();

    return res.json({
      total: slots.length,
      data: slots,
    });
  } catch (err) {
    console.error("adminGetHeldSlots error:", err);
    return res.status(500).json({ error: "Failed to fetch slots" });
  }
};

/**
 * POST /api/admin/slots/hold
 * Create a HELD slot (temporary lock)
 */
export const adminCreateHeldSlot = async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end time required" });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (endTime <= startTime) {
      return res.status(400).json({ error: "Invalid slot range" });
    }

    const now = new Date();

    // ❌ Block if PAID booking exists
    const bookingConflict = await Booking.findOne({
      status: "PAID",
      start: { $lt: endTime },
      end: { $gt: startTime },
    });

    if (bookingConflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    // ❌ Block if another HELD slot exists
    const heldConflict = await SlotLock.findOne({
      status: "HELD",
      start: { $lt: endTime },
      end: { $gt: startTime },
      expiresAt: { $gt: now },
    });

    if (heldConflict) {
      return res.status(409).json({ error: "Slot already held" });
    }

    // ✅ Create HELD slot (15 minutes TTL)
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const lock = await SlotLock.create({
      start: startTime,
      end: endTime,
      status: "HELD",
      expiresAt,
    });

    return res.json({
      success: true,
      message: "Slot held successfully",
      lock,
    });
  } catch (err) {
    console.error("adminCreateHeldSlot error:", err);
    return res.status(500).json({ error: "Failed to hold slot" });
  }
};

/**
 * POST /api/admin/slots/held/:lockId/convert
 * Convert HELD slot → Manual Booking
 */

export const adminConvertHeldToManualBooking = async (req, res) => {
  try {
    const { lockId } = req.params;
    const {
      customerName,
      customerPhone,
      customerEmail,
      totalAmount,
      paidAmount = 0,
      paymentMethod = "CASH",
    } = req.body;

    // 1️⃣ Validate HELD slot
    const lock = await SlotLock.findById(lockId);
    if (!lock) {
      return res.status(404).json({ error: "Slot lock not found" });
    }

    if (!customerName || !customerPhone || !totalAmount) {
      return res.status(400).json({
        error: "Customer name, phone, and total amount are required",
      });
    }

    if (lock.status !== "HELD") {
      return res.status(400).json({
        error: "Only HELD slots can be converted",
      });
    }

    if (lock.expiresAt <= new Date()) {
      return res.status(400).json({
        error: "Slot lock has expired",
      });
    }

    // 2️⃣ Prevent booking overlap
    const bookingConflict = await Booking.findOne({
      status: "PAID",
      start: { $lt: lock.end },
      end: { $gt: lock.start },
    });

    if (bookingConflict) {
      return res.status(409).json({
        error: "Slot already booked",
      });
    }

    // 3️⃣ Payment calculation
    const remainingAmount = Math.max(totalAmount - paidAmount, 0);

    // 4️⃣ Create manual booking
    const booking = await Booking.create({
      slotLock: lock._id,
      start: lock.start,
      end: lock.end,

      customerName,
      customerPhone,
      customerEmail,

      totalAmount,
      advanceAmount: paidAmount,
      remainingAmount,

      paymentMethod: "MANUAL",
      status: remainingAmount === 0 ? "PAID" : "PARTIAL",

      manualPayments:
        paidAmount > 0
          ? [
              {
                amount: paidAmount,
                method: paymentMethod,
                date: new Date(),
              },
            ]
          : [],
    });
    //Audit log
    await logAdminAction({
      adminId: req.admin._id,
      action: "CREATE_MANUAL_BOOKING",
      entityType: "BOOKING",
      entityId: booking._id,
      meta: {
        totalAmount,
        paidAmount,
        customerName,
        customerPhone,
      },
    });

    // 5️⃣ Consume HELD slot
    lock.status = "CONSUMED";
    await lock.save();

    return res.json({
      success: true,
      message: "HELD slot converted to manual booking",
      booking,
    });
  } catch (err) {
    console.error("adminConvertHeldToManualBooking error:", err);
    return res.status(500).json({ error: "Failed to convert slot" });
  }
};

export const adminGetSlotDetail = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end required" });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    // 1️⃣ BOOKING CHECK
    const booking = await Booking.findOne({
      start: { $lt: endTime },
      end: { $gt: startTime },
    }).lean();

    if (booking) {
      return res.json({
        status: "BOOKED",
        slot: { start: startTime, end: endTime },
        booking: {
          id: booking._id,
          customerName: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          paymentStatus: booking.remainingAmount === 0 ? "PAID" : "PARTIAL",
          totalAmount: booking.totalAmount,
          remainingAmount: booking.remainingAmount,
          completed: booking.completed,
        },
        actions: ["EDIT", "CANCEL", "MARK_COMPLETE"],
      });
    }

    // 2️⃣ SLOT LOCK CHECK
    const lock = await SlotLock.findOne({
      start: { $lt: endTime },
      end: { $gt: startTime },
    })
      .populate("blockedBy", "name email")
      .lean();

    if (lock) {
      return res.json({
        status: lock.status === "HELD" ? "HELD" : "BLOCKED",
        slot: { start: startTime, end: endTime },
        lock: {
          id: lock._id,
          expiresAt: lock.expiresAt,
          reason: lock.blockedReason || null,
          blockedBy: lock.blockedBy || null,
        },
        actions:
          lock.status === "HELD"
            ? ["FORCE_RELEASE", "CONVERT_TO_BOOKING"]
            : ["UNBLOCK"],
      });
    }

    // 3️⃣ AVAILABLE
    return res.json({
      status: "AVAILABLE",
      slot: { start: startTime, end: endTime },
      actions: ["HOLD", "MANUAL_BOOK", "BLOCK"],
    });
  } catch (err) {
    console.error("adminGetSlotDetail error:", err);
    return res.status(500).json({ error: "Failed to fetch slot detail" });
  }
};
