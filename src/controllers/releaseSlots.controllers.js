import SlotLock from "../models/slotlock.js";

export async function releaseSlots(req, res) {
  try {
    const { lockId } = req.params;
    console.log("Releasing slot lock for lockId:", lockId);

    if (!lockId) {
      return res.status(400).json({ error: "lockId is required" });
    }

    const result = await SlotLock.findByIdAndUpdate(
      lockId,
      { status: "CANCELLED", expiresAt: new Date(), },
      { new: true }
    );

    console.log(`Released slot lock for lockId: ${lockId}`, result);

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error("SlotLock deletion error:", err);
    return res.status(500).json({ error: "Failed to delete slot lock" });
  }
}
