import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Firebase se settings uthao
    const docRef = doc(db, "system", "settings");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return NextResponse.json({ success: true, data: docSnap.data() });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Admin panel se aayi hui nayi settings Firebase mein save karo
    const docRef = doc(db, "system", "settings");
    await setDoc(docRef, body);
    
    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Save failed" }, { status: 500 });
  }
}