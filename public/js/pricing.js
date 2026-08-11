import { state } from "./state.js";

const OFFERS = [
  {
    from: "2026-08-02",
    to: "2026-08-14",

    day: {
      weekday: 600,
      weekend: 600,
    },

    night: {
      weekday: 900,
      weekend: 1100,
    },
  },
];

const NORMAL_RATES = {
  day: {
    weekday: 700,
    weekend: 900,
  },

  night: {
    weekday: 1000,
    weekend: 1200,
  },
};

function getRatesForDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const dateString = `${year}-${month}-${day}`;

  const offer = OFFERS.find(
    offer => dateString >= offer.from && dateString <= offer.to
  );

  // Offer exists for this date
  if (offer) {
    return offer;
  }

  // Otherwise use normal rates
  return NORMAL_RATES;
}

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

  // Determine the "business day" ONCE for the whole session.
  // A session starting before 6AM (e.g. the 12AM-1AM closing hour)
  // belongs to the PREVIOUS calendar day's late-night session.
  const businessDayRef = new Date(start);
  if (start.getHours() < 6) {
    businessDayRef.setDate(businessDayRef.getDate() - 1);
  }

  const rates = getRatesForDate(businessDayRef);
  const isWeekendDay = [0, 6].includes(businessDayRef.getDay());

  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour > end ? end : nextHour;
    const hours = (segmentEnd - current) / 36e5; // fraction of hour

    const currentHour = current.getHours();
    let rate = 0;

    // day band
    if (currentHour >= 6 && currentHour < 18) {
      rate = isWeekendDay ? rates.day.weekend : rates.day.weekday; // day
    }
    // evening / night band
    else if (
      (currentHour >= 18 && currentHour < 24) ||
      (currentHour >= 0 && currentHour < 1)
    ) {
      rate = isWeekendDay ? rates.night.weekend : rates.night.weekday; // night
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
