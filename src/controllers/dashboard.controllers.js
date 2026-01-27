import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import dayjs from "dayjs";
import mongoose from "mongoose";

export const getDashboardSummary = async (req, res) => {
  try {
    // 📅 Date handling (default = today)
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Yesterday range (for % comparison)
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(endOfDay);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // 🧮 Mongo Aggregation
    const [todayStats] = await Booking.aggregate([
      {
        $match: {
          status: "PAID",
          start: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $project: {
          totalAmount: 1,
          advanceAmount: 1,
          remainingAmount: 1,
          paymentMethod: 1,
          durationHours: {
            $divide: [{ $subtract: ["$end", "$start"] }, 1000 * 60 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
          slotsBooked: { $sum: "$durationHours" },

          online: {
            $sum: {
              $cond: [
                { $eq: ["$paymentMethod", "ONLINE"] },
                "$advanceAmount",
                0,
              ],
            },
          },
          offline: {
            $sum: {
              $cond: [{ $eq: ["$paymentMethod", "CASH"] }, "$advanceAmount", 0],
            },
          },
          remainingToCollect: { $sum: "$remainingAmount" },
        },
      },
    ]);

    // Yesterday revenue (only revenue needed)
    const [yesterdayStats] = await Booking.aggregate([
      {
        $match: {
          status: "PAID",
          start: { $gte: yesterdayStart, $lte: yesterdayEnd },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // 🧠 Safe defaults
    const revenue = todayStats?.revenue || 0;
    const yesterdayRevenue = yesterdayStats?.revenue || 0;

    // 📈 Percentage change
    const revenueChange =
      yesterdayRevenue === 0
        ? 100
        : Math.round(((revenue - yesterdayRevenue) / yesterdayRevenue) * 100);

    // ⏱ Occupancy
    const TOTAL_SLOTS_PER_DAY = 19;
    const occupancy = todayStats?.slotsBooked
      ? Math.round((todayStats.slotsBooked / TOTAL_SLOTS_PER_DAY) * 100)
      : 0;

    // ✅ Response
    return res.json({
      revenue,
      revenueChange,
      totalBookings: todayStats?.totalBookings || 0,
      occupancy,
      online: todayStats?.online || 0,
      offline: todayStats?.offline || 0,
      remainingToCollect: todayStats?.remainingToCollect || 0,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ error: "Failed to load dashboard summary" });
  }
};

export const getDashboardBookingLedger = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      status: "PAID",
      start: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ start: -1 })
      .limit(5)
      .select("customerName advanceAmount paymentMethod status")
      .lean();

    const rows = bookings.map(b => ({
      bookingId: `BK-${b._id.toString().slice(-4).toUpperCase()}`,
      customerName: b.customerName,
      paymentMode: b.paymentMethod,
      amount: b.advanceAmount,
      status: b.status,
    }));

    return res.json(rows);
  } catch (err) {
    console.error("Dashboard ledger error:", err);
    return res.status(500).json({ error: "Failed to load booking ledger" });
  }
};
