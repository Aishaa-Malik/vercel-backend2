import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Use environment variable
  key_secret: process.env.RAZORPAY_KEY_SECRET // Use environment variable
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { amount } = req.body;
    
    try {
      const options = {
        amount: amount * 100, // Convert amount to smallest unit (paisa)
        currency: 'INR',
        receipt: `receipt_${Math.random().toString(36).substring(7)}`,
      };

      const order = await razorpay.orders.create(options);
      res.status(200).json({ orderId: order.id });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
