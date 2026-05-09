import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, screenshot, id, _id } = body;

    // Frontend kabhi id bhejta hai, kabhi _id. Dono catch karlo.
    let guestId = id || _id;

    // Agar ID nahi aayi, toh First Name / Last Name se dhoondho
    if (!guestId) {
      if (!firstName || !lastName) {
         return NextResponse.json({ success: false, error: "Name or ID missing" }, { status: 400 });
      }
      
      const q = query(
        collection(db, "guests"),
        where("firstName", "==", firstName),
        where("lastName", "==", lastName)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
      }
      guestId = snapshot.docs[0].id;
    }

    // Guest mil gaya, ab Firebase mein screenshot aur status update kar do
    const guestRef = doc(db, "guests", guestId);
    await updateDoc(guestRef, {
      screenshot: screenshot,
      rsvpStatus: "Need Verification"
    });

    return NextResponse.json({ success: true, message: "Payment submitted successfully" });
  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}