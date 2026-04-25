-- Add unique booking constraint for one seat per show.
CREATE UNIQUE INDEX "Booking_seatId_showId_key" ON "Booking"("seatId", "showId");