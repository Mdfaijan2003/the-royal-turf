const formatISTTime = date =>
  new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
export function calculateBookingAmount(start, end) {
  const startEarlier = new Date(start);
  const endEarlier = new Date(end);

  start = formatISTTime(start);
  end = formatISTTime(end);

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
      rate = isWeekend ? 1000 : 700;
    } else if ((hour >= 18 && hour < 24) || (hour >= 0 && hour < 1)) {
      rate = isWeekend ? 1200 : 900;
    }

    total += rate * hours;

    current = nextHour;
  }

  total = Math.round(total);

  console.log("EarlierStart", startEarlier);
  console.log("EarlierEnd", endEarlier);

  console.log(start, end);
  console.log(total);

  return {
    total,
    advance: Math.round(total * 0.3),
    remaining: total - Math.round(total * 0.3),
  };
}
