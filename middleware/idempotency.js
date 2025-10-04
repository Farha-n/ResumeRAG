const { db } = require('../database/init');

// Middleware to handle idempotency for POST requests
const checkIdempotency = (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return next();
  }

  // Check if we've seen this key before
  db.get(
    'SELECT response FROM idempotency_keys WHERE key = ?',
    [idempotencyKey],
    (err, row) => {
      if (err) {
        console.error('Idempotency check error:', err);
        return next();
      }

      if (row) {
        // Return cached response
        const cachedResponse = JSON.parse(row.response);
        return res.status(cachedResponse.status || 200).json(cachedResponse.data);
      }

      // Store the original response function
      const originalSend = res.send;
      const originalJson = res.json;
      let responseData = null;
      let statusCode = 200;

      // Override res.json to capture response
      res.json = function(data) {
        responseData = data;
        statusCode = res.statusCode;
        
        // Store in idempotency table
        db.run(
          'INSERT INTO idempotency_keys (key, response) VALUES (?, ?)',
          [idempotencyKey, JSON.stringify({ status: statusCode, data })],
          (err) => {
            if (err) {
              console.error('Failed to store idempotency key:', err);
            }
          }
        );

        return originalJson.call(this, data);
      };

      // Override res.send to capture response
      res.send = function(data) {
        responseData = data;
        statusCode = res.statusCode;
        
        // Store in idempotency table
        db.run(
          'INSERT INTO idempotency_keys (key, response) VALUES (?, ?)',
          [idempotencyKey, JSON.stringify({ status: statusCode, data })],
          (err) => {
            if (err) {
              console.error('Failed to store idempotency key:', err);
            }
          }
        );

        return originalSend.call(this, data);
      };

      next();
    }
  );
};

module.exports = { checkIdempotency };
