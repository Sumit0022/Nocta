import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  // Payment Gateway
  upiId: { type: String, default: "your.upi@bank" },
  qrCode: { type: String, default: "" },
  
  // Event Content
  mainTitle: { type: String, default: "You are cordially invited" },
  mainHeadline: { type: String, default: "A Private Gathering" },
  eventDate: { type: String, default: "December 8, 2026" },
  eventTime: { type: String, default: "7:00 PM Onwards" },
  eventVenue: { type: String, default: "Grand Palace, Bareilly" },
  eventVibe: { type: String, default: "Formal & Sophisticated" }
}, { timestamps: true });

export default mongoose.models["Settings"] || mongoose.model("Settings", SettingsSchema);