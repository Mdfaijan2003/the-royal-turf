// src/utils/timeSlots.js
export function generateTimeSlots(dateStr, intervalMinutes = 60, openHour = 9, closeHour = 21) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const slots = [];
  let current = new Date(date);
  current.setHours(openHour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(closeHour, 0, 0, 0);

  while (current < end) {
    const next = new Date(current.getTime() + intervalMinutes * 60000);
    slots.push({ start: new Date(current), end: next });
    current = next;
  }

  return slots;
}
