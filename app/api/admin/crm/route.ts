import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore/lite";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const guestsSnapshot = await getDocs(collection(db, "guests"));
    const blacklistSnapshot = await getDocs(collection(db, "blacklists"));

    // 1. Get all blacklisted numbers
    const blacklistedNumbers = new Set();
    blacklistSnapshot.forEach(doc => {
      blacklistedNumbers.add(doc.id); // Firebase doc ID will be the mobile number
    });

    const crmMap = new Map();

    // 2. Group guests by Mobile Number
    guestsSnapshot.forEach((doc) => {
      const data = doc.data();
      const phone = data.mobileNumber;
      
      if (!phone) return; // Skip invalid records

      if (!crmMap.has(phone)) {
        crmMap.set(phone, {
          mobileNumber: phone,
          firstName: data.firstName,
          lastName: data.lastName,
          totalSpent: 0,
          eventsAttended: [],
          isBlacklisted: blacklistedNumbers.has(phone)
        });
      }

      const guestRecord = crmMap.get(phone);

      // Aggregate revenue for Confirmed/Checked-In guests
      if (data.rsvpStatus === "Confirmed" || data.rsvpStatus === "Checked-In") {
        guestRecord.totalSpent += Number(data.amount || 0);
      }
      
      // Store event history
      guestRecord.eventsAttended.push({
        eventId: data.eventId,
        status: data.rsvpStatus,
        isCaptain: data.isCaptain || false,
        isSubordinate: data.isSubordinate || false
      });
    });

    return NextResponse.json({ 
      success: true, 
      data: Array.from(crmMap.values()) 
    });

  } catch (error) {
    console.error("CRM API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch CRM data" }, { status: 500 });
  }
}