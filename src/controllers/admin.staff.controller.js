import Staff from "../models/staff.model.js";

/* ===============================
   CREATE STAFF
================================ */
export const createStaff = async (req, res) => {
  try {
    const { name, role, email } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        error: "Name and role are required",
      });
    }

    const staff = await Staff.create({
      name,
      role,
      email: email || null,
    });

    res.status(201).json(staff);
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   GET ALL ACTIVE STAFF
================================ */
export const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ active: true }).sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({ error: err.message });
  }
};
