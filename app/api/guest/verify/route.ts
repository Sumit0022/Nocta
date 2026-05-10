import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    // 🚀 THE UPGRADE: Frontend se ab eventId bhi aayega
    const { firstName, lastName, eventId } = await req.json();

    // 1. User ki input ko clean karo (spaces hatao aur chote letters mein badlo)
    const searchFirst = firstName.trim().toLowerCase();
    const searchLast = lastName.trim().toLowerCase();

    // 🚀 THE MAGIC: Agar eventId hai, toh sirf usi party ke guests uthao (Database Optimization)
    let guestsQuery = collection(db, "guests");
    if (eventId) {
      guestsQuery = query(collection(db, "guests"), where("eventId", "==", eventId)) as any;
    }

    const querySnapshot = await getDocs(guestsQuery);

    let matchedDoc = null;

    // 2. Database ke data ko bhi clean karke match karo (No more case-sensitive errors!)
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const dbFirst = (data.firstName || "").trim().toLowerCase();
      const dbLast = (data.lastName || "").trim().toLowerCase();

      // Naam aur Last Name dono match hone chahiye usi event list mein
      if (dbFirst === searchFirst && dbLast === searchLast) {
        matchedDoc = doc;
        break;
      }
    }

    if (!matchedDoc) {
      // Error ke time bhi thoda delay taaki jhatka na lage
      await new Promise((resolve) => setTimeout(resolve, 600));
      return NextResponse.json({ success: false, message: "Guest not found in this Event's VIP list" }, { status: 404 });
    }

    // 3. THE ANIMATION FIX 🎬: 0.8 second ka artificial delay taaki tera smooth animation play ho sake
    await new Promise((resolve) => setTimeout(resolve, 800));

    const guestData = { id: matchedDoc.id, _id: matchedDoc.id, ...matchedDoc.data() };
    
    return NextResponse.json({ success: true, data: guestData, guest: guestData });

  } catch (error) {
    console.error("Firebase Verify Error:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}