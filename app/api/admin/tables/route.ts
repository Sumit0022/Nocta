import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, tableName, capacity, minSpend, layoutType } = body;

    if (!eventId || !tableName) {
      return NextResponse.json({ success: false, message: "Event ID aur Table Name zaroori hai" }, { status: 400 });
    }

    const newTable = {
      eventId,
      tableName: tableName.trim(), // e.g., "VIP-1"
      capacity: Number(capacity) || 4,
      minSpend: Number(minSpend) || 0, // e.g., 2000
      layoutType: layoutType || "default", // Default ya Custom layout tag
      status: "Available", // Jab guest book karega toh yeh "Booked" ho jayega
      bookedBy: null, // Guest ki ID yahan aayegi booking ke baad
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "tables"), newTable);
    
    return NextResponse.json({ success: true, id: docRef.id, message: "Table Added Successfully" });
  } catch (error) {
    console.error("Add Table Error:", error);
    return NextResponse.json({ success: false, error: "Failed to add table" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    let tablesQuery = collection(db, "tables");
    
    // Agar frontend ne eventId bheja hai, toh sirf usi event ki tables lao
    if (eventId) {
      tablesQuery = query(collection(db, "tables"), where("eventId", "==", eventId)) as any;
    }

    const snapshot = await getDocs(tablesQuery);
    const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error("Fetch Tables Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tables" }, { status: 500 });
  }
}