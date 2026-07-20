import Booking from "../../models/booking.js";
import SlotLock from "../../models/slotlock.js";
import dayjs from "dayjs";
import { logAdminAction } from "../audit.service.js";
import AdminBlockedSlot from "../../models/adminBlockedSlot.js";

export const getSlotsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Slot config
    const SLOT_MINUTES = 60;
    const OPEN_HOUR = 6; // 06:00 AM
    const CLOSE_HOUR = 1; // 01:00 AM next day

    const baseDate = dayjs(date, "YYYY-MM-DD").startOf("day");

    const startOfDay = baseDate
      .hour(OPEN_HOUR)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();
    const endOfDay = baseDate
      .add(1, "day")
      .hour(CLOSE_HOUR)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();

    const now = new Date();

    // PAID BOOKINGS
    const bookings = await Booking.find({
      status: "PAID",
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    }).lean();

    // HELD /  LOCKS
    const heldLocks = await SlotLock.find({
      status: "HELD",
      expiresAt: { $gt: now },
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    }).lean();

    const blockedSlots = await AdminBlockedSlot.find({
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    })
      .populate("blockedBy", "name email")
      .lean();
    // Build slots
    const slots = [];
    let cursor = new Date(startOfDay);

    while (cursor < endOfDay) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);

      if (slotEnd > endOfDay) break;

      // BOOKED?
      const booked = bookings.find(b => slotStart < b.end && slotEnd > b.start);

      if (booked) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          status: "BOOKED",
          bookingId: booked._id,
          customerName: booked.customerName,
          customerPhone: booked.customerPhone,
          totalAmount: booked.totalAmount,
          advanceAmount: booked.advanceAmount,
          remainingAmount: booked.remainingAmount,
          paymentStatus: booked.remainingAmount > 0 ? "PARTIAL" : "PAID",
        });
        cursor = slotEnd;
        continue;
      }

      // BLOCKED?

      const blocked = blockedSlots.find(
        b => slotStart < b.end && slotEnd > b.start
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

      // HELD?
      const held = heldLocks.find(
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

      //AVAILABLE
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

export const ForceReleaseSlot = async lockId => {
  const lock = await SlotLock.findById(lockId);

  if (!lock) {
    throw new Error("Slot lock not found");
  }

  if (lock.status !== "HELD") {
    throw new Error("Only HELD slots can be force released");
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
};

export const GetHeldSlots = async (date, status) => {
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

  // NO expiresAt filtering for admin
  const slots = await SlotLock.find(query)
    .sort({ start: 1 })
    .populate("blockedBy", "name email")
    .lean();

  return slots;
};

export const createHeldSlot = async (start, end) => {
  if (!start || !end) {
    throw new Error("Start and end time required");
  }

  const startTime = new Date(start);
  const endTime = new Date(end);

  if (endTime <= startTime) {
    throw new Error("Invalid slot range");
  }

  const now = new Date();

  // Block if PAID booking exists
  const bookingConflict = await Booking.findOne({
    status: "PAID",
    start: { $lt: endTime },
    end: { $gt: startTime },
  });

  if (bookingConflict) {
    throw new Error("Slot already booked");
  }

  // Block if another HELD slot exists
  const heldConflict = await SlotLock.findOne({
    status: "HELD",
    start: { $lt: endTime },
    end: { $gt: startTime },
    expiresAt: { $gt: now },
  });

  if (heldConflict) {
    throw new Error("Slot already held");
  }

  // Create HELD slot (15 minutes TTL)
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  const lock = await SlotLock.create({
    start: startTime,
    end: endTime,
    status: "HELD",
    expiresAt,
  });

  return lock;
};

export const convertHeldToManualBooking = async (lockId, bookingData) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    totalAmount,
    paidAmount = 0,
    paymentMethod = "CASH",
  } = bookingData;

  // 1️⃣ Validate HELD slot
  const lock = await SlotLock.findById(lockId);
  if (!lock) {
    throw new Error("Slot lock not found");
  }

  if (!customerName || !customerPhone || !totalAmount) {
    throw new Error("Customer name, phone, and total amount are required");
  }

  if (lock.status !== "HELD") {
    throw new Error("Only HELD slots can be converted");
  }

  if (lock.expiresAt <= new Date()) {
    throw new Error("Slot lock has expired");
  }

  // 2️⃣ Prevent booking overlap
  const bookingConflict = await Booking.findOne({
    status: "PAID",
    start: { $lt: lock.end },
    end: { $gt: lock.start },
  });

  if (bookingConflict) {
    throw new Error("Slot already booked");
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

  return booking;
};

export const getSlotDetail = async (start, end) => {
  if (!start || !end) {
    throw new Error("Start and end time required");
  }

  const startTime = new Date(start);
  const endTime = new Date(end);

  // 1️⃣ BOOKING CHECK
  const booking = await Booking.findOne({
    start: { $lt: endTime },
    end: { $gt: startTime },
  }).lean();

  if (booking) {
    return {
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
    };
  }

  // 2️⃣ SLOT LOCK CHECK
  const lock = await SlotLock.findOne({
    start: { $lt: endTime },
    end: { $gt: startTime },
  })
    .populate("blockedBy", "name email")
    .lean();

  if (lock) {
    return {
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
    };
  }

  // 3️⃣ AVAILABLE
  return {
    status: "AVAILABLE",
    slot: { start: startTime, end: endTime },
    actions: ["HOLD", "MANUAL_BOOK", "BLOCK"],
  };
};

export const unblockSlot = async (start, end) => {
  if (!start || !end) {
    throw new Error("Start and end required");
  }

  const result = await AdminBlockedSlot.deleteOne({
    start: new Date(start),
    end: new Date(end),
  });

  if (!result.deletedCount) {
    throw new Error("Blocked slot not found");
  }
};

export const blockSlot = async (start, end, adminId) => {
  if (!start || !end) {
    throw new Error("Start and end required");
  }

  const s = new Date(start);
  const e = new Date(end);

  //  Prevent blocking booked slots
  const bookingConflict = await Booking.findOne({
    status: "PAID",
    start: { $lt: e },
    end: { $gt: s },
  });

  if (bookingConflict) {
    throw new Error("Slot already booked");
  }

  //  Prevent duplicate blocks
  const alreadyBlocked = await AdminBlockedSlot.findOne({
    start: { $lt: e },
    end: { $gt: s },
  });

  if (alreadyBlocked) {
    throw new Error("Slot already blocked");
  }

  // ✅ Release HELD locks in that range
  await SlotLock.deleteMany({
    start: { $lt: e },
    end: { $gt: s },
    status: "HELD",
  });

  await AdminBlockedSlot.create({
    start: s,
    end: e,
    blockedBy: adminId,
  });
};

export const emergencyResetSlots = async () => {
  const result = await SlotLock.deleteMany({ status: "HELD" });
  return result.deletedCount;
};
