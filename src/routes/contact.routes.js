import express from "express";
import nodemailer from "nodemailer";

const contactRouter = express.Router();

contactRouter.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // 1) Configure your email transporter (example uses SMTP)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === "465", // only true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 2) Compose the email
    let mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_EMAIL, // recipient (your turf email)
      subject: "New Contact Message",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong><br/>${message}</p>`,
    };

    // 3) Send email
    await transporter.sendMail(mailOptions);

    // 4) Send a Confirmation Response via email
    await transporter.sendMail({
      from: `"Royal Turf Support" <${process.env.SMTP_USER}>`,
      to: email, // the person who filled out the form
      subject: "We Received Your Message!",
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #2F855A;">Hi ${name},</h2>
        <p style="font-size: 16px; color: #555;">
          Thank you for contacting <strong>Royal Turf</strong>! 👋
        </p>
        <p style="font-size: 14px; color: #555;">
          We’ve successfully received your message and will get back to you as soon as possible.
        </p>
        <hr style="margin: 20px 0;" />
        <h3 style="font-size: 18px; color: #2F855A;">Here’s what you sent:</h3>
        <p style="font-size: 14px; color: #333;">${message}</p>
        <br />
        <hr style="margin: 20px 0;" />
         <p style="font-size: 14px; color: #555; margin-top: 20px;">
          Our team will review your message and reply as soon as possible. In the meantime, if you have any additional questions or need urgent assistance, feel free to reply to this email or contact us at <strong>info@royalturf.com</strong>.
        </p>

        <!-- Regards & Signature -->
        <p style="font-size: 14px; color: #555; margin-top: 30px;">
          Warm regards,<br/>
          <p style="font-size: 14px; color: #777;">
          — <strong>The Royal Turf Team</strong>
        </p><br/>

          📍 36, Topsia Road, Uttar Panchannogram, Kolkata - 39<br/>
          📞 +91 8272952122
        </p>

      </div>
    </body>
    </html>
  `,
    });

    return res.status(200).json({ success: true, message: "Message sent." });
  } catch (err) {
    console.error("Email Error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to send message." });
  }
});

export default contactRouter;
