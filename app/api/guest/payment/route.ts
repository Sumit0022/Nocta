import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, _id, firstName, lastName, screenshot, tableId, isCaptain, subOrdinates } = body;

    let guestId = id || _id;

    if (!guestId) {
      if (!firstName || !lastName) {
         return NextResponse.json({ success: false, error: "Name or ID missing" }, { status: 400 });
      }
      const q = query(collection(db, "guests"), where("firstName", "==", firstName), where("lastName", "==", lastName));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
      }
      guestId = snapshot.docs[0].id;
    }

    const captainDoc = await getDoc(doc(db, "guests", guestId));
    let eventId = "";
    if (captainDoc.exists()) {
      eventId = captainDoc.data().eventId || "";
    }

    const guestRef = doc(db, "guests", guestId);
    const updateData: any = {
      screenshot: screenshot,
      rsvpStatus: "Need Verification", 
      isCaptain: isCaptain || false
    };

    if (tableId) {
      updateData.tableId = tableId;
      const tableRef = doc(db, "tables", tableId);
      await updateDoc(tableRef, {
        status: "Requested",
        bookedBy: guestId
      });
    }

    await updateDoc(guestRef, updateData);

    // 🚀 NEW LOGIC: Ab Sub-ordinates ka direct First Name aur Last Name DB me jayega
    if (isCaptain && Array.isArray(subOrdinates) && subOrdinates.length > 0) {
      const guestsCol = collection(db, "guests");
      
      for (const sub of subOrdinates) {
        const newSubGuest = {
          eventId: eventId,
          firstName: sub.firstName || "Guest",
          lastName: sub.lastName || "",
          mobileNumber: sub.phone,
          isSubordinate: true,
          hostId: guestId, 
          tableId: tableId || null,
          rsvpStatus: "Need Verification", 
          screenshot: screenshot, 
          createdAt: new Date().toISOString(),
          source: "table_booking_pax"
        };
        await addDoc(guestsCol, newSubGuest);
      }
    }

    return NextResponse.json({ success: true, message: "Payment & Reservation submitted" });
  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}