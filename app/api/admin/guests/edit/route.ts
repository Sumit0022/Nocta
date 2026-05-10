import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore/lite";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // ID ko alag karo taaki usko DB mein update karte waqt error na aaye
    const { _id, id, ...updateData } = body; 
    const guestId = _id || id;

    if (!guestId) {
      return NextResponse.json({ success: false, message: "Guest ID missing" }, { status: 400 });
    }

    const guestRef = doc(db, "guests", guestId);
    
    // 🚀 Yahan updateData mein frontend se aane wala eventId apne aap chala jayega
    await updateDoc(guestRef, updateData); 

    return NextResponse.json({ success: true, message: "Guest updated" });
  } catch (error) {
    console.error("Edit Guest Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update guest" }, { status: 500 });
  }
}