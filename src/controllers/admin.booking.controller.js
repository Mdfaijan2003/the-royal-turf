import Booking from "../models/booking.js";
import dayjs from "dayjs";
import SlotLock from "../models/slotlock.js";
import razorpay from "../config/razorpay.js";
import PaymentRequest from "../models/paymentRequest.js";
// import { sendPaymentRequestEmail } from "../services/notification.service.js";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { logAdminAction } from "../services/audit.service.js";
import booking from "../models/booking.js";
import { sendBookingConfirmationNotifications } from "../services/notification.service.js";

export const adminListBookings = async (req, res) => {
  try {
    const {
      status,
      date,
      from,
      to,
      customer,
      remaining,
      completed,
      sort = "-start",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // 1️⃣ STATUS FILTER (PAID | CANCELLED)
    if (status) query.status = status;

    // 2️⃣ DATE FILTER EXACT
    if (date) {
      query.start = {
        $gte: dayjs(date).startOf("day").toDate(),
        $lte: dayjs(date).endOf("day").toDate(),
      };
    }

    // 3️⃣ RANGE FILTER
    if (from || to) {
      query.start = {};
      if (from) query.start.$gte = dayjs(from).startOf("day").toDate();
      if (to) query.start.$lte = dayjs(to).endOf("day").toDate();
    }

    // 4️⃣ CUSTOMER FILTER (name | email | phone)
    if (customer) {
      const regex = new RegExp(customer, "i");
      query.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
      ];
    }

    // 5️⃣ REMAINING PAYMENT FILTER
    if (remaining) {
      if (remaining === "UNPAID") query.remainingAmount = { $gt: 0 };
      if (remaining === "PAID") query.remainingAmount = { $eq: 0 };
    }

    // 6️⃣ COMPLETED FILTER
    if (completed !== undefined) {
      query.completed = completed === "true";
    }

    // 7️⃣ PAGINATION
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // 8️⃣ COMPUTED FIELDS FOR UI
    const rows = bookings.map(b => ({
      ...b,
      paymentStatus: b.remainingAmount > 0 ? "PARTIAL" : "PAID",
      sessionStatus:
        b.status === "CANCELLED"
          ? "CANCELLED"
          : b.completed
            ? "COMPLETED"
            : "UPCOMING",
    }));

    return res.json({
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      data: rows,
    });
  } catch (err) {
    console.error("Admin booking list error:", err);
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const adminGetBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).lean();
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Format Razorpay Info
    const razorpayInfo = booking.razorpayOrderId
      ? {
          orderId: booking.razorpayOrderId,
          paymentId: booking.razorpayPaymentId,
          paidAmount: booking.advanceAmount,
          paymentDate: booking.paymentDate,
        }
      : null;

    const totalPaid =
      booking.advanceAmount +
      (booking.manualPayments || []).reduce((acc, p) => acc + p.amount, 0);

    return res.json({
      booking: {
        ...booking,
        razorpay: razorpayInfo,
        invoice: {
          total: booking.totalAmount,
          paid: totalPaid,
          remaining: booking.remainingAmount,
        },
      },
    });
  } catch (err) {
    console.error("adminGetBookingDetails Error:", err);
    return res.status(500).json({ error: "Failed to fetch booking details" });
  }
};
async function clampRange(start, end) {
  const first = await Booking.findOne({}, { createdAt: 1 })
    .sort({ createdAt: 1 })
    .lean();

  if (!first) return { start, end };

  return {
    start: start < first.createdAt ? first.createdAt : start,
    end,
  };
}

export const adminGetBookingByDate = async (req, res) => {
  try {
    let { start, end, status, id } = req.query;

    const query = {};

    if (start && end) {
      ({ start, end } = await clampRange(start, end));

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      query.start = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (id) {
      query.id = id;
    }

    const bookings = await Booking.find(query).lean();

    console.log("Raw Bookings", bookings);
    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        bookings: [],
      });
    }

    const formatted = bookings.map(b => ({
      bookingId: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,

      date: b.start.toISOString().split("T")[0],

      startTime: b.start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      endTime: b.end.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      totalAmount: b.totalAmount,
      remainingAmount: b.remainingAmount,

      amountPaid: b.totalAmount - b.remainingAmount,

      status: b.status,

      paymentMethod: b.paymentMethod,

      razorpayOrderId: b.razorpayOrderId,
      razorpayPaymentId: b.razorpayPaymentId,
    }));
    console.log("Formatted Bookings", formatted);

    res.status(200).json({
      success: true,
      count: formatted.length,
      bookings: formatted,
    });
  } catch (error) {
    console.error("adminGetBookingByDate Error:", error);
    return res.status(500).json({ error: "Failed to fetch bookings for date" });
  }
};

export const adminCancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("slotLock");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "PAID") {
      return res
        .status(400)
        .json({ error: "Only paid bookings can be cancelled" });
    }

    if (dayjs(booking.start).isBefore(dayjs())) {
      return res
        .status(400)
        .json({ error: "Cannot cancel past or ongoing booking" });
    }

    // 1️⃣ Mark cancelled
    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();

    await booking.save();

    // 2️⃣ Release slot for new bookings
    if (booking.slotLock) {
      await SlotLock.findByIdAndDelete(booking.slotLock._id);
    }

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (err) {
    console.error("adminCancelBooking Error:", err);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
};

export const adminCompleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Cannot complete cancelled session
    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: "Cannot complete a cancelled booking" });
    }

    // Cannot complete before it has ended
    if (dayjs(booking.end).isAfter(dayjs())) {
      return res
        .status(400)
        .json({ error: "Cannot complete before session end" });
    }

    booking.completed = true;
    booking.completedAt = new Date();

    await booking.save();

    return res.json({
      message: "Booking marked as completed",
      success: true,
    });
  } catch (err) {
    console.error("adminCompleteBooking Error:", err);
    return res.status(500).json({ error: "Failed to complete booking" });
  }
};

export const adminManualPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method = "CASH" } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (amount <= 0)
      return res.status(400).json({ error: "Invalid payment amount" });

    if (amount > booking.remainingAmount) {
      return res.status(400).json({ error: "Amount exceeds remaining due" });
    }

    booking.remainingAmount -= amount;
    booking.manualPayments.push({
      amount,
      method,
      date: new Date(),
    });

    // Auto-complete booking if fully paid
    if (booking.remainingAmount === 0) {
      booking.completed = true;
      booking.completedAt = new Date();
    }

    await booking.save();

    return res.json({
      success: true,
      message: "Payment recorded",
      remaining: booking.remainingAmount,
    });
  } catch (err) {
    console.error("manual payment error:", err);
    return res.status(500).json({ error: "Failed to update payment" });
  }
};

export const searchBookingsById = async (req, res) => {
  console.log("Search bookings called", req.query);
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return res.json([]);
    }

    // normalize: bk-0a17 → 0a17
    const cleaned = q.replace(/^bk[-_]?/i, "").toLowerCase();
    console.log("🔍 Cleaned query:", cleaned);
    console.log("📦 About to run aggregation");

    const bookings = await Booking.aggregate([
      {
        $addFields: {
          idStr: { $toString: "$_id" },
        },
      },
      {
        $match: {
          idStr: { $regex: cleaned, $options: "i" },
        },
      },
      {
        $sort: { start: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          customerName: 1,
          start: 1,
          paymentMethod: 1,
          advanceAmount: 1,
          status: 1,
        },
      },
    ]);
    if (bookings.length === 0) {
      return res.json([]);
    }
    console.log("✅ Aggregation success:", bookings.length);

    const formatted = bookings.map(b => ({
      bookingId: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
      customerName: b.customerName,
      paymentMode: b.paymentMethod,
      amount: b.advanceAmount,
      status: b.status,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Search booking error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
};

export const adminRequestOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: "Cannot request payment for cancelled booking" });
    }

    if (booking.remainingAmount === 0) {
      return res.status(400).json({ error: "Booking is already fully paid" });
    }

    if (amount > booking.remainingAmount) {
      return res.status(400).json({ error: "Amount exceeds remaining due" });
    }

    // Razorpay order for remaining amount
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rem_${booking._id}`,
    });

    const pr = await PaymentRequest.create({
      booking: booking._id,
      orderId: order.id,
      amount,
      note,
      status: "PENDING",
    });

    // Send link to customer (email/whatsapp etc)
    await sendPaymentRequestEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      orderId: order.id,
      amount,
      bookingId: booking._id,
    });

    return res.json({
      success: true,
      requestId: pr._id,
      orderId: order.id,
      amount,
    });
  } catch (err) {
    console.error("adminRequestOnlinePayment Error:", err);
    return res.status(500).json({ error: "Failed to request payment" });
  }
};

export const adminExportBookings = async (req, res) => {
  try {
    const { status, customer, from, to, date } = req.query;

    const query = {};
    if (status) query.status = status;

    if (customer) {
      const regex = new RegExp(customer, "i");
      query.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
      ];
    }

    // 2️⃣ DATE FILTER EXACT
    if (date) {
      query.start = {
        $gte: dayjs(date).startOf("day").toDate(),
        $lte: dayjs(date).endOf("day").toDate(),
      };
    }

    // Date range filter
    if (from || to) {
      query.start = {};
      if (from) query.start.$gte = new Date(from);
      if (to) query.start.$lte = new Date(to);
    }

    const bookings = await Booking.find(query).lean();

    const fields = [
      "_id",
      "customerName",
      "customerEmail",
      "customerPhone",
      "start",
      "end",
      "status",
      "totalAmount",
      "advanceAmount",
      "remainingAmount",
    ];

    const parser = new Parser({ fields, eol: "\n\n" });
    const csv = parser.parse(bookings);
    res.header("Content-Type", "text/csv");
    res.attachment("bookings.csv");
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
};

export const adminExportBookingsPDF = async (req, res) => {
  try {
    const { status, customer, from, to, date } = req.query;

    const query = {};

    if (status) query.status = status;

    if (customer) {
      const regex = new RegExp(customer, "i");
      query.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
      ];
    }

    // 2️⃣ DATE FILTER EXACT
    if (date) {
      query.start = {
        $gte: dayjs(date).startOf("day").toDate(),
        $lte: dayjs(date).endOf("day").toDate(),
      };
    }

    // Date range filter
    if (from || to) {
      query.start = {};
      if (from) query.start.$gte = new Date(from);
      if (to) query.start.$lte = new Date(to);
    }

    const bookings = await Booking.find(query).lean();

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=bookings.pdf");

    doc.pipe(res);

    // Title
    doc.fontSize(20).text("Royal Turf - Booking Statement", {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    const formatMoney = n => Number(n).toLocaleString("en-IN");

    bookings.forEach((b, i) => {
      doc
        .fontSize(11)
        .text(`Booking #${i + 1}`)
        .text(`Customer: ${b.customerName}`)
        .text(`Email: ${b.customerEmail}`)
        .text(`Phone: ${b.customerPhone}`)
        .text(`Date: ${new Date(b.start).toLocaleString()}`)
        .text(`Status: ${b.status}`)
        .text(`Total: Rs. ${formatMoney(b.totalAmount)}`)
        .text(`Remaining: Rs. ${formatMoney(b.remainingAmount)}`)
        .moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF export failed" });
  }
};

export const adminManualBookingCreate = async (req, res) => {
  let slotLock;

  try {
    const {
      start,
      end,
      customerName,
      customerPhone,
      customerEmail,
      totalAmount,
      paidAmount,
      paymentMethod = "CASH",
    } = req.body;

    /* ===============================
       BASIC VALIDATION
    ============================== */

    if (!start || !end || !customerName || !customerPhone || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const startTime = new Date(start);

    const endTime = new Date(end);

    // Invalid date validation
    if (isNaN(startTime) || isNaN(endTime)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    // Time range validation
    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        error: "Invalid time range",
      });
    }

    // Payment validation
    if (totalAmount <= 0 || paidAmount < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment amount",
      });
    }

    // Advance exceeds total
    if (paidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        error: "Paid amount cannot exceed total amount",
      });
    }

    /* ===============================
       BOOKING CONFLICT CHECK
    ============================== */

    const bookingConflict = await Booking.findOne({
      status: {
        $in: ["PAID", "PARTIAL"],
      },

      start: {
        $lt: endTime,
      },

      end: {
        $gt: startTime,
      },
    });

    if (bookingConflict) {
      return res.status(409).json({
        success: false,
        error: "Slot already booked",
      });
    }

    /* ===============================
       HELD SLOT CHECK
    ============================== */

    const heldConflict = await SlotLock.findOne({
      status: "HELD",

      start: {
        $lt: endTime,
      },

      end: {
        $gt: startTime,
      },

      expiresAt: {
        $gt: new Date(),
      },
    });

    if (heldConflict) {
      return res.status(409).json({
        success: false,
        error: "Slot currently held",
      });
    }

    /* ===============================
       BLOCKED SLOT CHECK
    ============================== */

    const blockedConflict = await SlotLock.findOne({
      status: "BLOCKED",

      start: {
        $lt: endTime,
      },

      end: {
        $gt: startTime,
      },
    });

    if (blockedConflict) {
      return res.status(409).json({
        success: false,
        error: "Slot is blocked by admin",
      });
    }

    /* ===============================
       CREATE SLOT LOCK
    ============================== */

    // slotLock = await SlotLock.create({
    //   start: startTime,

    //   end: endTime,

    //   status: "CONSUMED",

    //   expiresAt: new Date("2099-12-31"),
    // });

    /* ===============================
       PAYMENT CALCULATION
    ============================== */

    const remainingAmount = Math.max(totalAmount - paidAmount, 0);

    const bookingStatus = "PAID";

    /* ===============================
       CREATE BOOKING
    ============================== */

    const booking = await Booking.create({
      start: startTime,

      end: endTime,

      customerName,

      customerPhone,

      customerEmail,

      totalAmount,

      advanceAmount: paidAmount,
      remainingAmount,
      paymentMethod,
      status: bookingStatus,

      manualPayments:
        paidAmount > 0
          ? [
              {
                amount: paidAmount,
                method: paymentMethod,
                paidAt: new Date(),
              },
            ]
          : [],

      completed: false,
    });

    /* ===============================
       ADMIN LOG
    ============================== */

    await logAdminAction({
      adminId: req.admin._id,
      action: "CREATE_MANUAL_BOOKING",
      entityType: "BOOKING",
      entityId: booking._id,

      meta: {
        start,
        end,
        totalAmount,
        paidAmount,
        remainingAmount,
        customerName,
        customerPhone,
      },
    });

    sendBookingConfirmationNotifications(booking).catch(console.error);

    /* ===============================
       SUCCESS RESPONSE
    ============================== */

    return res.status(201).json({
      success: true,
      message: "Manual booking created successfully",
      booking,
    });
  } catch (err) {
    console.error("adminManualBookingCreate error:", err);

    /* ===============================
       CLEANUP FAILED SLOT LOCK
    ============================== */

    if (slotLock?._id) {
      try {
        await SlotLock.deleteOne({
          _id: slotLock._id,
        });
      } catch (cleanupErr) {
        console.error("Failed to cleanup slot lock:", cleanupErr);
      }
    }

    return res.status(500).json({
      success: false,
      error: "Failed to create manual booking",
    });
  }
};
