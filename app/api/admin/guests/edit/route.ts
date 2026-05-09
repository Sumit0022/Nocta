import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore/lite";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // Frontend id bhejta hai ya _id, dono handle kar lete hain
    const docId = body.id || body._id; 

    if (!docId) {
      return NextResponse.json({ success: false, error: "Guest ID missing" }, { status: 400 });
    }

    // Document reference banao
    const guestRef = doc(db, "guests", docId);
    
    // ID ko nikal kar baaki sara data Firebase mein update kar do
    const { id, _id, ...updateData } = body;

    await updateDoc(guestRef, updateData);

    return NextResponse.json({ success: true, message: "Guest details updated" });
  } catch (error) {
    console.error("Edit Guest Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update guest" }, { status: 500 });
  }
}