import { toZonedTime } from "date-fns-tz";

const IST = "Asia/Kolkata";

export function calculateBookingAmount(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return {
      total: 0,
      advance: 0,
      remaining: 0,
    };
  }

  // Convert UTC inputs to IST for calculation
  let startIST = toZonedTime(start, IST);
  let endIST = toZonedTime(end, IST);

  // Handle next day if end <= start
  if (endIST <= startIST) {
    endIST = new Date(endIST);
    endIST.setDate(endIST.getDate() + 1);
  }

  let total = 0;
  let current = new Date(startIST);

  // Define operating hours in IST
  const opening = new Date(startIST);
  opening.setHours(6, 0, 0, 0);

  const closing = new Date(startIST);
  closing.setDate(startIST.getDate() + 1);
  closing.setHours(1, 0, 0, 0); // Closed at 1 AM

  // Clamp start to opening time
  if (current > opening) {
    current = new Date(Math.max(current.getTime(), opening.getTime()));
  }

  // Clamp end to closing time
  if (endIST > closing) {
    endIST = closing;
  }

  if (current >= endIST) {
    return {
      total: 0,
      advance: 0,
      remaining: 0,
    };
  }

  // Determine the "business day" ONCE for the whole session.
  // A session starting before 6AM (e.g. the 12AM-1AM closing hour)
  // belongs to the PREVIOUS calendar day's late-night session.
  const businessDayRef = new Date(startIST);
  if (startIST.getHours() < 6) {
    businessDayRef.setDate(businessDayRef.getDate() - 1);
  }
  const isWeekendDay = [0, 6].includes(businessDayRef.getDay());

  while (current < endIST) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour > endIST ? endIST : nextHour;
    const hours = (segmentEnd - current) / 36e5; // fraction of hour

    const currentHour = current.getHours();
    let rate = 0;

    // Day band: 6 AM - 6 PM
    if (currentHour >= 6 && currentHour < 18) {
      rate = isWeekendDay ? 900 : 700; // Sat/Sun vs Mon-Fri
    }
    // Night band: 6 PM - 1 AM (next day)
    else if (
      (currentHour >= 18 && currentHour < 24) ||
      (currentHour >= 0 && currentHour < 1)
    ) {
      rate = isWeekendDay ? 1200 : 1000; // Sat/Sun vs Mon-Fri
    }
    // 1 AM - 6 AM: CLOSED (should never reach here due to clamping)

    total += rate * hours;
    current = nextHour;
  }

  total = Math.round(total);
  const advance = Math.round(total * 0.3);

  return {
    total,
    advance,
    remaining: total - advance,
  };
}
