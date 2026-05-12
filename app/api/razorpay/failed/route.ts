import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const { payload } = await req.json();
    const { id, _id, firstName, lastName, mobileNumber, eventId, entryType, amount } = payload;

    let guestId = id || _id;
    let finalEventId = eventId || "";
    const guestsCol = collection(db, "guests");

    // 🚀 SCENARIO 1: Naya banda tha jo pehli baar public form bhar raha tha
    if (!guestId) {
      // Check if they already pressed pay before and it failed
      const q = query(guestsCol, where("mobileNumber", "==", String(mobileNumber)), where("eventId", "==", finalEventId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Create new guest with FAILED status
        await addDoc(guestsCol, {
          firstName,
          lastName,
          mobileNumber: String(mobileNumber),
          eventId: finalEventId,
          amount: Number(amount) || 0,
          entryType: entryType || "Stag",
          rsvpStatus: "Failed", 
          createdAt: new Date().toISOString(),
          source: "razorpay_failed_attempt"
        });
      } else {
         // Agar entry ban chuki thi picchli failed attempt mein
         const existingDoc = snapshot.docs[0];
         if(existingDoc.data().rsvpStatus === "Pending") {
             await updateDoc(doc(db, "guests", existingDoc.id), { rsvpStatus: "Failed" });
         }
      }
    } 
    // 🚀 SCENARIO 2: Puraana banda tha jo aage payment karne aaya tha
    else {
      const guestRef = doc(db, "guests", guestId);
      const guestSnap = await getDoc(guestRef);
      
      // Update to failed ONLY if they are not already confirmed/checked-in
      if (guestSnap.exists() && guestSnap.data().rsvpStatus !== "Confirmed" && guestSnap.data().rsvpStatus !== "Checked-In") {
        await updateDoc(guestRef, { rsvpStatus: "Failed" });
      }
    }

    return NextResponse.json({ success: true, message: "Failure logged successfully" });
  } catch (error: any) {
    console.error("Razorpay Failure Tracking Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}