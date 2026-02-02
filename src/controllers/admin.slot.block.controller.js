import SlotLock from "../models/slotlock.js";
import Booking from "../models/booking.js";
import { logAdminAction } from "../services/audit.service.js";


/**
 * POST /api/admin/slots/block
 */
export const adminBlockSlots = async (req, res) => {
  try {
    const { start, end, reason } = req.body;
    const adminId = req.admin._id;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end time required" });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (endTime <= startTime) {
      return res.status(400).json({ error: "Invalid slot range" });
    }

    // ❌ Cannot block if booking exists
    const bookingConflict = await Booking.findOne({
      status: "PAID",
      start: { $lt: endTime },
      end: { $gt: startTime },
    });

    if (bookingConflict) {
      return res.status(409).json({
        error: "Slot already booked",
      });
    }

    // ❌ Cannot block HELD slots
    const heldConflict = await SlotLock.findOne({
      status: "HELD",
      start: { $lt: endTime },
      end: { $gt: startTime },
      expiresAt: { $gt: new Date() },
    });

    if (heldConflict) {
      return res.status(409).json({
        error: "Slot currently held by another user",
      });
    }

    // ✅ Create BLOCKED slot (using CANCELLED)
    const block = await SlotLock.create({
      start: startTime,
      end: endTime,
      status: "CANCELLED", // ← ADMIN BLOCK
      blockedReason: reason || "Admin Block",
      blockedBy: adminId,
      expiresAt: new Date("2099-12-31"), // prevents TTL deletion
    });
    
    // Audit log
    // ✅ ADD THIS IMMEDIATELY AFTER
    await logAdminAction({
      adminId,
      action: "BLOCK_SLOT",
      entityType: "SLOT",
      entityId: block._id,
      meta: { start, end, reason },
    });

    return res.json({
      success: true,
      message: "Slot blocked successfully",
      blockId: block._id,
    });
  } catch (err) {
    console.error("adminBlockSlots error:", err);
    return res.status(500).json({ error: "Failed to block slots" });
  }
};
