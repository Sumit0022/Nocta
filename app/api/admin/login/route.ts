import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    // 🛡️ MASTER BYPASS (Ye wapas daal diya hai)
    const isMasterLogin = (username === "admin" && password === "sumit@123");
    const isEnvLogin = (username === adminUser && password === adminPass);

    if (isEnvLogin || isMasterLogin) {
      const cookieStore = await cookies();
      
      cookieStore.set("admin_token", "authenticated_true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid Credentials!" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}