import Razorpay from "razorpay";
const express = require("express");
const router = express.Router();

import cors from "cors";

const corsOptions = {
  origin: ["http://localhost:3000", "https://your-frontend-domain.vercel.app"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Use environment variable
  key_secret: process.env.RAZORPAY_KEY_SECRET // Use environment variable
});

export default async function handler(req, res) {
    const corsMiddleware = cors(corsOptions);
  
    // Run the CORS middleware
    await new Promise((resolve, reject) => {
      corsMiddleware(req, res, (result) =>
        result instanceof Error ? reject(result) : resolve(result)
      );
    });

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


// const express = require("express");
// const Razorpay = require("razorpay");
// const router = express.Router();

// const razorpay = new Razorpay({
//   key_id: "rzp_live_5ru2zEaMJjJWQ5",
//   key_secret: "J1redEJR3l2gmtpZwN8veXei",
// });

// router.post("/", async (req, res) => {
//   const { amount } = req.body;

//   try {
//     const options = {
//       amount: amount * 100,
//       currency: "INR",
//       receipt: `receipt_${Math.random().toString(36).substring(7)}`,
//     };

//     const order = await razorpay.orders.create(options);
//     res.status(200).json({ orderId: order.id });
//   } catch (error) {
//     console.error("Error creating order:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;
