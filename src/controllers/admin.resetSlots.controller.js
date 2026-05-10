import SlotLock from "../models/slotlock.js";
export const emergencyResetSlots = async (req, res) => {
  try {
    const result = await SlotLock.deleteMany({ status: "HELD" });

    return res.json({
      success: true,
      released: result.deletedCount,
    });
  } catch (err) {
    console.error("Emergency reset error:", err);
    return res.status(500).json({ error: "Failed to reset slots" });
  }
};
