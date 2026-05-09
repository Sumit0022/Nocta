import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore/lite";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Firebase se saare guests utha rahe hain
    const querySnapshot = await getDocs(collection(db, "guests"));
    
    const guests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, guests: guests });
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch guests" }, { status: 500 });
  }
}