import Booking from "../models/booking.js";
import Expense from "../models/Expense.js";

/* ===============================
   FINANCE CHARTS API
================================ */
export const financeCharts = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: "Start and end date are required",
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    /* ===============================
       1. MONTHLY REVENUE
    ================================ */
    const revenueAgg = await Booking.aggregate([
      {
        $match: {
          start: { $gte: startDate, $lte: endDate },
          status: "PAID",
        },
      },
      {
        $group: {
          _id: { $month: "$start" },
          total: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    /* ===============================
       2. MONTHLY EXPENSES
    ================================ */
    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $month: "$expenseDate" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    /* ===============================
       MONTH LABEL MAP
    ================================ */
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const revenueMap = {};
    revenueAgg.forEach(r => (revenueMap[r._id] = r.total));

    const expenseMap = {};
    expenseAgg.forEach(e => (expenseMap[e._id] = e.total));

    const months = [
      ...new Set([
        ...Object.keys(revenueMap),
        ...Object.keys(expenseMap),
      ]),
    ].sort((a, b) => a - b);

    const labels = months.map(m => monthNames[m - 1]);
    const revenue = months.map(m => revenueMap[m] || 0);
    const expenses = months.map(m => expenseMap[m] || 0);
    const profit = months.map(
      (m, i) => revenue[i] - expenses[i]
    );

    /* ===============================
       3. PAYMENT METHOD SPLIT
    ================================ */
    const paymentSplitAgg = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: startDate, $lte: endDate },
          status: "PAID",
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const paymentSplit = {};
    paymentSplitAgg.forEach(p => {
      paymentSplit[p._id] = p.total;
    });

    /* ===============================
       4. EXPENSE CATEGORY SPLIT
    ================================ */
    const expenseCategoryAgg = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const expenseCategory = {};
    expenseCategoryAgg.forEach(e => {
      expenseCategory[e._id] = e.total;
    });

    /* ===============================
       FINAL RESPONSE
    ================================ */
    res.json({
      labels,
      revenue,
      expenses,
      profit,
      paymentSplit,
      expenseCategory,
    });
  } catch (err) {
    console.error("Charts API error:", err);
    res.status(500).json({ error: "Failed to load chart data" });
  }
};
