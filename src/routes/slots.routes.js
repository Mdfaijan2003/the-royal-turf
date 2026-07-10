import express from "express";
import {
  getSlots,
  holdSlot,
  validateHeldSlot,
} from "../controllers/slots.controllers.js";
import { releaseSlots } from "../controllers/releaseSlots.controllers.js";
import validate from "../middleware/validate.middleware.js";
import { holdSlotSchema } from "../validators/slots.validator.js";

const slotsRouter = express.Router();

slotsRouter.get("/", getSlots); // GET /api/slots
slotsRouter.post("/hold", validate(holdSlotSchema), holdSlot); // POST /api/slots/hold

slotsRouter.patch("/release/:lockId", releaseSlots); // PATCH /api/slots/release/:lockId

slotsRouter.get("/validate-held/:lockId", validateHeldSlot); // GET /api/slots/validate-held/:lockId

export default slotsRouter;
