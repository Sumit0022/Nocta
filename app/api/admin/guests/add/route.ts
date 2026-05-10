import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 THE FIX: Frontend se aane wale saare data ko pakdo, jisme ab eventId bhi hai
    const { firstName, lastName, mobileNumber, amount, rsvpStatus, eventId } = body;

    // 6-Digit ka unique Entry Code generate karo
    const entryCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Firebase mein bhejne ke liye naya object banao
    const newGuest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobileNumber: mobileNumber.trim(),
      amount: Number(amount),
      rsvpStatus: rsvpStatus || "Pending",
      eventId: eventId, // 🔥 YEH MISSING THA! Ab guest theek usi event mein judega
      entryCode: entryCode,
      createdAt: new Date().toISOString()
    };

    // Firebase DB mein save karo
    const docRef = await addDoc(collection(db, "guests"), newGuest);
    
    return NextResponse.json({ success: true, id: docRef.id, message: "Guest Added to Event" });
  } catch (error) {
    console.error("Add Guest Error:", error);
    return NextResponse.json({ success: false, error: "Failed to add guest" }, { status: 500 });
  }
}