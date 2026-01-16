import axios from 'axios';

export function canUseBrowserNotifications() {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return Promise.resolve('unsupported');
  }
  return Notification.requestPermission();
}

export function notify(title, body) {
  if (canUseBrowserNotifications()) {
    new Notification(title, { body });
  } else {
    alert(`${title}: ${body}`);
  }
}

export function showNotification(message, type = 'info') {
  const prefixMap = {
    success: '✅ Success:',
    error: '❌ Error:',
    warning: '⚠️ Warning:',
    info: 'ℹ️ Info:'
  };

  const prefix = prefixMap[type] || prefixMap.info;
  alert(`${prefix} ${message}`);
}

export function sendNotification({ title, body, icon, forceAlert = false }) {
  if (!forceAlert && canUseBrowserNotifications()) {
    new Notification(title, { body, icon });
  } else {
    alert(`${title}: ${body}`);
  }
}

export async function sendEmailConfirmation(to, booking) {
  const { start, end, _id: bookingId } = booking;
  const formattedStart = new Date(start).toLocaleString();
  const formattedEnd = new Date(end).toLocaleString();

  await axios.post('https://api.resend.com/emails', {
    from: 'no-reply@yourdomain.com',
    to,
    subject: 'Booking Confirmation',
    html: `
      <h2>Your Booking is Confirmed</h2>
      <p>Booking ID: <strong>${bookingId}</strong></p>
      <p>Slot: ${formattedStart} – ${formattedEnd}</p>
      <p>Thank you for booking with us!</p>
    `
  }, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

export async function sendWhatsAppConfirmation(phoneNumber, booking) {
  const { start, end, _id: bookingId } = booking;
  const formattedStart = new Date(start).toLocaleString();
  const formattedEnd = new Date(end).toLocaleString();

  await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, new URLSearchParams({
    From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    To: `whatsapp:${phoneNumber}`,
    Body: `✅ Your booking is confirmed!\n\nBooking ID: ${bookingId}\nSlot: ${formattedStart} – ${formattedEnd}\n\nThank you for booking with us!`
  }), {
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
}
