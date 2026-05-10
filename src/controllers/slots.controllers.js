// src/controllers/slotsController.js

import mongoose from "mongoose";
import SlotLock from "../models/slotlock.js";
import Booking from "../models/booking.js";
import AdminBlockedSlot from "../models/adminBlockedSlot.js";

// Helper: convert to IST without timezone shift
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // +05:30 hrs

function startOfISTDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z"); // interpret date as UTC midnight
  return new Date(d.getTime() - IST_OFFSET);
}

// GET /slots?date=YYYY-MM-DD
export async function getSlots(req, res) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const intervalMinutes = 60;
    const openHour = 6;
    const closeHour = 1;

    const base = startOfISTDay(date);

    const startOfDay = new Date(base.getTime() + openHour * 3600000);
    const endOfDay = new Date(
      base.getTime() + 24 * 3600000 + closeHour * 3600000
    );

    const now = new Date();

    // PAID bookings
    const paidBookings = await Booking.find({
      status: "PAID",
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    }).lean();

    // HELD locks only (ignore CONSUMED & CANCELLED)
    const heldLocks = await SlotLock.find({
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
      expiresAt: { $gt: now },
      status: "HELD",
    }).lean();

    // After fetching bookings + held locks
    const blockedSlots = await AdminBlockedSlot.find({
      start: { $lt: endOfDay },
      end: { $gt: startOfDay },
    }).lean();

    const slots = [];
    let current = new Date(startOfDay);

    while (current < endOfDay) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);

      // If slot end exceeds closing time, stop
      if (slotEnd > endOfDay) break;

      // Check if this slot overlaps a PAID booking
      const isBooked = paidBookings.some(
        b => slotStart < b.end && slotEnd > b.start
      );

      // If NOT booked, check if it overlaps a HELD lock
      const isHeld =
        !isBooked &&
        heldLocks.some(h => slotStart < h.end && slotEnd > h.start);

      const isBlocked =
        !isBooked &&
        !isHeld &&
        blockedSlots.some(b => slotStart < b.end && slotEnd > b.start);

      let status = "AVAILABLE";
      if (isBooked) status = "BOOKED";
      else if (isHeld) status = "HELD";
      else if (isBlocked) status = "BLOCKED";
      slots.push({
        start: slotStart,
        end: slotEnd,
        status,
      });

      current = slotEnd;
    }

    res.json({ date, slots });
  } catch (err) {
    console.error("getSlots Error:", err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
}

// POST /slots/hold
export async function holdSlot(req, res) {
  const { start, end } = req.body;

  if (!start || !end) {
    return res.status(400).json({
      error: "Missing required fields: start, end",
    });
  }

  const newStart = new Date(start);
  const newEnd = new Date(end);

  console.log("Hold Slot Request:", { newStart, newEnd });
  if (isNaN(newStart) || isNaN(newEnd)) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  console.log(newEnd <= new Date());
  console.log( new Date());
  if (newStart <= new Date()) {
    return res.status(400).json({ error: "Booking must be in the future" });
  }

  // ❗ Check overlap with PAID bookings
  const paidConflict = await Booking.findOne({
    status: "PAID",
    start: { $lt: newEnd },
    end: { $gt: newStart },
  }).lean();

  if (paidConflict) {
    return res.status(409).json({ error: "Slot already booked" });
  }

  // ❗ Check overlap with active HELD locks
  const heldConflict = await SlotLock.findOne({
    start: { $lt: newEnd },
    end: { $gt: newStart },
    expiresAt: { $gt: new Date() },
    status: "HELD",
  }).lean();

  // After fetching bookings + held locks
  const blockedSlots = await AdminBlockedSlot.find({
    start: { $lt: newEnd },
    end: { $gt: newStart },
  }).lean();

  if (blockedSlots.length > 0) {
    return res.status(409).json({ error: "Slot is blocked by admin" });
  }

  if (heldConflict) {
    return res.status(409).json({
      error: "Slot temporarily held by another user",
    });
  }

  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // ✅ Create ONLY slot lock
    const lock = await SlotLock.create({
      start: newStart,
      end: newEnd,
      expiresAt,
    });

    // ✅ Return lockId (NOT bookingId)
    res.status(201).json({
      lockId: lock._id,
      expiresAt,
    });
  } catch (error) {
    console.error("Hold Slot Error:", error);
    res.status(500).json({ error: "Failed to hold slot" });
  }
}

export async function releaseSlotLockByBooking(bookingId, session = null) {
  return SlotLock.deleteMany(
    { booking: bookingId },
    session ? { session } : {}
  );
}

export async function validateHeldSlot(req, res) {
  try {
    const { lockId } = req.params;

    if (!lockId) {
      return res.status(400).json({ error: "Held slot ID is required" });
    }

    // Verify if lock exists & has not expired
    const now = new Date();
    const slotLock = await SlotLock.findOne({
      _id: lockId,
      expiresAt: { $gt: now }, // only still active locks
      status: "HELD",
    });

    if (!slotLock) {
      return res.status(404).json({ error: "Held slot not found or expired" });
    }

    res.json({ valid: true, lock: slotLock });
  } catch (err) {
    console.error("validateHeldSlot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Reusable logic for computing slots for a given date
export async function computeSlotsForDate(date) {
  const intervalMinutes = 60;
  const openHour = 6;
  const closeHour = 1;

  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const startOfDay = new Date(baseDate);
  startOfDay.setHours(openHour, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setHours(closeHour, 0, 0, 0);

  const now = new Date();

  const paidBookings = await Booking.find({
    status: "PAID",
    start: { $lt: endOfDay },
    end: { $gt: startOfDay },
  }).lean();

  const heldLocks = await SlotLock.find({
    start: { $lt: endOfDay },
    end: { $gt: startOfDay },
    expiresAt: { $gt: now },
    status: "HELD",
  }).lean();

  // After fetching bookings + held locks
  const blockedSlots = await AdminBlockedSlot.find({
    start: { $lt: endOfDay },
    end: { $gt: startOfDay },
  }).lean();

  const slots = [];
  let current = new Date(startOfDay);

  while (current < endOfDay) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);

    if (slotEnd > endOfDay) break;

    const isBooked = paidBookings.some(
      b => slotStart < b.end && slotEnd > b.start
    );

    const isHeld =
      !isBooked && heldLocks.some(h => slotStart < h.end && slotEnd > h.start);

    const isBlocked =
      !isBooked &&
      !isHeld &&
      blockedSlots.some(b => slotStart < b.end && slotEnd > b.start);

    let status = "AVAILABLE";
    if (isBooked) status = "BOOKED";
    else if (isHeld) status = "HELD";
    else if (isBlocked) status = "BLOCKED";

    slots.push({
      start: slotStart,
      end: slotEnd,
      status,
    });

    current = slotEnd;
  }

  return slots;
}
