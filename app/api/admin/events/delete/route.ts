import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore/lite";

export async function DELETE(req: Request) {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID missing" }, { status: 400 });
    }

    // 1. Find the exact document in 'events' collection by its internal string eventId field
    const eventsCol = collection(db, "events");
    const q = query(eventsCol, where("eventId", "==", eventId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ success: false, error: "Event not found in database" }, { status: 404 });
    }

    const docId = querySnapshot.docs[0].id;
    
    // 2. Delete it!
    await deleteDoc(doc(db, "events", docId));

    return NextResponse.json({ success: true, message: "Event deleted successfully." });
  } catch (error: any) {
    console.error("Delete Event Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}