import { state } from "./state.js";

export function calculateAmount(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return resetZero();

  // handle next day if end <= start
  if (end <= start) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }

  let total = 0;

  let current = new Date(start);

  // clamp to allowed booking range
  const opening = new Date(start);
  opening.setHours(6, 0, 0, 0);

  const closing = new Date(start);
  closing.setDate(start.getDate() + 1);
  closing.setHours(1, 0, 0, 0);

  // Only clamp `start` to `opening` if the booking starts *after opening*
  if (current > opening) {
    current = new Date(Math.max(current.getTime(), opening.getTime()));
  }

  // Always clamp end to not go past closing
  if (end > closing) {
    end = closing;
  }

  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour > end ? end : nextHour;
    const hours = (segmentEnd - current) / 36e5; // fraction of hour

    const isWeekendDay = [0, 6].includes(current.getDay());

    const currentHour = current.getHours();
    let rate = 0;

    // day band
    if (currentHour >= 6 && currentHour < 18) {
      rate = isWeekendDay ? 1000 : 800;
    }
    // evening / night band
    else if (
      (currentHour >= 18 && currentHour < 24) ||
      (currentHour >= 0 && currentHour < 1)
    ) {
      rate = isWeekendDay ? 1300 : 1100;
    }

    total += rate * hours;

    current = nextHour;
  }

  total = Math.round(total);
  const advance = Math.round(total * 0.3);

  state.booking.totalFee = total;
  state.booking.advance = advance;

  return { total, advance };
}

function resetZero() {
  state.booking.totalFee = 0;
  state.booking.advance = 0;
  return { total: 0, advance: 0 };
}
