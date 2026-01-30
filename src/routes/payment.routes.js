import express from "express";
import { createOrder, verifyPayment, verifyRemainingPayment } from "../controllers/payment.controllers.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.post("/verify-remaining", verifyRemainingPayment);


export default router;
