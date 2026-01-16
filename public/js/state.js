export const state = {
  fetchedSlots: [],

  booking: {
    name: "",
    email: "",
    phone: "",
    date: "",
    startTime: "",
    endTime: "",
    totalFee: 0,
    advance: 0,
  },

  holdLockId: null,

  // BookingId after payment is successful
  bookingId: null,
  // Countdown timer
  holdTimer: null,
};
