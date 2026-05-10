import Salary from "../models/salary.model.js";
import Staff from "../models/staff.model.js";
import Expense from "../models/Expense.js";

/* ===============================
   HELPER: PREVIOUS MONTH
================================ */
function getPreviousMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

/* ===============================
   ADD / UPDATE SALARY
   (AUTO EXPENSE SYNC)
================================ */
export const addSalary = async (req, res) => {
  try {
    const month = getPreviousMonth();
    console.log("Adding/Updating salary for month:", month);

    const { staff, amount, status, paymentType, notes } = req.body;

    if (!staff || !amount || !paymentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const staffDoc = await Staff.findById(staff);
    if (!staffDoc) {
      return res.status(404).json({ error: "Staff not found" });
    }

    const salary = await Salary.findOneAndUpdate(
      { staff, month },
      {
        staff,
        month,
        amount,
        status,
        paymentType,
        notes,
        paidAt: status === "Paid" ? new Date() : null,
      },
      { upsert: true, new: true }
    );

    console.log("Salary record saved:", salary);

    const existingExpense = await Expense.findOne({
      linkedSalary: salary._id,
    });

    if (status === "Paid") {
      if (existingExpense) {
        existingExpense.amount = amount;
        existingExpense.expenseDate = salary.paidAt;
        existingExpense.title = `Salary - ${staffDoc.name}`;
        await existingExpense.save();
      } else {
        await Expense.create({
          title: `Salary - ${staffDoc.name}`,
          category: "SALARY",
          amount,
          paidVia: "BANK", // must match enum
          expenseDate: salary.paidAt,
          notes: notes || "",
          linkedSalary: salary._id,
          createdBy: req.admin._id,
        });
      }
    }

    if (status === "Pending" && existingExpense) {
      await existingExpense.deleteOne();
    }

    res.status(201).json(salary);
  } catch (err) {
    console.error("Add salary error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   GET PREVIOUS MONTH SALARIES
================================ */
export const getPreviousMonthSalaries = async (req, res) => {
  try {
    const month = getPreviousMonth();

    const salaries = await Salary.find({ month })
      .populate("staff", "name role")
      .sort({ "staff.name": 1 });

    res.json({ month, salaries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   PREVIOUS MONTH SALARY SUMMARY
================================ */
export const salarySummary = async (req, res) => {
  try {
    const month = getPreviousMonth();

    const data = await Salary.aggregate([
      { $match: { month } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          paid: {
            $sum: {
              $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    res.json(
      data[0] || { total: 0, paid: 0, pending: 0 }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
