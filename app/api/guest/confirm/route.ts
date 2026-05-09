import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Guest from "@/models/Guest";

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    await connectDB();

    // Regex laga diya taaki capital/small letter ki tension hi khatam ho jaye
    const updatedGuest = await Guest.findOneAndUpdate(
      { 
        firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
        lastName: { $regex: new RegExp(`^${lastName}$`, "i") }
      },
      { rsvpStatus: "Confirmed" },
      { new: true } 
    );

    return NextResponse.json({ success: true, data: updatedGuest });

  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ success: false, error: "Status update nahi ho paya" }, { status: 500 });
  }
}