import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore/lite";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    // 🚀 FIX: Catch both id variations
    const targetId = body.id || body._id;

    if (!targetId) {
      return NextResponse.json({ success: false, error: "Guest ID missing" }, { status: 400 });
    }

    const guestRef = doc(db, "guests", targetId);
    const guestSnap = await getDoc(guestRef);

    if (!guestSnap.exists()) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }

    const guestData = guestSnap.data();
    const { isCaptain, tableId } = guestData;

    // 🚀 MASTER CLEANUP LOGIC: Agar yeh Captain hai
    if (isCaptain) {
      // A. Uski Table ko wapas "Available" karo
      if (tableId) {
        const tableRef = doc(db, "tables", tableId);
        await updateDoc(tableRef, {
          status: "Available",
          bookedBy: null
        });
      }

      // B. Uske saare doston (Sub-ordinates) ko dhoondo aur delete karo
      const guestsCol = collection(db, "guests");
      const q = query(guestsCol, where("hostId", "==", targetId));
      const subDocs = await getDocs(q);

      const deletePromises = subDocs.docs.map(subDoc => deleteDoc(doc(db, "guests", subDoc.id)));
      await Promise.all(deletePromises);
    }

    // Final Step: Us main guest ko delete karo
    await deleteDoc(guestRef);

    return NextResponse.json({ 
      success: true, 
      message: isCaptain ? "Captain, Table and all Sub-ordinates deleted!" : "Guest deleted successfully" 
    });

  } catch (error: any) {
    console.error("Delete Guest Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}