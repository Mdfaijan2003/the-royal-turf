// validators/slots.validator.js

import { z } from "zod";

export const holdSlotSchema = z
  .object({
    start: z.string().refine(value => !isNaN(Date.parse(value)), {
      message: "Invalid start date",
    }),

    end: z.string().refine(value => !isNaN(Date.parse(value)), {
      message: "Invalid end date",
    }),

    customerName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name is too long"),

    customerEmail: z.string().trim().email("Invalid email address"),

    customerPhone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  })
  .refine(data => new Date(data.end) > new Date(data.start), {
    message: "End time must be after start time",
    path: ["end"],
  });
