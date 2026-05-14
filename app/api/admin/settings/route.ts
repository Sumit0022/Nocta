import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore/lite";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 🚀 THE UPGRADE: Ab hum single doc nahi, poori 'events' collection uthayenge
    const querySnapshot = await getDocs(collection(db, "events"));
    
    const events = querySnapshot.docs.map(doc => ({
      eventId: doc.id, // Yeh uska 4-digit code hoga
      ...doc.data()
    }));

    // 🚀 THE MASTER FIX: Universal Public Headers & Strict Anti-Cache
    const publicHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    // Agar events hain, toh saare bhej do. Agar nahi hain, toh empty array bhejo.
    if (events.length > 0) {
      return NextResponse.json({ success: true, data: events }, { headers: publicHeaders });
    }
    return NextResponse.json({ success: true, data: [] }, { headers: publicHeaders });
    
  } catch (error) {
    console.error("Fetch failed", error);
    return NextResponse.json({ success: false, error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 THE MAGIC: Agar eventId pehle se nahi hai, toh naya 4-digit code banao
    const eventId = body.eventId || Math.floor(1000 + Math.random() * 9000).toString();
    
    // 'events' collection mein us 4-digit code ke naam se document save karo
    const docRef = doc(db, "events", eventId);
    
    // Data ke sath eventId aur creation date bhi add kar rahe hain
    await setDoc(docRef, { 
      ...body, 
      eventId: eventId,
      updatedAt: new Date().toISOString() 
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Event saved successfully", 
      eventId: eventId 
    });
  } catch (error) {
    console.error("Save failed", error);
    return NextResponse.json({ success: false, error: "Save failed" }, { status: 500 });
  }
}