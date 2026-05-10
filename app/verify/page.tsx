"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { ArrowRight, Loader2, KeyRound, CheckCircle2, Ticket } from "lucide-react";

// 🚀 FIREBASE IMPORTS
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function VerifyPage() {
  const router = useRouter();

  // --- NEW MULTI-EVENT STATES ---
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);

  // --- EXISTING STATES ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  
  // Firebase ka confirmation object save karne ke liye state
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // 🚀 FETCH ACTIVE EVENTS ON LOAD
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setAllEvents(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      setError("Please select an event first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 🚀 FRONTEND TO BACKEND: EventId bhi bhej rahe hain verify karne ke liye
      const res = await fetch("/api/guest/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, eventId: selectedEventId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Kuch gadbad ho gayi.");
      } else {
        console.log("Guest Data Received:", data);
        setSuccessData(data); 
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ RECAPTCHA SETUP FUNCTION
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', 
        'callback': (response: any) => {
          // reCAPTCHA solved
        }
      });
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      let phone = successData?.data?.mobileNumber || successData?.guest?.mobileNumber;

      if (!phone) {
        setError("Database mein apka phone number nahi mila.");
        setLoading(false);
        return;
      }

      if (!phone.toString().startsWith("+")) {
        phone = "+91" + phone;
      }

      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;

      // 🚀 ASLI FIREBASE OTP SEND
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      
      setConfirmationResult(result); 
      setOtpSent(true);

    } catch (err: any) {
      console.error("OTP Error:", err);
      setError("OTP bhejne mein error aayi. Please refresh & try again.");
      
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOtpError("");

    try {
      await confirmationResult.confirm(otpInput);

      const currentStatus = successData?.rsvpStatus || successData?.data?.rsvpStatus;
      console.log("Verifying Routing for Status:", currentStatus);

      // 🚀 SMART ROUTING: URL mein eventId chipka diya taaki next page ko pata chale
      if (currentStatus === "Confirmed") {
        router.push(`/dashboard?firstName=${firstName}&lastName=${lastName}&eventId=${selectedEventId}`); 
      } 
      else if (currentStatus === "Need Verification") {
        router.push('/status');
      } 
      else {
        router.push(`/payment?firstName=${firstName}&lastName=${lastName}&eventId=${selectedEventId}`); 
      }
    } catch (error) {
      console.error("Verification failed", error);
      setOtpError("Galat OTP! Kripya sahi code dalein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

      {/* ⚠️ YE ZAROORI HAI: Invisible reCAPTCHA ke liye container */}
      <div id="recaptcha-container"></div>

      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light mb-2">Guest Verification</h1>
          <p className="text-neutral-400 text-sm">Select your event and enter details</p>
        </div>

        {!successData ? (
          <form onSubmit={handleVerify} className="space-y-4">
            
            {/* 🚀 NEW: EVENT SELECTOR */}
            <div className="relative">
              {eventsLoading ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                </div>
              ) : (
                <div className="relative flex items-center">
                  <Ticket className="absolute left-4 w-5 h-5 text-amber-500" />
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value);
                      setError(""); // Naya event chunte hi error hata do
                    }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-12 pr-4 py-4 text-white outline-none focus:border-amber-500/50 appearance-none font-medium transition-all"
                    required
                  >
                    <option value="" disabled>Select The Event You're Attending</option>
                    {allEvents.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.mainTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 🚀 ANIMATED HIDDEN FIELDS: Jab event select hoga tabhi dikhenge */}
            <AnimatePresence>
              {selectedEventId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden pt-2"
                >
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-white/30 transition-all" placeholder="First Name" />
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-white/30 transition-all" placeholder="Last Name" />
                  
                  {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-white text-neutral-950 py-4 rounded-xl font-bold flex justify-center items-center hover:bg-neutral-200 active:scale-95 transition-all mt-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        ) : !otpSent ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-10 h-10"/>
            </div>
            <h2 className="text-2xl font-medium">Welcome, {firstName}!</h2>
            <p className="text-neutral-400 text-sm">We found your RSVP record.</p>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-white text-neutral-950 py-4 rounded-xl font-bold flex justify-center items-center hover:bg-neutral-200 active:scale-95 transition-all">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP to Mobile"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <KeyRound className="w-10 h-10"/>
            </div>
            <h2 className="text-xl font-medium mb-4">Enter OTP</h2>
            <input type="text" required maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] text-white outline-none font-mono focus:border-blue-500/50 transition-all" placeholder="••••••" />
            {otpError && <p className="text-red-400 text-sm text-center font-medium mt-2">{otpError}</p>}
            
            <button type="submit" disabled={loading} className="w-full bg-white text-neutral-950 py-4 rounded-xl font-bold flex justify-center items-center hover:bg-neutral-200 active:scale-95 transition-all mt-6">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
            </button>
          </form>
        )}
      </GlassCard>
    </main>
  );
}