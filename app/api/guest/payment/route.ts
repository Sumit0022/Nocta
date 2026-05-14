import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      id, _id, firstName, lastName, mobileNumber, eventId: payloadEventId, 
      entryType, isUpgrade, previousAmount, amount, 
      screenshot, tableId, isCaptain, subOrdinates, partnerDetails,
      preOrders // 🚀 EXTRACTED PRE-ORDERS
    } = body;

    let guestId = id || _id;
    let finalEventId = payloadEventId || "";

    const guestsCol = collection(db, "guests");

    // 🚀 NEW PAYMENT RECORD OBJECT (To store in history)
    const newPaymentRecord = {
      screenshot: screenshot,
      amountPaid: Number(amount) || 0, // Sirf wo amount jo abhi pay kiya gaya hai
      date: new Date().toISOString(),
      type: entryType || "Stag"
    };

    // 🚀 SCENARIO 1: COMPLETELY NEW PUBLIC GUEST (No ID exists)
    if (!guestId) {
      if (!firstName || !lastName || !mobileNumber) {
        return NextResponse.json({ success: false, error: "Missing required guest details" }, { status: 400 });
      }
      
      const q = query(guestsCol, where("mobileNumber", "==", String(mobileNumber)), where("eventId", "==", finalEventId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return NextResponse.json({ success: false, error: "This mobile number is already registered." }, { status: 400 });
      }

      // 🟢 Create the New Guest Record
      const newGuestDoc = await addDoc(guestsCol, {
        firstName,
        lastName,
        mobileNumber: String(mobileNumber),
        eventId: finalEventId,
        amount: Number(amount) || 0,
        entryType: entryType || "Stag",
        rsvpStatus: "Need Verification", 
        screenshot: screenshot, // Primary display
        paymentHistory: [newPaymentRecord], // 🚀 HISTORY INITIATED
        preOrders: preOrders || [], // 🍾 🚀 SAVING VIP MENU ITEMS
        createdAt: new Date().toISOString(),
        source: "public_registration"
      });

      guestId = newGuestDoc.id; 
    } 
    
    // 🚀 SCENARIO 2: EXISTING GUEST (Normal Payment or Upgrade)
    else {
      const captainDoc = await getDoc(doc(db, "guests", guestId));
      if (!captainDoc.exists()) {
        return NextResponse.json({ success: false, error: "Guest record not found" }, { status: 404 });
      }
      
      finalEventId = captainDoc.data().eventId || finalEventId;
      
      // 🚀 MIGRATION: Fetch existing history OR migrate the old single screenshot to an array
      let existingHistory = captainDoc.data().paymentHistory || [];
      if (existingHistory.length === 0 && captainDoc.data().screenshot) {
        existingHistory.push({
          screenshot: captainDoc.data().screenshot,
          amountPaid: Number(captainDoc.data().amount) || 0,
          date: captainDoc.data().createdAt || new Date().toISOString(),
          type: captainDoc.data().entryType || "Stag"
        });
      }

      // Append the new payment to the history
      existingHistory.push(newPaymentRecord);
      
      // 🚀 MIGRATING OR APPENDING PRE-ORDERS
      const existingPreOrders = captainDoc.data().preOrders || [];
      const updatedPreOrders = preOrders && preOrders.length > 0 ? preOrders : existingPreOrders;

      const updateData: any = {
        screenshot: screenshot, // Keep latest as primary for list view
        paymentHistory: existingHistory, // 🚀 UPDATED HISTORY SAVED
        preOrders: updatedPreOrders, // 🍾 🚀 SAVING VIP MENU ITEMS
        rsvpStatus: "Need Verification", 
        isCaptain: isCaptain || false,
        entryType: entryType || captainDoc.data().entryType
      };

      // 💰 UPGRADE MATH LOGIC
      if (isUpgrade) {
        updateData.amount = Number(previousAmount || 0) + Number(amount || 0);
      } else {
        updateData.amount = Number(amount || captainDoc.data().amount || 0);
      }

      const guestRef = doc(db, "guests", guestId);
      await updateDoc(guestRef, updateData);
    }

    // --- FROM HERE, GUEST ID IS GUARANTEED ---

    // 🚀 TABLE ASSIGNMENT LOGIC
    if (tableId) {
      const guestRef = doc(db, "guests", guestId);
      await updateDoc(guestRef, { tableId: tableId, isCaptain: true });

      const tableRef = doc(db, "tables", tableId);
      await updateDoc(tableRef, {
        status: "Requested",
        bookedBy: guestId
      });
    }

    // 🚀 PARTNER LOGIC (For Couples NOT taking a table)
    let processedSubOrdinates = subOrdinates || [];
    
    if (entryType === "Couple" && !tableId && partnerDetails) {
      processedSubOrdinates = [{
        firstName: partnerDetails.firstName,
        lastName: partnerDetails.lastName,
        phone: partnerDetails.phone
      }];
    }

    // 🚀 SUB-ORDINATES SAVING LOGIC
    if (processedSubOrdinates && processedSubOrdinates.length > 0) {
      // Clean old subs on upgrade to prevent duplication
      if (isUpgrade) {
         const oldSubsQuery = query(guestsCol, where("hostId", "==", guestId));
         const oldSubsSnapshot = await getDocs(oldSubsQuery);
         const deletePromises = oldSubsSnapshot.docs.map(d => updateDoc(doc(db, "guests", d.id), { rsvpStatus: "Cancelled" })); 
         await Promise.all(deletePromises);
      }

      for (const sub of processedSubOrdinates) {
        if (!sub.firstName) continue; 

        const newSubGuest = {
          eventId: finalEventId,
          firstName: sub.firstName,
          lastName: sub.lastName || "",
          mobileNumber: String(sub.phone),
          isSubordinate: true,
          hostId: guestId, 
          tableId: tableId || null,
          rsvpStatus: "Need Verification", 
          screenshot: screenshot, 
          createdAt: new Date().toISOString(),
          source: tableId ? "table_booking_pax" : "couple_partner"
        };
        await addDoc(guestsCol, newSubGuest);
      }
    }

    return NextResponse.json({ success: true, message: "Payment & Reservation submitted successfully!" });
  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}