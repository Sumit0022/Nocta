import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Generate a unique VIP code (jaise: NCT-A5B2C)
    const entryCode = "NCT-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Firebase Firestore logic: 'guests' naam ka collection banega
    const docRef = await addDoc(collection(db, "guests"), {
      firstName: body.firstName,
      lastName: body.lastName,
      mobileNumber: body.mobileNumber,
      amount: Number(body.amount),
      rsvpStatus: body.rsvpStatus || "Pending",
      entryCode: entryCode,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Firebase Add Error:", error);
    return NextResponse.json({ success: false, error: "Failed to add guest" }, { status: 500 });
  }
}