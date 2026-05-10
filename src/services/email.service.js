// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// export const sendEmail = async ({ to, subject, html }) => {
//   await transporter.sendMail({
//     from: `"Royal Turf" <${process.env.SMTP_USER}>`,
//     to,
//     subject,
//     html,
//   });
// };

import express from "express";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  await resend.emails.send({
    from: `"Royal Turf Support" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};
