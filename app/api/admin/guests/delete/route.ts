import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Guest from "@/models/Guest";

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await connectDB();

    // Guest ko database se permanently uda do
    await Guest.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Guest deleted permanently" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ success: false, error: "Delete nahi ho paya" }, { status: 500 });
  }
}