import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const { eventId, amount } = await req.json();

    if (!eventId || !amount) {
      return NextResponse.json({ success: false, error: "Missing eventId or amount" }, { status: 400 });
    }

    // 🚀 Fetch Razorpay Keys automatically from Admin Settings
    const eventDoc = await getDoc(doc(db, "events", eventId));
    if (!eventDoc.exists()) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const eventData = eventDoc.data();
    if (eventData.paymentMode !== "razorpay" || !eventData.razorpayKey || !eventData.razorpaySecret) {
      return NextResponse.json({ success: false, error: "Razorpay not configured properly by Admin." }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: eventData.razorpayKey,
      key_secret: eventData.razorpaySecret,
    });

    const options = {
      amount: Math.round(Number(amount) * 100), // Razorpay takes amount in paise (₹1 = 100 paise)
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      keyId: eventData.razorpayKey 
    });

  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ success: false, error: "Could not create payment order" }, { status: 500 });
  }
}