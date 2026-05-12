"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/atoms/GlassCard";
import { QrCode, Copy, CheckCircle2, Loader2, UploadCloud, Crown, Users, ArrowRight } from "lucide-react";

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [guestId, setGuestId] = useState("");
  const [baseAmount, setBaseAmount] = useState(0); 
  const [copied, setCopied] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [tableBooking, setTableBooking] = useState<any>(null);
  const [upiId, setUpiId] = useState("Loading...");
  const [qrCode, setQrCode] = useState("");
  const [eventId, setEventId] = useState("");

  const [entryType, setEntryType] = useState("Stag");
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [previouslyPaid, setPreviouslyPaid] = useState(0);
  const [eventPrices, setEventPrices] = useState({ stag: 0, couple: 0 });
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [partnerData, setPartnerData] = useState<any>(null);

  useEffect(() => {
    const fName = searchParams.get("firstName") || "";
    const lName = searchParams.get("lastName") || "";
    const eId = searchParams.get("eventId") || "";
    const mob = searchParams.get("mobile") || ""; 
    
    if(eId) setEventId(eId);
    setFirstName(fName);
    setLastName(lName);
    setMobileNumber(mob);

    setEntryType(searchParams.get("entryType") || "Stag");
    setIsUpgrade(searchParams.get("isUpgrade") === "true");
    setPreviouslyPaid(Number(searchParams.get("amountPaid")) || 0);

    if (searchParams.get("partnerFirstName")) {
      setPartnerData({
        firstName: searchParams.get("partnerFirstName"),
        lastName: searchParams.get("partnerLastName"),
        phone: searchParams.get("partnerMobile")
      });
    }

    const fetchGuestDetails = async () => {
      if (fName && lName) {
        try {
          const res = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}&eventId=${eId || ""}`);
          const result = await res.json();
          if (result.success && result.data) {
            setBaseAmount(result.data.amount || 0);
            setGuestId(result.data._id); 
          }
        } catch (e) { console.error("Fetch guest error", e); }
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const currentEvent = result.data.find((e: any) => e.eventId === eId);
          if (currentEvent) {
            setUpiId(currentEvent.upiId || "No UPI Set");
            setQrCode(currentEvent.qrCode || "");
            setEventPrices({ stag: Number(currentEvent.stagPrice) || 0, couple: Number(currentEvent.couplePrice) || 0 });
          }
        }
      } catch (e) {}
    };

    const savedTable = localStorage.getItem("pendingTable");
    if (savedTable) {
      try { setTableBooking(JSON.parse(savedTable)); } catch (error) { console.error(error); }
    }

    fetchGuestDetails();
    fetchSettings();
  }, [searchParams]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          // 🚀 LOWERED MAX_SIZE to 800 to prevent Firebase 1MB Limit Crash on Upgrade
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          // 🚀 LOWERED QUALITY TO 0.6 FOR MAXIMUM COMPRESSION
          setScreenshot(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // 🚀 MATH ENGINE
  let targetAmount = baseAmount; 
  if (tableBooking) {
    targetAmount = Number(tableBooking.table.minSpend);
  } else {
    if (entryType === "Couple" && eventPrices.couple > 0) targetAmount = eventPrices.couple;
    else if (entryType === "Stag" && eventPrices.stag > 0) targetAmount = eventPrices.stag;
  }
  
  const finalAmountToPay = Math.max(0, targetAmount - previouslyPaid);

  const handleSubmit = async () => {
    if (!screenshot && finalAmountToPay > 0) return alert("Please upload the payment screenshot!");
    setLoading(true);
    
    try {
      const payload = { 
        id: guestId, firstName, lastName, mobileNumber, eventId, entryType, isUpgrade, 
        previousAmount: previouslyPaid, amount: finalAmountToPay, screenshot, 
        tableId: tableBooking?.table?.id || null, isCaptain: !!tableBooking || entryType === "Group", 
        subOrdinates: tableBooking?.subOrdinates || [], partnerDetails: partnerData
      };

      const res = await fetch("/api/guest/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (res.ok) {
        localStorage.removeItem("pendingTable"); router.push("/status"); 
      } else { alert("Upload Failed. Server error."); }
    } catch (error) { alert("Server Error."); } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-light mb-2">Complete Reservation</h1>
      </div>

      {isUpgrade && previouslyPaid > 0 && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-left shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <h3 className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Pass Upgrade</h3>
          <p className="text-zinc-300 text-sm font-medium">Upgrading to {tableBooking ? `VIP Table (${tableBooking.table.tableName})` : entryType}</p>
          <p className="text-xs text-blue-300/70 mt-1">Previous payment of ₹{previouslyPaid} has been adjusted from the total.</p>
        </div>
      )}

      {tableBooking && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-left shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <h3 className="text-amber-500 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Crown className="w-4 h-4"/> VIP Table: {tableBooking.table.tableName}</h3>
          <p className="text-zinc-300 text-sm mb-3 flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-zinc-400"/> You (Captain) + {tableBooking.subOrdinates.length} Pax</p>
          <div className="bg-amber-500/10 rounded-lg p-2 px-3 border border-amber-500/20 inline-block"><p className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold">General Entry Waived</p></div>
          <p className="text-xs text-zinc-500 mt-2">Paying only table minimum spend.</p>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center mb-6">
        <p className="text-amber-500/70 text-sm uppercase tracking-widest mb-1">Balance to Pay</p>
        <h2 className="text-4xl font-bold text-white font-mono">₹{finalAmountToPay}</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-2 rounded-xl w-48 h-48 mx-auto flex items-center justify-center overflow-hidden">
           {qrCode ? <img src={qrCode} alt="Payment QR" className="w-full h-full object-contain rounded-lg" /> : <div className="text-neutral-400 text-sm text-center">QR Code<br/>Not Configured</div>}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between font-mono text-sm">
          <span>{upiId}</span>
          <button onClick={copyToClipboard} className="text-amber-500">{copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}</button>
        </div>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 overflow-hidden relative transition-colors">
          {screenshot ? <img src={screenshot} className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <UploadCloud className="w-8 h-8 text-neutral-400" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {!screenshot && <span className="mt-2 text-xs text-zinc-500 uppercase tracking-widest">Upload Screenshot</span>}
        </label>

        <button onClick={handleSubmit} disabled={loading || (!screenshot && finalAmountToPay > 0)} className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex justify-center items-center">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Reservation"}
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 relative text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-amber-500"/></div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}