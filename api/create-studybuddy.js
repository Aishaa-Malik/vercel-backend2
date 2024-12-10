import mongoose from "mongoose";
// const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

const studyBuddySchema = new mongoose.Schema({
  name: String,
  class: String,
  mockTestScore: Number,
  coachingTestScore: Number,
  discordProfile: String,
});

const StudyBuddy = mongoose.model("StudyBuddy", studyBuddySchema);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { name, class: studentClass, mockTestScore, coachingTestScore, discordProfile } = req.body;
      
      // Connect to MongoDB
      if (!mongoose.connection.readyState) {
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      }
      
      const newBuddy = new StudyBuddy({ name, class: studentClass, mockTestScore, coachingTestScore, discordProfile });
      await newBuddy.save();
      
      res.status(200).json({ message: "Profile created successfully!" });
    } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ error: "An error occurred while saving data." });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
