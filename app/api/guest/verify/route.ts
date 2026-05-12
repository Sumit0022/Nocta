import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, mobileNumber, eventId } = await req.json();

    if (!firstName || !lastName || !mobileNumber || !eventId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const guestsCol = collection(db, "guests");

    // 🚀 NEW SECURITY FEATURE: GLOBAL IDENTITY LOCK
    // Check if this mobile number exists ANYWHERE in the database (across any event)
    const globalNumberQuery = query(guestsCol, where("mobileNumber", "==", String(mobileNumber)));
    const globalNumberSnapshot = await getDocs(globalNumberQuery);

    if (!globalNumberSnapshot.empty) {
      // Find the first valid registered identity for this number
      const existingRecord = globalNumberSnapshot.docs[0].data();
      
      const existingFullName = `${existingRecord.firstName} ${existingRecord.lastName}`.toLowerCase().trim();
      const incomingFullName = `${firstName} ${lastName}`.toLowerCase().trim();

      // If the incoming name doesn't match the universally registered name for this number
      if (existingFullName !== incomingFullName) {
        return NextResponse.json({ 
          success: false, 
          error: `Security Alert: This mobile number belongs to ${existingRecord.firstName} ${existingRecord.lastName}. Please enter your registered name or use a different number.` 
        }, { status: 403 });
      }
    }

    // 🚀 ORIGINAL LOGIC: Event-Specific Check
    // Ab check karo ki kya ye banda IS SPECIFIC EVENT ke liye registered hai ya nahi
    const eventSpecificQuery = query(
      guestsCol, 
      where("mobileNumber", "==", String(mobileNumber)), 
      where("eventId", "==", eventId)
    );
    const eventSpecificSnapshot = await getDocs(eventSpecificQuery);

    if (eventSpecificSnapshot.empty) {
      // Identity is valid (or brand new), but they are NOT registered for this specific event yet
      return NextResponse.json({ success: false, message: "Guest not found in this event" }, { status: 404 });
    }

    // Banda is event mein registered hai! Data wapas bhej do OTP ke liye.
    const guestData = eventSpecificSnapshot.docs[0].data();
    guestData._id = eventSpecificSnapshot.docs[0].id; // Assign document ID

    return NextResponse.json({ success: true, data: guestData });

  } catch (error: any) {
    console.error("Verification API Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}