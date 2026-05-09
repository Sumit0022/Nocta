import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  rsvpStatus: { type: String, default: "Pending" },
  amount: { type: Number, default: 0 }, 
  screenshot: { type: String }, 
  vipCategory: { type: Boolean, default: false },
  allowedGuests: { type: Number, default: 0 },
  entryCode: { type: String } // <--- Yeh nayi line add karni hai
}, { timestamps: true });

export default mongoose.models["Guest"] || mongoose.model("Guest", GuestSchema);