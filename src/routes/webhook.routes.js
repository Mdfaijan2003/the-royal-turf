import { Router } from "express";
import { razorpayWebhook } from "../controllers/webhook.controllers.js";

const webHookrouter = Router();

webHookrouter.post("/razorpay", razorpayWebhook);

export default webHookrouter;
