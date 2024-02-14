const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { run } = require('./extensions/order-discount/src/run'); // Adjust the path as necessary

const app = express();
app.use(bodyParser.json());

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET; // Set this environment variable in your hosting config

// Function to verify the webhook
function verifyWebhook(req, res, buf) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(buf, 'utf8', 'hex')
    .digest('base64');

  if (hmac !== hash) {
    throw new Error('Unable to verify webhook');
  }
}

// Apply body-parser middleware with the webhook verification function
app.use('/webhook', bodyParser.json({ verify: verifyWebhook }));

// Webhook endpoint for 'cart/update'
app.post('/webhook/cart-update', async (req, res) => {
  try {
    // Assuming the run function from run.js expects an object with a cart property
    // The webhook payload from Shopify will contain the updated cart
    const result = run({ cart: req.body });

    // Handle the result of the run function accordingly
    // For example, you might want to save the result to your database or take some other action

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
