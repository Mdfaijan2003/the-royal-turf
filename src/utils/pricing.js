const formatISTTime = date =>
  new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
export function calculateBookingAmount(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return {
      total: 0,
      advance: 0,
      remaining: 0,
    };
  }

  // Clone dates so originals aren't modified
  start = new Date(start);
  end = new Date(end);

  // Handle bookings crossing midnight
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  // Decide weekend/weekday ONCE based on booking start day
  const bookingDay = start.getDay();
  const isWeekend = bookingDay === 0 || bookingDay === 6;

  let total = 0;
  let current = new Date(start);

  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour < end ? nextHour : end;
    const durationHours = (segmentEnd - current) / (1000 * 60 * 60);

    const hour = current.getHours();

    let rate;

    // 06:00 AM - 05:59 PM
    if (hour >= 6 && hour < 18) {
      rate = isWeekend ? 900 : 700;
    }
    // 06:00 PM - 12:59 AM
    else if ((hour >= 18 && hour < 24) || (hour >= 0 && hour < 1)) {
      rate = isWeekend ? 1200 : 1000;
    } else {
      // Outside business hours
      rate = 0;
    }

    total += rate * durationHours;
    current = segmentEnd;
  }

  total = Math.round(total);
  const advance = Math.round(total * 0.3);

  return {
    total,
    advance,
    remaining: total - advance,
  };
}
