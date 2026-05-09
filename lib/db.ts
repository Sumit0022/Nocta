import mongoose from "mongoose";
import dns from "dns";

// The Magic Trick: ISP Block Bypass!
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const connectDB = async () => {
  try {
    // Agar pehle se connect hai toh wapas mat karo
    if (mongoose.connection.readyState >= 1) return;
    
    // Check karo ki .env mein link hai ya nahi
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env file. Please check it!");
    }

    // Database se connect karo
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database Connected Successfully! 🔥 (DNS Block Bypassed)");
  } catch (error) {
    console.error("Connection Error:", error);
  }
};