import AdminBlockedSlot from "../models/adminBlockedSlot.js";
import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";

export const blockSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    const adminId = req.user._id;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end required" });
    }

    const s = new Date(start);
    const e = new Date(end);

    // ❌ Prevent blocking booked slots
    const bookingConflict = await Booking.findOne({
      status: "PAID",
      start: { $lt: e },
      end: { $gt: s },
    });

    if (bookingConflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    // ❌ Prevent duplicate blocks
    const alreadyBlocked = await AdminBlockedSlot.findOne({
      start: { $lt: e },
      end: { $gt: s },
    });

    if (alreadyBlocked) {
      return res.status(409).json({ error: "Slot already blocked" });
    }

    // ✅ Release HELD locks in that range
    await SlotLock.deleteMany({
      start: { $lt: e },
      end: { $gt: s },
      status: "HELD",
    });

    await AdminBlockedSlot.create({
      start: s,
      end: e,
      blockedBy: adminId,
    });

    return res.json({ success: true, message: "Slot blocked" });
  } catch (err) {
    console.error("Block slot error:", err);
    return res.status(500).json({ error: "Failed to block slot" });
  }
};
