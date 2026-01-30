import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, // your gmail
    pass: process.env.SMTP_PASS, // app password
  },
});

// Optional: verify connection on server start
transporter.verify((error, success) => {
  if (error) {
    console.error("Mail transporter error:", error);
  } else {
    console.log("Mail transporter ready");
  }
});

export default transporter;
