const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS options
const corsOptions = {
  origin: ["http://localhost:3000"], // Local frontend
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Import API routes
app.use("/api/create-order", require("./api/create-order"));
app.use("/api/create-studybuddy", require("./api/create-studybuddy"));

const PORT = process.env.PORT || 8080;

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Start the server locally
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));


// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const Razorpay = require('razorpay');

// const app = express();

// const corsOptions = {
//   origin: ["http://localhost:3000", "https://your-frontend-domain.vercel.app"], // Add frontend domains here
//   methods: ["GET", "POST"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// // Middleware
// app.use(cors(corsOptions));
// app.use(express.json());

// // Import your routes
// app.use("/api/create-order", require("./api/create-order"));
// app.use("/api/create-studybuddy", require("./api/create-studybuddy"));

// console.log("Starting the server...");

// const PORT= process.env.PORT || 8080;
// const uri = 'mongodb+srv://aishafaang:LmOXMqZ7YdNdBTPQ@doubtbuddycluster.gayfw.mongodb.net/?retryWrites=true&w=majority&appName=DoubtBuddyCluster';
// // const uri = '';

// app.use((req, res, next) => {
//   console.log(`Request received at ${new Date().toISOString()} on ${req.url}`);
//   next();
// });


// // MongoDB connection
// mongoose
//   .connect(uri)
//   .then(() => console.log("MongoDB connected"))
//   .catch((err) => console.error("Error connecting to MongoDB:", err));

// // Schema and Model
// const studyBuddySchema = new mongoose.Schema({
//   name: String,
//   class: String,
//   mockTestScore: Number,
//   coachingTestScore: Number,
//   discordProfile: String,
// });

// const StudyBuddy = mongoose.model("StudyBuddy", studyBuddySchema);

// // API Route
// app.post("/api/studybuddy", async (req, res) => {
//   try {
//     const { name, class: studentClass, mockTestScore, coachingTestScore, discordProfile } = req.body;
//     const newBuddy = new StudyBuddy({ name, class: studentClass, mockTestScore, coachingTestScore, discordProfile });
//     await newBuddy.save();
//     res.status(200).send("Profile created successfully!");
//   } catch (error) {
//     console.error("Error saving data:", error);
//     res.status(500).send("An error occurred while saving data.");
//   }
// });


// const razorpay = new Razorpay({
//     key_id: 'rzp_live_5ru2zEaMJjJWQ5', // Replace with your Razorpay Key ID
//     key_secret: 'J1redEJR3l2gmtpZwN8veXei'
//   });
  
//   app.post('/create-order', async (req, res) => {
//     console.log('Create order request received:', req.body); // Debug log

//     const { amount } = req.body;
  
//     try {
//       const options = {
//         amount: amount * 100, // Convert amount to smallest unit (paisa)
//         currency: 'INR',
//         receipt: `receipt_${Math.random().toString(36).substring(7)}`,
//       };

//       const order = await razorpay.orders.create(options);
//       res.status(200).json({ orderId: order.id });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   });


// // Start server
// app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
//   console.log('Server is running on port 8080');
// });

//  //app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
