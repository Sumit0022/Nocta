"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/atoms/GlassCard";
import { QrCode, Copy, CheckCircle2, Loader2, UploadCloud, Crown, Users, ArrowRight, CreditCard, ShieldCheck, AlertCircle, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "sonner"; 

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore/lite";

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fName = searchParams.get("firstName") || "";
  const lName = searchParams.get("lastName") || "";
  const eId = (searchParams.get("eventId") || "").trim();
  const mob = searchParams.get("mobile") || ""; 
  const qEntryType = searchParams.get("entryType") || "Stag";
  const qIsUpgrade = searchParams.get("isUpgrade") === "true";
  const qPreviouslyPaid = Number(searchParams.get("amountPaid")) || 0;
  
  const pFName = searchParams.get("partnerFirstName") || "";
  const pLName = searchParams.get("partnerLastName") || "";
  const pMob = searchParams.get("partnerMobile") || "";

  const [guestId, setGuestId] = useState(searchParams.get("guestId") || "");
  const [baseAmount, setBaseAmount] = useState(0); 
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentError, setPaymentError] = useState("");

  const [tableBooking, setTableBooking] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eId) {
      setPaymentError("Missing Event ID. Please restart registration.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const docRef = doc(db, "events", eId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventData(data);
          setPaymentMode(data.paymentMode || "manual");
        } else {
          setPaymentMode("manual");
        }

        if (fName && lName) {
          const res = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}&eventId=${eId}`);
          const result = await res.json();
          if (result.success && result.data) {
            setBaseAmount(result.data.amount || 0);
            if (!guestId) setGuestId(result.data._id); 
          }
        }

        const savedTable = localStorage.getItem("pendingTable");
        if (savedTable) {
          setTableBooking(JSON.parse(savedTable));
        }

      } catch (e) {
        console.error("Payment sync error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    if (!document.getElementById("razorpay-checkout-js")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [eId, fName, lName, guestId]);

  const finalAmountToPay = useMemo(() => {
    let target = 0;
    if (tableBooking) {
      target = tableBooking.finalAmount || Number(tableBooking.table.minSpend);
    } else if (eventData) {
      if (qEntryType === "Couple") target = Number(eventData.couplePrice) || 0;
      else if (qEntryType === "Stag") target = Number(eventData.stagPrice) || 0;
    } else {
      target = baseAmount;
    }
    return Math.max(0, target - qPreviouslyPaid);
  }, [tableBooking, eventData, baseAmount, qPreviouslyPaid, qEntryType]);

  const copyToClipboard = () => {
    if (eventData?.upiId) {
      navigator.clipboard.writeText(eventData.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 🚀 THE ULTIMATE FIX FOR UPGRADE: Forcing the partner into subOrdinates so the backend accepts it!
  const getProcessedPayload = () => {
    let finalSubOrdinates = tableBooking?.subOrdinates || [];
    // If it's a couple upgrade and no table is selected, inject the partner here
    if (qEntryType === "Couple" && !tableBooking && pFName) {
      finalSubOrdinates = [{ firstName: pFName, lastName: pLName, phone: pMob }];
    }
    const isCaptainFinal = !!tableBooking || qEntryType === "Group" || (qEntryType === "Couple" && finalSubOrdinates.length > 0);

    return { 
      id: guestId, firstName: fName, lastName: lName, mobileNumber: mob, eventId: eId, entryType: qEntryType, 
      isUpgrade: qIsUpgrade, previousAmount: qPreviouslyPaid, amount: finalAmountToPay, screenshot, 
      tableId: tableBooking?.table?.id || null, 
      isCaptain: isCaptainFinal, 
      subOrdinates: finalSubOrdinates, 
      partnerDetails: pFName ? { firstName: pFName, lastName: pLName, phone: pMob } : null,
      preOrders: tableBooking?.cart || [] 
    };
  };

  const handleManualSubmit = async () => {
    if (!screenshot && finalAmountToPay > 0) return toast.error("Please upload payment screenshot!");
    setLoading(true);
    try {
      const payload = getProcessedPayload();
      const res = await fetch("/api/guest/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { localStorage.removeItem("pendingTable"); router.push("/status"); }
    } catch (error) { toast.error("Submission failed!"); } finally { setLoading(false); }
  };

  const handleRazorpayPayment = async () => {
    if (finalAmountToPay === 0) return handleManualSubmit();
    setLoading(true);
    try {
      const resOrder = await fetch("/api/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eId, amount: finalAmountToPay }) });
      const orderData = await resOrder.json();
      if (!orderData.success) { setPaymentError("Gateway Error. Check Keys."); setLoading(false); return; }

      const payload = getProcessedPayload();

      const options = {
        key: orderData.keyId,
        amount: Math.round(finalAmountToPay * 100),
        currency: "INR",
        name: "Event Reservation",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, payload: payload }) });
          const verifyData = await verifyRes.json();
          if (verifyData.success) { localStorage.removeItem("pendingTable"); router.push(`/dashboard?firstName=${fName}&lastName=${lName}&eventId=${eId}`); }
        },
        prefill: { name: `${fName} ${lName}`, contact: mob },
        theme: { color: "#f59e0b" },
        modal: { ondismiss: () => setLoading(false) }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) { setPaymentError("Razorpay error."); setLoading(false); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505]"><Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" /><p className="text-zinc-500 animate-pulse uppercase tracking-widest text-xs">Syncing Payment Data...</p></div>;

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><ShoppingCart className="w-8 h-8" /></div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight">Checkout</h1>
      </div>

      {qIsUpgrade && qPreviouslyPaid > 0 && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-left shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5"/> Pass Upgrade</h3>
          <p className="text-zinc-300 text-sm font-medium">Upgrading to {tableBooking ? `VIP Table (${tableBooking.table.tableName})` : qEntryType}</p>
          <p className="text-[11px] text-blue-300/70 mt-1">₹{qPreviouslyPaid} from your previous payment has been adjusted.</p>
        </div>
      )}

      {tableBooking && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-left">
          <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Crown className="w-4 h-4"/> VIP Table: {tableBooking.table.tableName}</h3>
          <p className="text-zinc-300 text-sm mb-3 flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-zinc-400"/> Captain + {tableBooking.subOrdinates.length} Pax</p>
          <div className="flex justify-between items-end border-t border-white/10 pt-3">
             <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-0.5">Min Spend</p>
                <p className="text-white font-mono font-medium">₹{tableBooking.table.minSpend}</p>
             </div>
             <div className="bg-amber-500/10 rounded-lg p-1.5 px-3 border border-amber-500/20"><p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Entry Waived</p></div>
          </div>
        </div>
      )}

      {tableBooking?.cart && tableBooking.cart.length > 0 && (
        <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left shadow-inner">
          <h3 className="text-white text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-zinc-400"><ShoppingCart className="w-3.5 h-3.5 text-amber-500"/> Pre-Ordered Add-ons</h3>
          <div className="space-y-2">
            {tableBooking.cart.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-mono text-xs">{item.quantity}x</span>
                    <span className="text-neutral-300">{item.name}</span>
                 </div>
                 <span className="text-amber-400 font-mono text-xs">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center mb-6">
        <p className="text-amber-500/70 text-xs uppercase tracking-widest mb-1 font-bold">Balance Payable</p>
        <h2 className="text-5xl font-black text-white font-mono">₹{finalAmountToPay}</h2>
        {tableBooking?.cart && tableBooking.cartTotal > Number(tableBooking.table.minSpend) && (
          <p className="text-[10px] text-green-400 mt-2 font-bold uppercase tracking-widest">Includes Minimum Spend Overage</p>
        )}
      </div>

      {paymentMode === "manual" ? (
        <div className="space-y-5">
          <div className="bg-white p-2 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            {eventData?.qrCode ? <img src={eventData.qrCode} className="w-full h-full object-contain" /> : <p className="text-black text-xs text-center font-bold">QR NOT<br/>CONFIGURED</p>}
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-300">{eventData?.upiId || 'No UPI ID Set'}</span>
            <button onClick={copyToClipboard} className="text-amber-500 hover:text-amber-400 transition-colors">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/5 relative overflow-hidden transition-all group">
             {screenshot ? (
               <div className="absolute inset-0 w-full h-full bg-black/60 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-xs font-bold uppercase">Change Image</p></div>
             ) : null}
             {screenshot ? <img src={screenshot} className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <UploadCloud className="text-neutral-500 w-8 h-8" />}
             <span className="text-[10px] uppercase font-bold text-zinc-500 mt-2">{screenshot ? "Screenshot Uploaded" : "Upload Payment Proof"}</span>
             <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setScreenshot(reader.result as string);
                  reader.readAsDataURL(file);
                }
             }} />
          </label>
          <button onClick={handleManualSubmit} disabled={!screenshot && finalAmountToPay > 0} className="w-full bg-amber-500 text-black py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50">Submit for Verification</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center">
            <ShieldCheck className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-[11px] text-blue-300 font-medium">Secure Razorpay Gateway Active. Verification is instant.</p>
          </div>
          <button onClick={handleRazorpayPayment} className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
             <CreditCard className="w-5 h-5" /> Pay ₹{finalAmountToPay} Now
          </button>
        </div>
      )}
      
      {paymentError && <p className="mt-4 text-red-400 text-[10px] text-center font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">{paymentError}</p>}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 relative text-white bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="animate-spin text-amber-500 w-10 h-10" /></div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}