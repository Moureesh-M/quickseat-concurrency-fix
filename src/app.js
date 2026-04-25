const express = require('express');
const bookingsRouter = require('./routes/bookings');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/bookings', bookingsRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error'
  });
});

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`QuickSeat listening on port ${port}`);
  });
}

module.exports = app;