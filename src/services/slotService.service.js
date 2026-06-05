// in src/services/slotService.js

import SlotLock from "../models/slotlock.js";
import Booking from "../models/booking.js";
import { mergeRanges } from "../utils/mergeRanges.js";
import { generateTimeSlots } from "../utils/timeslots.js";

export async function computeSlotsForDate(date) {
  const slots = generateTimeSlots(date);
  const dayStart = slots[0]?.start;
  const dayEnd = slots[slots.length - 1]?.end;

  const helds = await SlotLock.find({
    start: { $lt: dayEnd },
    end: { $gt: dayStart },
    expiresAt: { $gt: new Date() },
  });

  const paids = await Booking.find({
    status: "PAID",
    start: { $lt: dayEnd },
    end: { $gt: dayStart },
  });

  const bookedRanges = paids.map(b => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));

  const heldRanges = helds.map(h => ({
    start: new Date(h.start),
    end: new Date(h.end),
    expiresAt: h.expiresAt,
  }));

  const mergedBooked = mergeRanges(bookedRanges); // use your existing helper
  const mergedHeld = mergeRanges(
    heldRanges.map(h => ({ start: h.start, end: h.end }))
  );

  const allUnavailable = mergeRanges([...mergedBooked, ...mergedHeld]);

  let availableRanges = [];
  let lastEnd = new Date(dayStart);

  allUnavailable.forEach(block => {
    if (block.start > lastEnd) {
      availableRanges.push({ start: lastEnd, end: block.start });
    }
    lastEnd = new Date(Math.max(lastEnd, block.end));
  });

  if (lastEnd < new Date(dayEnd)) {
    availableRanges.push({ start: lastEnd, end: new Date(dayEnd) });
  }

  return {
    bookedRanges: mergedBooked,
    heldRanges: mergedHeld,
    availableRanges,
  };
}
