"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/atoms/GlassCard";
import { QrCode, Copy, CheckCircle2, Loader2, UploadCloud } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState("");
  const [amount, setAmount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic Settings State
  const [upiId, setUpiId] = useState("Loading...");
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    // URL se details aur eventId nikalna
    const params = new URLSearchParams(window.location.search);
    const fName = params.get("firstName");
    const lName = params.get("lastName");
    const eId = params.get("eventId"); // 🚀 THE MAGIC: Event ID captured

    // 1. Fetch Guest Details (with eventId for precision)
    const fetchGuestDetails = async () => {
      if (fName && lName) {
        try {
          const res = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}&eventId=${eId || ""}`, { cache: "no-store" });
          const result = await res.json();
          if (result.success && result.data) {
            setAmount(result.data.amount || 0);
            setGuestId(result.data._id); 
          }
        } catch (e) {
          console.error("Fetch guest error", e);
        }
      }
    };

    // 2. Fetch Admin Payment Settings (Specific to the Event)
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: "no-store" });
        const result = await res.json();
        
        // 🚀 THE MAGIC: Backend ab array return karta hai, toh hume specific event dhundhna hai
        if (result.success && Array.isArray(result.data)) {
          const currentEvent = result.data.find((e: any) => e.eventId === eId);
          
          if (currentEvent) {
            setUpiId(currentEvent.upiId || "No UPI Set");
            setQrCode(currentEvent.qrCode || "");
          } else if (result.data.length > 0) {
            // Agar somehow event nahi mila, toh fallback ke liye pehla wala dikha do
            setUpiId(result.data[0].upiId || "No UPI Set");
            setQrCode(result.data[0].qrCode || "");
          }
        }
      } catch (e) {
        console.error("Fetch settings error", e);
      }
    };

    fetchGuestDetails();
    fetchSettings();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🚀 HD IMAGE COMPRESSOR (Targeting ~300-500KB for High Clarity)
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
          
          // Max size 1600px ensures text and transaction details are crystal clear
          const MAX_SIZE = 1600;
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
          
          // 85% Quality JPEG gives excellent clarity under Firebase 1MB limit
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          setScreenshot(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!screenshot) return alert("Bhai screenshot upload karo!");
    setLoading(true);
    try {
      const res = await fetch("/api/guest/payment", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id: guestId, screenshot }),
      });
      if (res.ok) {
        router.push("/status"); 
      } else {
        alert("Upload Failed. Firebase limitation error.");
      }
    } catch (error) {
      alert("Server Error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-light mb-2">Complete Payment</h1>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 text-center mb-6">
          <p className="text-neutral-400 text-sm uppercase tracking-widest mb-1">Amount to Pay</p>
          <h2 className="text-4xl font-bold text-white font-mono">₹{amount}</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-2 rounded-xl w-48 h-48 mx-auto flex items-center justify-center overflow-hidden">
             {qrCode ? (
               <img src={qrCode} alt="Payment QR" className="w-full h-full object-contain rounded-lg" />
             ) : (
               <div className="text-neutral-400 text-sm text-center">QR Code<br/>Not Configured</div>
             )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between font-mono">
            <span>{upiId}</span>
            <button onClick={copyToClipboard} className="text-purple-400">
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 overflow-hidden relative">
            {screenshot ? <img src={screenshot} className="absolute inset-0 w-full h-full object-cover opacity-50" /> : <UploadCloud className="w-8 h-8 text-neutral-400" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          <button onClick={handleSubmit} disabled={loading || !screenshot} className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium hover:bg-neutral-200">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit for Verification"}
          </button>
        </div>
      </GlassCard>
    </main>
  );
}