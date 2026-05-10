import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore/lite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firstName = searchParams.get("firstName");
    const lastName = searchParams.get("lastName");
    const eventId = searchParams.get("eventId"); // 🚀 THE UPGRADE: Event ID captured

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, message: "Name missing" }, { status: 400 });
    }

    // 1. URL se aaye hue naam ko clean aur lowercase karo
    const searchFirst = firstName.trim().toLowerCase();
    const searchLast = lastName.trim().toLowerCase();

    // 🚀 THE MAGIC: Event ID ke hisaab se filter karo taaki specific party ka hi data aaye
    let guestsQuery = collection(db, "guests");
    if (eventId) {
      guestsQuery = query(collection(db, "guests"), where("eventId", "==", eventId)) as any;
    }

    // 2. Firebase se specific event ke guests uthao aur case-insensitive match karo
    const querySnapshot = await getDocs(guestsQuery);
    let matchedDoc = null;

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const dbFirst = (data.firstName || "").trim().toLowerCase();
      const dbLast = (data.lastName || "").trim().toLowerCase();

      // Naam aur Last Name dono match hone chahiye
      if (dbFirst === searchFirst && dbLast === searchLast) {
        matchedDoc = doc;
        break;
      }
    }

    if (!matchedDoc) {
      return NextResponse.json({ success: false, message: "Guest not found in this Event" }, { status: 404 });
    }

    // Guest mil gaya! Entry code ke saath bhej do
    const guestData = { id: matchedDoc.id, _id: matchedDoc.id, ...matchedDoc.data() };
    
    return NextResponse.json({ success: true, data: guestData, guest: guestData });
  } catch (error) {
    console.error("Details Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}