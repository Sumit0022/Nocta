import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payload } = body;

    const { 
      id, _id, firstName, lastName, mobileNumber, eventId: payloadEventId, 
      entryType, isUpgrade, previousAmount, amount, 
      tableId, isCaptain, subOrdinates, partnerDetails 
    } = payload;

    let finalEventId = payloadEventId || "";

    // 1. Fetch Event Secret Key for Verification
    const eventDoc = await getDoc(doc(db, "events", finalEventId));
    if (!eventDoc.exists()) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    const secret = eventDoc.data().razorpaySecret;

    // 2. Cryptographic Signature Verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", secret).update(sign.toString()).digest("hex");

    if (razorpay_signature !== expectedSign) {
      return NextResponse.json({ success: false, error: "Invalid payment signature. Potential fraud detected." }, { status: 400 });
    }

    // 3. MASTER DATABASE LOGIC
    let guestId = id || _id;
    const guestsCol = collection(db, "guests");

    const newPaymentRecord = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amountPaid: Number(amount) || 0,
      date: new Date().toISOString(),
      type: entryType || "Stag",
      method: "razorpay_auto"
    };

    // 🚀 THE FIX: SMART GUEST RECOVERY FOR RETRIES
    // Agar frontend ne ID nahi bheji, par mobile number DB mein hai (Failed/Pending attempt se)
    if (!guestId && mobileNumber) {
      const q = query(guestsCol, where("mobileNumber", "==", String(mobileNumber)), where("eventId", "==", finalEventId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        guestId = snapshot.docs[0].id; // 🟢 Purana record mil gaya! Ab error nahi denge, isko update karenge!
      }
    }

    if (!guestId) {
      // --- BRAND NEW GUEST ---
      const newEntryCode = Math.floor(100000 + Math.random() * 900000).toString();

      const newGuestDoc = await addDoc(guestsCol, {
        firstName, lastName, mobileNumber: String(mobileNumber), eventId: finalEventId,
        amount: Number(amount) || 0, entryType: entryType || "Stag",
        rsvpStatus: "Confirmed", 
        entryCode: newEntryCode, 
        paymentHistory: [newPaymentRecord], 
        createdAt: new Date().toISOString(), source: "public_registration_auto"
      });
      guestId = newGuestDoc.id; 
    } else {
      // --- EXISTING GUEST (Upgrade or Successful Retry) ---
      const captainDoc = await getDoc(doc(db, "guests", guestId));
      if (!captainDoc.exists()) return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
      
      const captainData = captainDoc.data();
      let existingHistory = captainData.paymentHistory || [];
      
      // Migration for old screenshots
      if (existingHistory.length === 0 && captainData.screenshot) {
        existingHistory.push({ screenshot: captainData.screenshot, amountPaid: Number(captainData.amount) || 0, date: captainData.createdAt || new Date().toISOString(), type: captainData.entryType || "Stag" });
      }
      
      existingHistory.push(newPaymentRecord);
      
      const updateData: any = {
        paymentHistory: existingHistory, 
        rsvpStatus: "Confirmed", // 🟢 Overwrites "Failed" to "Confirmed"
        isCaptain: isCaptain || false, entryType: entryType || captainData.entryType
      };

      if (!captainData.entryCode) {
        updateData.entryCode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      if (isUpgrade) updateData.amount = Number(previousAmount || 0) + Number(amount || 0);
      else updateData.amount = Number(amount || captainData.amount || 0);

      await updateDoc(doc(db, "guests", guestId), updateData);
    }

    // 4. ASSIGN TABLES & PARTNERS INSTANTLY
    if (tableId) {
      await updateDoc(doc(db, "guests", guestId), { tableId: tableId, isCaptain: true });
      await updateDoc(doc(db, "tables", tableId), { status: "Booked", bookedBy: guestId });
    }

    let processedSubOrdinates = subOrdinates || [];
    if (entryType === "Couple" && !tableId && partnerDetails) {
      processedSubOrdinates = [{ firstName: partnerDetails.firstName, lastName: partnerDetails.lastName, phone: partnerDetails.phone }];
    }

    if (processedSubOrdinates && processedSubOrdinates.length > 0) {
      if (isUpgrade) {
         const oldSubsQuery = query(guestsCol, where("hostId", "==", guestId));
         const oldSubsSnapshot = await getDocs(oldSubsQuery);
         await Promise.all(oldSubsSnapshot.docs.map(d => updateDoc(doc(db, "guests", d.id), { rsvpStatus: "Cancelled" }))); 
      }
      for (const sub of processedSubOrdinates) {
        if (!sub.firstName) continue; 
        
        const subEntryCode = Math.floor(100000 + Math.random() * 900000).toString();

        await addDoc(guestsCol, {
          eventId: finalEventId, firstName: sub.firstName, lastName: sub.lastName || "", mobileNumber: String(sub.phone),
          isSubordinate: true, hostId: guestId, tableId: tableId || null,
          rsvpStatus: "Confirmed", 
          entryCode: subEntryCode, 
          createdAt: new Date().toISOString(), source: tableId ? "table_booking_pax" : "couple_partner"
        });
      }
    }

    return NextResponse.json({ success: true, message: "Payment Verified & Pass Generated!" });
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ success: false, error: "Server error during verification" }, { status: 500 });
  }
}