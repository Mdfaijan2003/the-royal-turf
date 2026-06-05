import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import dayjs from "dayjs";
import { logAdminAction } from "../services/audit.service.js";

import * as SlotService from "../services/admin/slots.service.js";

/**
 * GET /api/admin/slots?date=YYYY-MM-DD
 */
export const getAdminSlotsByDate = async (req, res) => {
  try {
    const result = await SlotService.getSlotsByDate(req, res);
    // The service already sends the response, so we just return here
    return;
  } catch (err) {
    console.error("Admin slot view error:", err);
    return res.status(500).json({ error: "Failed to load slots" });
  }
};

//Force Release HELD Slot
export const adminForceReleaseSlot = async (req, res) => {
  try {
    const { lockId } = req.params;

    const result = await SlotService.ForceReleaseSlot(lockId);
    console.log("Force release result:", result);

    return res.status(200).json({
      success: true,
      message: "Slot force released successfully",
    });
  } catch (err) {
    console.error("adminForceReleaseSlot Error:", err);
    return res.status(500).json({ error: "Failed to release slot" });
  }
};

export const adminGetHeldSlots = async (req, res) => {
  try {
    const { date, status } = req.query;

    const slots = await SlotService.GetHeldSlots(date, status);

    return res.json({
      total: slots.length,
      data: slots,
    });
  } catch (err) {
    console.error("adminGetHeldSlots error:", err);
    return res.status(500).json({ error: "Failed to fetch slots" });
  }
};

/**
 * POST /api/admin/slots/hold
 * Create a HELD slot (temporary lock)
 */
export const adminCreateHeldSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    const lock = await SlotService.createHeldSlot(start, end);

    return res.json({
      success: true,
      message: "Slot held successfully",
      lock,
    });
  } catch (err) {
    console.error("adminCreateHeldSlot error:", err);
    return res.status(500).json({ error: "Failed to hold slot" });
  }
};

/**
 * POST /api/admin/slots/held/:lockId/convert
 * Convert HELD slot → Manual Booking
 */

export const adminConvertHeldToManualBooking = async (req, res) => {
  try {
    const { lockId } = req.params;
    const bookingData = req.body;

    const booking = await SlotService.convertHeldToManualBooking(
      lockId,
      bookingData
    );

    return res.json({
      success: true,
      message: "HELD slot converted to manual booking",
      booking,
    });
  } catch (err) {
    console.error("adminConvertHeldToManualBooking error:", err);
    return res.status(500).json({ error: "Failed to convert slot" });
  }
};

export const adminGetSlotDetail = async (req, res) => {
  try {
    const { start, end } = req.query;

    const result = await SlotService.getSlotDetail(start, end);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("adminGetSlotDetail error:", err);
    return res.status(500).json({ error: "Failed to fetch slot detail" });
  }
};

export const unblockSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    await SlotService.unblockSlot(start, end);
    return res.status(200).json({ success: true, message: "Slot unblocked" });
  } catch (err) {
    console.error("Unblock slot error:", err);
    return res.status(500).json({ error: "Failed to unblock slot" });
  }
};

export const blockSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    const adminId = req.user._id;

    await SlotService.blockSlot(start, end, adminId);

    return res.status(200).json({ success: true, message: "Slot blocked" });
  } catch (err) {
    console.error("Block slot error:", err);
    return res.status(500).json({ error: "Failed to block slot" });
  }
};

export const emergencyResetSlots = async (req, res) => {
  try {
    const result = await SlotService.emergencyResetSlots();

    return res.status(200).json({
      success: true,
      released: result,
    });
  } catch (err) {
    console.error("Emergency reset error:", err);
    return res.status(500).json({ error: "Failed to reset slots" });
  }
};
