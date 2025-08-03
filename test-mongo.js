import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const testConnection = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("URI:", process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log("MongoDB connected successfully!");
    
    // Create a simple test collection and document
    const TestSchema = new mongoose.Schema({
      name: String,
      date: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model("Test", TestSchema);
    
    const testDoc = new Test({ name: "Test Connection" });
    await testDoc.save();
    
    console.log("Test document created successfully!");
    
    // Close the connection
    await mongoose.connection.close();
    console.log("Connection closed.");
  } catch (error) {
    console.error("MongoDB connection test failed:", error);
  }
};

testConnection(); 