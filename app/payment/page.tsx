"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/atoms/GlassCard";
import { QrCode, Copy, CheckCircle2, Loader2, UploadCloud, Crown, Users, ArrowRight, CreditCard, ShieldCheck, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner"; 

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fName = searchParams.get("firstName") || "";
  const lName = searchParams.get("lastName") || "";
  const eId = searchParams.get("eventId") || "";
  const mob = searchParams.get("mobile") || ""; 
  const qEntryType = searchParams.get("entryType") || "Stag";
  const qIsUpgrade = searchParams.get("isUpgrade") === "true";
  const qPreviouslyPaid = Number(searchParams.get("amountPaid")) || 0;
  
  const pFName = searchParams.get("partnerFirstName") || "";
  const pLName = searchParams.get("partnerLastName") || "";
  const pMob = searchParams.get("partnerMobile") || "";

  const [guestId, setGuestId] = useState(searchParams.get("guestId") || "");
  const [baseAmount, setBaseAmount] = useState(0); 
  const [copied, setCopied] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [tableBooking, setTableBooking] = useState<any>(null);
  const [upiId, setUpiId] = useState("Loading...");
  const [qrCode, setQrCode] = useState("");
  const [eventPrices, setEventPrices] = useState({ stag: 0, couple: 0 });
  const [paymentMode, setPaymentMode] = useState("loading");

  useEffect(() => {
    const fetchGuestDetails = async () => {
      if (fName && lName) {
        try {
          const res = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}&eventId=${eId}`);
          const result = await res.json();
          if (result.success && result.data) {
            setBaseAmount(result.data.amount || 0);
            if (!guestId) setGuestId(result.data._id); 
          }
        } catch (e) { console.error("Fetch guest error", e); }
      }
    };

    const fetchSettings = async () => {
      try {
        // 🚀 THE FIX: Using API route to bypass Firebase permission issues for unauthenticated guests on mobile
        const res = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          // 🚀 TS ERROR FIX: Explicitly typing as 'any' to stop VS Code red squiggly lines
          const currentEvent: any = result.data.find((e: any) => e.eventId === eId);
          
          if (currentEvent) {
            setUpiId(currentEvent?.upiId || "No UPI Set");
            setQrCode(currentEvent?.qrCode || "");
            setEventPrices({ stag: Number(currentEvent?.stagPrice) || 0, couple: Number(currentEvent?.couplePrice) || 0 });
            setPaymentMode(currentEvent?.paymentMode || "manual"); 
            return;
          }
        }
        setPaymentMode("manual");
      } catch (e) {
        console.error("Fetch settings error:", e);
        setPaymentMode("manual");
      }
    };

    const savedTable = localStorage.getItem("pendingTable");
    if (savedTable) {
      try { setTableBooking(JSON.parse(savedTable)); } catch (error) { console.error(error); }
    }

    fetchGuestDetails();
    fetchSettings();

    if (!document.getElementById("razorpay-checkout-js")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [fName, lName, eId, guestId]); 

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
          setScreenshot(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  let targetAmount = baseAmount; 
  if (tableBooking) {
    targetAmount = tableBooking.finalAmount || Number(tableBooking.table.minSpend);
  } else {
    if (qEntryType === "Couple" && eventPrices.couple > 0) targetAmount = eventPrices.couple;
    else if (qEntryType === "Stag" && eventPrices.stag > 0) targetAmount = eventPrices.stag;
  }
  
  const finalAmountToPay = Math.max(0, targetAmount - qPreviouslyPaid);

  const handleManualSubmit = async () => {
    if (!screenshot && finalAmountToPay > 0) return alert("Please upload the payment screenshot!");
    setLoading(true);
    setPaymentError("");
    
    try {
      const payload = { 
        id: guestId, firstName: fName, lastName: lName, mobileNumber: mob, eventId: eId, entryType: qEntryType, isUpgrade: qIsUpgrade, 
        previousAmount: qPreviouslyPaid, amount: finalAmountToPay, screenshot, 
        tableId: tableBooking?.table?.id || null, isCaptain: !!tableBooking || qEntryType === "Group", 
        subOrdinates: tableBooking?.subOrdinates || [], 
        partnerDetails: pFName ? { firstName: pFName, lastName: pLName, phone: pMob } : null,
        preOrders: tableBooking?.cart || [] 
      };

      const res = await fetch("/api/guest/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (res.ok) {
        localStorage.removeItem("pendingTable"); router.push("/status"); 
      } else { alert("Upload Failed. Server error."); }
    } catch (error) { alert("Server Error."); } finally { setLoading(false); }
  };

  const handleRazorpayPayment = async () => {
    if (finalAmountToPay === 0) {
      handleManualSubmit();
      return;
    }

    setLoading(true);
    setPaymentError("");

    try {
      const resOrder = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eId, amount: finalAmountToPay })
      });
      const orderData = await resOrder.json();

      if (!orderData.success) {
        setPaymentError("Gateway Initialization Failed. Check Admin Keys.");
        setLoading(false);
        return;
      }

      const payload = { 
        id: guestId, firstName: fName, lastName: lName, mobileNumber: mob, eventId: eId, entryType: qEntryType, isUpgrade: qIsUpgrade, 
        previousAmount: qPreviouslyPaid, amount: finalAmountToPay, 
        tableId: tableBooking?.table?.id || null, isCaptain: !!tableBooking || qEntryType === "Group", 
        subOrdinates: tableBooking?.subOrdinates || [], 
        partnerDetails: pFName ? { firstName: pFName, lastName: pLName, phone: pMob } : null,
        preOrders: tableBooking?.cart || [] 
      };

      const options = {
        key: orderData.keyId,
        amount: Math.round(finalAmountToPay * 100),
        currency: "INR",
        name: "Event Reservation",
        description: tableBooking?.cart?.length > 0 ? `VIP Table & Add-ons` : `Pass: ${qEntryType}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          toast.loading("Verifying your payment...");
          
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payload: payload
            }),
          });
          
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            localStorage.removeItem("pendingTable"); 
            router.push(`/dashboard?firstName=${fName}&lastName=${lName}&eventId=${eId}`); 
          } else {
            setPaymentError("Payment verification failed! If money was deducted, please contact support.");
            setLoading(false);
          }
        },
        prefill: {
          name: `${fName} ${lName}`,
          contact: mob,
        },
        theme: {
          color: "#f59e0b", 
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setPaymentError("Payment cancelled or interrupted.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on("payment.failed", async function (response: any) {
        setLoading(true);
        try {
           await fetch("/api/razorpay/failed", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ payload })
           });
        } catch(e) {}
        
        setPaymentError(`${response.error.reason} - ${response.error.description}`);
        setLoading(false);
      });
      
      rzp.open();

    } catch (err) {
      setPaymentError("Error initializing secure connection.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-light mb-2">Complete Reservation</h1>
      </div>

      {qIsUpgrade && qPreviouslyPaid > 0 && paymentMode !== "loading" && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-left shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <h3 className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Pass Upgrade</h3>
          <p className="text-zinc-300 text-sm font-medium">Upgrading to {tableBooking ? `VIP Table (${tableBooking.table.tableName})` : qEntryType}</p>
          <p className="text-xs text-blue-300/70 mt-1">Previous payment of ₹{qPreviouslyPaid} has been adjusted from the total.</p>
        </div>
      )}

      {tableBooking && paymentMode !== "loading" && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-left shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <h3 className="text-amber-500 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Crown className="w-4 h-4"/> VIP Table: {tableBooking.table.tableName}</h3>
          <p className="text-zinc-300 text-sm mb-3 flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-zinc-400"/> You (Captain) + {tableBooking.subOrdinates.length} Pax</p>
          <div className="flex justify-between items-end border-t border-white/10 pt-3">
             <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-0.5">Table Minimum</p>
                <p className="text-white font-mono font-medium">₹{tableBooking.table.minSpend}</p>
             </div>
             <div className="bg-amber-500/10 rounded-lg p-1.5 px-3 border border-amber-500/20"><p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Entry Waived</p></div>
          </div>
        </div>
      )}

      {tableBooking?.cart && tableBooking.cart.length > 0 && paymentMode !== "loading" && (
        <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-left shadow-inner">
          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5 text-amber-500"/> Pre-Ordered Add-ons</h3>
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
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Add-on Total</span>
            <span className="text-white font-mono font-bold text-sm">₹{tableBooking.cartTotal}</span>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center mb-6 animate-in fade-in zoom-in">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest">Transaction Failed</h3>
          <p className="text-xs text-red-300 mt-1">{paymentError}</p>
          <p className="text-xs text-neutral-400 mt-2">Don't worry, your money is safe. Please click below to try again.</p>
        </div>
      )}

      {paymentMode === "loading" ? (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-6 text-center mb-6 flex justify-center items-center h-[90px]">
           <Loader2 className="w-6 h-6 animate-spin text-amber-500/50" />
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center mb-6 animate-in fade-in">
          <p className="text-amber-500/70 text-sm uppercase tracking-widest mb-1 font-bold">Total Due</p>
          <h2 className="text-4xl font-black text-white font-mono">₹{finalAmountToPay}</h2>
          {tableBooking?.cart && tableBooking.cartTotal > Number(tableBooking.table.minSpend) && (
            <p className="text-[10px] text-green-400 mt-2 font-bold uppercase tracking-widest">Includes Minimum Spend Overage</p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {paymentMode === "loading" ? (
          <div className="py-12 flex flex-col items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
            <p className="text-xs text-neutral-500 uppercase tracking-widest">Initializing Secure Gateway...</p>
          </div>
        ) : paymentMode === "manual" ? (
          <>
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
              {!screenshot && <span className="mt-2 text-xs text-zinc-500 uppercase tracking-widest font-bold">Upload Screenshot</span>}
            </label>

            <button onClick={handleManualSubmit} disabled={loading || (!screenshot && finalAmountToPay > 0)} className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex justify-center items-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Screenshot"}
            </button>
          </>
        ) : (
          <div className="pt-2 animate-in fade-in">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center mb-6">
              <ShieldCheck className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-blue-300 font-medium">Your payment is secured by Razorpay Gateway. Verification is instant.</p>
            </div>
            
            <button onClick={handleRazorpayPayment} disabled={loading} className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> {paymentError ? "Retry Payment" : "Pay Now Securely"}</>}
            </button>
          </div>
        )}
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