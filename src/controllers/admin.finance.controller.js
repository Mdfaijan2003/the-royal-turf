import Expense from "../models/Expense.js";
import FinanceSalary from "../models/FinanceSalary.model.js";
import Booking from "../models/booking.js";
import FinanceSettings from "../models/FinanceSettings.js";

/* ===========================
   EXPENSES
=========================== */
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

export const addExpense = async (req, res) => {
  try {
    const { title, category, amount, paidVia, expenseDate, notes } = req.body;
    console.log("Request Body", req.body);

    if (!title || !category || !amount || !paidVia || !expenseDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    const date = new Date(expenseDate);
    if (isNaN(date)) {
      return res.status(400).json({ error: "Invalid expenseDate" });
    }

    const expense = await Expense.create({
      title,
      category: category.toUpperCase(),
      amount: Number(amount),
      paidVia: paidVia.toUpperCase(),
      expenseDate: date,
      notes,
      createdBy: req.admin._id, // admin from auth middleware
    });

    console.log("Expense", expense);

    res.status(201).json({
      success: true,
      expense,
    });
  } catch (err) {
    console.error("Add expense error:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

export const getExpenses = async (req, res) => {
  try {
    let { start, end } = req.query;

    ({ start, end } = await clampRange(start, end));

    if (!start || !end) {
      return res.status(400).json({ error: "Start and End required" });
    }
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
    })
      .sort({ expenseDate: -1 })
      .lean();
    let totalExpenses = 0;
    const byCategory = {};

    expenses.forEach(exp => {
      totalExpenses += exp.amount;

      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
    });

    res.json({
      range: { start, end },

      summary: {
        totalExpenses,
        byCategory,
      },

      data: expenses.map(exp => ({
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        paidVia: exp.paidVia,
        expenseDate: exp.expenseDate,
        notes: exp.notes,
      })),
    });
  } catch (err) {
    console.error("Get expenses error:", err);
    res.status(500).json({ error: "Failed to load expenses" });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await FinanceExpense.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===========================
   SALARIES
=========================== */

export const addSalary = async (req, res) => {
  try {
    const salary = await FinanceSalary.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSalaries = async (req, res) => {
  try {
    const { month } = req.query;

    const filter = month ? { salaryMonth: month } : {};

    const salaries = await FinanceSalary.find(filter).sort({ createdAt: -1 });

    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===========================
   FINANCE SUMMARY (🔥 KPI)
=========================== */

export const getFinanceSummary = async (req, res) => {
  try {
    let { start, end } = req.query;

    ({ start, end } = await clampRange(start, end));

    if (!start || !end) {
      return res.status(400).json({
        error: "start and end date are required (YYYY-MM-DD)",
      });
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // 1️⃣ Fetch bookings in range
    const bookings = await Booking.find({
      status: "PAID",
      paymentDate: { $gte: startDate, $lte: endDate },
    }).lean();

    let totalRevenue = 0;
    let totalCollected = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    bookings.forEach(b => {
      totalRevenue += b.totalAmount || 0;
      totalCollected += b.advanceAmount || 0;

      if ((b.remainingAmount || 0) > 0) {
        pendingAmount += b.remainingAmount;
        pendingCount++;
      }
    });

    // 2️⃣ Cash reserve (admin controlled)
    const financeSettings = await FinanceSettings.findOne().lean();
    const cashReserveAmount = financeSettings?.cashReserveAmount || 0;

    // 3️⃣ Reserve runway — DO NOT GUESS
    const reserveRunwayMonths = null; // will come from expenses later

    res.json({
      range: { start, end },

      totalRevenue,
      totalCollected,

      pendingDues: {
        amount: pendingAmount,
        count: pendingCount,
      },

      cashReserve: {
        amount: cashReserveAmount,
      },

      reserveRunway: {
        months: reserveRunwayMonths,
      },
    });
  } catch (err) {
    console.error("Finance summary error:", err);
    res.status(500).json({ error: "Failed to load finance summary" });
  }
};

export const exportExpensesCSV = async (req, res) => {
  const expenses = await FinanceExpense.find({ isDeleted: false });

  let csv = "Title,Category,Amount,Paid Via,Date\n";
  expenses.forEach(e => {
    csv += `${e.title},${e.category},${e.amount},${e.paidVia},${e.expenseDate.toDateString()}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
  res.send(csv);
};

// In admin.finance.controller.js - update getFinanceSummary
