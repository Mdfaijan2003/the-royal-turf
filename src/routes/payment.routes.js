import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../controllers/payment.controllers.js";
import validate from "../middleware/validate.middleware.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
} from "../validators/payment.validator.js";
const router = express.Router();

router.post("/create-order", validate(createOrderSchema), createOrder);
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);

export default router;
