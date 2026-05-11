"use client";

import { useState, useEffect, useMemo } from "react"; // 🚀 FIXED: useMemo import kiya sorting ke liye
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { ArrowRight, Loader2, KeyRound, CheckCircle2, Ticket, ChevronDown } from "lucide-react";

// 🚀 FIREBASE IMPORTS
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// 🚀 PHASE 1: EVENT LIFECYCLE LOGIC (Ultra-safe date parsing)
const getEventStatus = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return "Active"; 
  const eventDateTime = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(eventDateTime.getTime())) return "Active"; 
  const lockTime = new Date(eventDateTime.getTime() + 18 * 60 * 60 * 1000);
  return new Date() > lockTime ? "Completed" : "Active";
};

const getSafeTime = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return 0;
  const t = new Date(`${dateStr}T${timeStr}`).getTime();
  return isNaN(t) ? 0 : t;
};

export default function VerifyPage() {
  const router = useRouter();

  // --- NEW MULTI-EVENT STATES ---
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  
  // 🚀 Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        // Fallback catch taaki HTML error aaye toh frontend crash na ho
        if (!res.ok) throw new Error("API Route Failed"); 
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

  // 🚀 PHASE 1: FILTER ONLY ACTIVE EVENTS FOR PUBLIC DROPDOWN
  const activeEvents = useMemo(() => {
    const active = allEvents.filter(e => getEventStatus(e.eventDate, e.eventTime) === "Active");
    // Sort so the closest upcoming event is on top
    active.sort((a, b) => getSafeTime(a.eventDate, a.eventTime) - getSafeTime(b.eventDate, b.eventTime));
    return active;
  }, [allEvents]);

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
        router.push(`/table-booking?firstName=${firstName}&lastName=${lastName}&eventId=${selectedEventId}&guestId=${successData?.data?._id || successData?.guest?._id || ""}`); 
      }
    } catch (error) {
      console.error("Verification failed", error);
      setOtpError("Galat OTP! Kripya sahi code dalein.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Masked Phone Number helper
  const rawPhone = successData?.data?.mobileNumber || successData?.guest?.mobileNumber || "";
  const maskedPhone = rawPhone ? `******${String(rawPhone).slice(-4)}` : "";

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
            
            {/* 🚀 UPGRADED: MODERN CUSTOM EVENT SELECTOR */}
            <div className="relative">
              {eventsLoading ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                </div>
              ) : (
                <div className="relative">
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    // 🚀 FIXED: Disabled styling added if no active events exist
                    className={`w-full bg-white/5 border ${isDropdownOpen ? 'border-amber-500/50' : 'border-white/10'} rounded-xl pl-12 pr-4 py-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all ${activeEvents.length === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <Ticket className="absolute left-4 w-5 h-5 text-amber-500" />
                    <span className={`font-medium ${selectedEventId ? "text-white" : "text-neutral-500"}`}>
                      {/* 🚀 FIXED: Only checks activeEvents now */}
                      {selectedEventId 
                        ? activeEvents.find(e => e.eventId === selectedEventId)?.mainTitle 
                        : activeEvents.length === 0 ? "No Upcoming Events" : "Select The Event You're Attending"}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isDropdownOpen ? "rotate-180 text-amber-500" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && activeEvents.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute w-full mt-2 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto"
                      >
                        {/* 🚀 FIXED: Maps ONLY active events */}
                        {activeEvents.map((event) => (
                          <div
                            key={event.eventId}
                            onClick={() => {
                              setSelectedEventId(event.eventId);
                              setIsDropdownOpen(false);
                              setError("");
                            }}
                            className="px-5 py-4 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0 text-white font-medium transition-colors"
                          >
                            {event.mainTitle}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-amber-500/50 transition-all" placeholder="First Name" />
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-amber-500/50 transition-all" placeholder="Last Name" />
                  
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
            
            {/* 🚀 UPGRADED: MASKED NUMBER DISPLAY */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-neutral-400 text-sm mb-1">We found your RSVP record.</p>
              <p className="text-white font-medium">
                OTP will be sent to <span className="text-amber-400 font-mono tracking-widest">{maskedPhone}</span>
              </p>
            </div>

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
            <input type="text" required maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] text-white outline-none font-mono focus:border-amber-500/50 transition-all" placeholder="••••••" />
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