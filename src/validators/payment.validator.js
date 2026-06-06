// validators/payment.validator.js

import { z } from "zod";

export const createOrderSchema = z.object({
  lockId: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  lockId: z.string().min(1),

  customerName: z.string().trim().min(3).max(50),

  customerEmail: z.string().email(),

  customerPhone: z.string().regex(/^[6-9]\d{9}$/),

  razorpay_order_id: z.string(),

  razorpay_payment_id: z.string(),

  razorpay_signature: z.string(),
});
