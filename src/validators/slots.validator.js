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
  })
  .refine(data => new Date(data.end) > new Date(data.start), {
    message: "End time must be after start time",
    path: ["end"],
  });
