import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore/lite";

// 🚀 Unique 6-digit VIP Code Generator
const generateEntryCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { _id, id, rsvpStatus, tableId, isCaptain, entryCode } = body;
    const guestId = _id || id;

    if (!guestId) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    const guestRef = doc(db, "guests", guestId);
    const updateData: any = { rsvpStatus };

    // 1. Agar Confirmed ho raha hai aur pehle se code nahi hai toh naya banao
    if (rsvpStatus === "Confirmed" && !entryCode) {
      updateData.entryCode = generateEntryCode();
    }

    await updateDoc(guestRef, updateData);

    // 🚀 MASTER LOGIC: Group Verification & Rejection 
    if (isCaptain) {
      const guestsCol = collection(db, "guests");
      const q = query(guestsCol, where("hostId", "==", guestId));
      const subDocs = await getDocs(q);

      // CASE A: Payment Approved (Confirm Everyone)
      if (rsvpStatus === "Confirmed") {
        if (tableId) {
          const tableRef = doc(db, "tables", tableId);
          await updateDoc(tableRef, { status: "Booked" });
        }

        const confirmPromises = subDocs.docs.map(subDoc => {
          const subRef = doc(db, "guests", subDoc.id);
          return updateDoc(subRef, { 
            rsvpStatus: "Confirmed",
            entryCode: generateEntryCode() 
          });
        });
        await Promise.all(confirmPromises);
      }

      // 🛡️ CASE B: Payment Rejected (Fail Everyone & Free Table) 
      else if (rsvpStatus === "Failed") {
        // 1. Table ko wapas khali karo
        if (tableId) {
          const tableRef = doc(db, "tables", tableId);
          await updateDoc(tableRef, { status: "Available", bookedBy: null });
        }

        // 2. Saare doston ko bhi Failed mark karo
        const failPromises = subDocs.docs.map(subDoc => {
          const subRef = doc(db, "guests", subDoc.id);
          return updateDoc(subRef, { 
            rsvpStatus: "Failed",
            entryCode: "" // Code hata do agar pehle se tha
          });
        });
        await Promise.all(failPromises);
      }
    }

    return NextResponse.json({ success: true, message: "Sync operation successful!" });
  } catch (error) {
    console.error("Edit Guest Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}