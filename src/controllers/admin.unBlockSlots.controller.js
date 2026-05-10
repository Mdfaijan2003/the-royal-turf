export const unblockSlot = async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end required" });
    }

    const result = await AdminBlockedSlot.deleteOne({
      start: new Date(start),
      end: new Date(end),
    });

    if (!result.deletedCount) {
      return res.status(404).json({ error: "Blocked slot not found" });
    }

    return res.json({ success: true, message: "Slot unblocked" });
  } catch (err) {
    console.error("Unblock slot error:", err);
    return res.status(500).json({ error: "Failed to unblock slot" });
  }
};
