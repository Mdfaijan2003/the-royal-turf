import Booking from "../models/booking.js";
import dayjs from "dayjs";
import SlotLock from "../models/slotlock.js";
import razorpay from "../config/razorpay.js";
import PaymentRequest from "../models/paymentRequest.js";
import { sendPaymentRequestEmail } from "../services/notification.service.js";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";


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
    const rows = bookings.map((b) => ({
      ...b,
      paymentStatus:
        b.status === "CANCELLED"
          ? "CANCELLED"
          : b.remainingAmount > 0
            ? "PARTIAL"
            : "PAID",
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


export const adminCancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("slotLock");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "PAID") {
      return res.status(400).json({ error: "Only paid bookings can be cancelled" });
    }

    if (dayjs(booking.start).isBefore(dayjs())) {
      return res.status(400).json({ error: "Cannot cancel past or ongoing booking" });
    }

    // 1️⃣ Mark cancelled
    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();

    // Clear dues — business rule:
    // Customer already paid advance, do we refund?
    // For now we just mark cancellation without financial logic.
    booking.remainingAmount = 0;

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
      return res.status(400).json({ error: "Cannot complete a cancelled booking" });
    }

    // Cannot complete before it has ended
    if (dayjs(booking.end).isAfter(dayjs())) {
      return res.status(400).json({ error: "Cannot complete before session end" });
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

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot take payment for cancelled booking" });
    }

    if (booking.completed) {
      return res.status(400).json({ error: "Cannot take payment for completed booking" });
    }

    if (amount <= 0) return res.status(400).json({ error: "Invalid payment amount" });

    if (amount > booking.remainingAmount) {
      return res.status(400).json({ error: "Amount exceeds remaining due" });
    }

  
    booking.manualPayments.push({
      amount,
      method,
      date: new Date()
    });

    booking.remainingAmount -= amount;

    // Update booking status
    if (booking.remainingAmount === 0) {
      booking.status = "PAID"; // fully paid
      booking.completed = true;
      booking.completedAt = new Date();
    } else {
      booking.status = "PARTIAL"; // new state you requested
    }

    await booking.save();

    return res.json({
      success: true,
      message: "Payment recorded",
      remaining: booking.remainingAmount
    });

  } catch (err) {
    console.error("manual payment error:", err);
    return res.status(500).json({ error: "Failed to update payment" });
  }
};


export const adminRequestOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot request payment for cancelled booking" });
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
      status: "PENDING"
    });

    // Send link to customer (email/whatsapp etc)
    await sendPaymentRequestEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      orderId: order.id,
      amount,
      bookingId: booking._id
    });

    return res.json({
      success: true,
      requestId: pr._id,
      orderId: order.id,
      amount
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
        { customerPhone: regex }
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
      "remainingAmount"
    ];

    const parser = new Parser({ fields, eol: "\n\n" });
    const csv = parser.parse(bookings);
    eol: "\n\n";
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
        { customerPhone: regex }
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
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bookings.pdf"
    );

    doc.pipe(res);

    // Title
    doc.fontSize(20).text("Royal Turf - Booking Statement", {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    const formatMoney = (n) => Number(n).toLocaleString("en-IN");

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





