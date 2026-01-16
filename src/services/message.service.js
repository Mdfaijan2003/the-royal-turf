import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async ({ to, message }) => {
  try {
    const sms = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to,
    });
    console.log("SMS sent (via messaging service):", sms.sid);
  } catch (err) {
    console.error("Twilio SMS failed:", err.code, err.message);
  }
};

// export const sendSMS = async ({ to, message }) => {
//   try {
//     const sms = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE,  // Twilio number
//       to,
//     });
//     console.log("SMS sent (direct):", sms.sid);
//   } catch (err) {
//     console.error("Twilio SMS failed:", err.code, err.message);
//   }
// };

