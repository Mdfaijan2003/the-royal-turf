export function calculateBookingAmount(start, end) {
  start = new Date(start);
  end = new Date(end);

  if (end <= start) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }

  let total = 0;

  let current = new Date(start);

  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour > end ? end : nextHour;

    const hours = (segmentEnd - current) / 36e5;

    const isWeekend = [0, 6].includes(current.getDay());

    const hour = current.getHours();

    let rate = 0;

    if (hour >= 6 && hour < 18) {
      rate = isWeekend ? 1000 : 800;
    } else if ((hour >= 18 && hour < 24) || (hour >= 0 && hour < 1)) {
      rate = isWeekend ? 1300 : 1100;
    }

    total += rate * hours;

    current = nextHour;
  }

  total = Math.round(total);

  return {
    total,
    advance: Math.round(total * 0.3),
    remaining: total - Math.round(total * 0.3),
  };
}
