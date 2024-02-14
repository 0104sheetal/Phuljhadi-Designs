const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use the PORT environment variable provided by the platform

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Listen on all network interfaces instead of just localhost
app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`);
});
