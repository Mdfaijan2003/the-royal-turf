import express from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controllers.js';
const webHookrouter = express.Router();
webHookrouter.post('/', handlePaymentWebhook);
export default webHookrouter;