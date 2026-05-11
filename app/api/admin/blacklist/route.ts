import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const { mobileNumber, action, reason } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json({ success: false, error: "Mobile number is required" }, { status: 400 });
    }

    const blacklistRef = doc(db, "blacklists", mobileNumber);

    if (action === "add") {
      await setDoc(blacklistRef, { 
        mobileNumber, 
        reason: reason || "Violation of terms",
        addedAt: new Date().toISOString() 
      });
      return NextResponse.json({ success: true, message: "Guest has been blacklisted 🚫" });
    } 
    
    else if (action === "remove") {
      await deleteDoc(blacklistRef);
      return NextResponse.json({ success: true, message: "Guest removed from blacklist ✅" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Blacklist API Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}