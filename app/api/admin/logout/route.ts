import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  // Cookie delete karne ke liye bas use "expire" kar do
  cookieStore.set("admin_token", "", { maxAge: 0 });
  
  return NextResponse.json({ success: true });
}