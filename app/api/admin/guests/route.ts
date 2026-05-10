import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore/lite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 🚀 THE UPGRADE: URL se 'eventId' pakadna
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId"); 

    let guestsQuery = collection(db, "guests");

    // Agar Admin ne specifically kisi ek party (e.g., 8492) ke guests maange hain
    if (eventId) {
       guestsQuery = query(collection(db, "guests"), where("eventId", "==", eventId)) as any;
    }

    // Data Fetch karo (Ya toh saare guests, ya sirf specific party ke)
    const querySnapshot = await getDocs(guestsQuery);
    
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