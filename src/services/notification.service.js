import { sendEmail } from "./email.service.js";
// import { sendSMS } from "./message.service.js";

export const sendBookingConfirmationNotifications = async booking => {
  const { _id, customerName, customerEmail, start, end, paymentAmount } =
    booking;

  console.log(booking);
  const bookingId = _id.toString(); // Use MongoDB object ID as booking number
  const bookingDate = new Date(start).toLocaleDateString("en-IN");

  const startTime = new Date(start).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(end).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const bookingNumber = `BT-${bookingId.slice(-6).toUpperCase()}`; // Last 6 chars of ID

  const customerPhone = booking.customerPhone;
  console.log("🔔 Sending notifications to:", customerEmail);
  await sendEmail({
    to: customerEmail,
    subject: "Booking Confirmed – Royal Turf",
    html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background: #f4f4f4; color:#333;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:#004aad; padding:15px; text-align:center; color:#ffffff; font-size:24px; font-weight:bold;">
                Royal Turf Booking Confirmed
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:20px; font-size:16px;">
                <p style="margin:0;">Hi ${customerName},</p>
                <p style="margin:10px 0;">Thank you for booking with <strong>Royal Turf!</strong> 🎉</p>
                <p style="margin:0;">Your booking has been successfully confirmed. Please find your booking details below:</p>
              </td>
            </tr>

            <!-- Booking Info -->
            <tr>
              <td style="padding:10px 20px;">
                <table width="100%" cellpadding="5" cellspacing="0" border="0" style="font-size:15px; line-height:1.5;">
                  <tr>
                    <td style="font-weight:bold;">Booking Number:</td>
                    <td>${bookingNumber}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Date:</td>
                    <td>${bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Start Time:</td>
                    <td>${start}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">End Time:</td>
                    <td>${end}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Amount Paid:</td>
                    <td>${paymentAmount}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Rules + Requests -->
            <tr>
              <td style="background:#f9f9f9; padding:15px 20px; font-size:14px; color:#555;">
                <strong>Important Information:</strong>
                <ul style="margin:8px 0 0 16px; padding:0;">
                  <li>Please arrive <strong>at least 15 minutes before</strong> your scheduled start time.</li>
                  <li>An extension of the end time will only be allowed by <strong>up to 10 minutes</strong>, subject to availability.</li>
                </ul>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px; font-size:15px;">
                <p style="margin:0;">If you have any questions or need to make changes to your booking, feel free to reply to this email — we’re happy to help!</p>
                <p style="margin:15px 0 0 0;">Best regards,<br>Royal Turf Team</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

    </body>
    </html>
  `,
  });

  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: "New Booking Confirmed",
    html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background: #f4f4f4; color:#333;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:#004aad; padding:15px; text-align:center; color:#ffffff; font-size:24px; font-weight:bold;">
                New Booking Received
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:20px; font-size:16px;">
                <p style="margin:0;">Hi Admin,</p>
                <p style="margin:10px 0 0 0;">A new booking has been confirmed on Royal Turf. Below are the booking details:</p>
              </td>
            </tr>

            <!-- Booking Info -->
            <tr>
              <td style="padding:10px 20px;">
                <table width="100%" cellpadding="5" cellspacing="0" border="0" style="font-size:15px; line-height:1.5;">
                  <tr>
                    <td style="font-weight:bold;">Customer Name:</td>
                    <td>${customerName}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Customer Email:</td>
                    <td>${customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Customer Phone:</td>
                    <td>${customerPhone}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Booking Number:</td>
                    <td>${bookingNumber}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Date:</td>
                    <td>${bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Start Time:</td>
                    <td>${start}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">End Time:</td>
                    <td>${end}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;">Amount Paid:</td>
                    <td>${paymentAmount}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Additional Info -->
            <tr>
              <td style="background:#f9f9f9; padding:15px 20px; font-size:14px; color:#555;">
                <strong>Notes:</strong>
                <ul style="margin:8px 0 0 16px; padding:0;">
                  <li>Customer should arrive at least <strong>15 minutes before</strong> the start time.</li>
                  <li>End time can only be extended by up to <strong>10 minutes</strong>, subject to availability.</li>
                </ul>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px; font-size:15px;">
                <p style="margin:0;">This is an automated notification — no reply is needed.</p>
                <p style="margin:10px 0 0 0;">Best regards,<br>Royal Turf Booking System</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

    </body>
    </html>
  `,
  });

  // await sendSMS({
  //   to: customerPhone,
  //   message: `Royal Turf: Booking confirmed from ${new Date(
  //     start
  //   ).toLocaleTimeString()} to ${new Date(
  //     end
  //   ).toLocaleTimeString()}. Amount ₹${paymentAmount}`,
  // });

  // await sendSMS({
  //   to: process.env.ADMIN_PHONE,
  //   message: `New booking by ${customerName}. Amount ₹${paymentAmount}`,
  // });
};
