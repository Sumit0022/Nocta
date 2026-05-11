import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore/lite";

export async function DELETE(req: Request) {
  try {
    const { mobileNumber } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json({ success: false, error: "Mobile number is required" }, { status: 400 });
    }

    // 1. Saare events mein is mobile number ko dhundo
    const guestsCol = collection(db, "guests");
    const q = query(guestsCol, where("mobileNumber", "==", mobileNumber));
    const snapshot = await getDocs(q);

    const deletePromises: Promise<any>[] = [];

    snapshot.forEach((guestDoc) => {
      const data = guestDoc.data();

      // Agar iske paas table thi, toh usko wapas "Available" karo
      if (data.isCaptain && data.tableId) {
        const tableRef = doc(db, "tables", data.tableId);
        deletePromises.push(updateDoc(tableRef, { status: "Available", bookedBy: null }));
      }

      // Guest ka record delete karo
      deletePromises.push(deleteDoc(guestDoc.ref));
    });

    // 2. Agar banda blacklist mein tha, toh wahan se bhi record clear karo
    const blacklistRef = doc(db, "blacklists", mobileNumber);
    deletePromises.push(deleteDoc(blacklistRef));

    // Saare delete operations ek sath fire karo
    await Promise.all(deletePromises);

    return NextResponse.json({ success: true, message: "Guest history completely wiped out." });

  } catch (error) {
    console.error("CRM Master Delete Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}