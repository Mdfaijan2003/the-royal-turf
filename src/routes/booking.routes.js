import express from 'express';
import { listBookings, cancelBooking } from '../controllers/booking.controllers.js';
const bookingRouter = express.Router();
bookingRouter.get('/', listBookings);
bookingRouter.post('/:id/cancel', cancelBooking);
export default bookingRouter;