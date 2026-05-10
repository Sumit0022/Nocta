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

    // 🚀 Get Captain's data to copy Event ID for Sub-ordinates
    const captainDoc = await getDoc(doc(db, "guests", guestId));
    let eventId = "";
    if (captainDoc.exists()) {
      eventId = captainDoc.data().eventId || "";
    }

    const guestRef = doc(db, "guests", guestId);
    const updateData: any = {
      screenshot: screenshot,
      rsvpStatus: "Need Verification", // Admin pehle payment verify karega
      isCaptain: isCaptain || false
    };

    if (tableId) {
      updateData.tableId = tableId;
      
      // Update Table Status
      const tableRef = doc(db, "tables", tableId);
      await updateDoc(tableRef, {
        status: "Requested", // Jab admin payment verify karega toh "Booked" ho jayega
        bookedBy: guestId
      });
    }

    await updateDoc(guestRef, updateData);

    // 🚀 MAGIC: Sub-ordinates ki entry automatically banao
    if (isCaptain && Array.isArray(subOrdinates) && subOrdinates.length > 0) {
      const guestsCol = collection(db, "guests");
      
      for (const sub of subOrdinates) {
        // Name ko split karna (First Name aur Last Name ke liye)
        const nameParts = sub.name.trim().split(" ");
        const subFirstName = nameParts[0] || "Guest";
        const subLastName = nameParts.slice(1).join(" ") || "";

        const newSubGuest = {
          eventId: eventId,
          firstName: subFirstName,
          lastName: subLastName,
          mobileNumber: sub.phone,
          isSubordinate: true,
          hostId: guestId, // Captain ki ID
          tableId: tableId || null,
          rsvpStatus: "Need Verification", // Captain ke sath verify hoga
          screenshot: screenshot, // Same screenshot taaki admin cross-check kar sake
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