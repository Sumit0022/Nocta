"use client";

// 🚀 NEXT.JS BUILD FIX
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
// 🚀 FIXED: Added 'Heart' to the imports so it doesn't crash VS Code
import { ArrowRight, Loader2, KeyRound, CheckCircle2, Ticket, ChevronDown, Users, User, Crown, Info, Heart } from "lucide-react";

// 🚀 FIREBASE IMPORTS
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

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

const formatEventDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function VerifyPage() {
  const router = useRouter();

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState(""); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [isNewRegistration, setIsNewRegistration] = useState(false); 

  const [entryType, setEntryType] = useState<"Stag" | "Couple" | "Group">("Stag");
  const [partnerFirstName, setPartnerFirstName] = useState("");
  const [partnerLastName, setPartnerLastName] = useState("");
  const [partnerMobile, setPartnerMobile] = useState("");

  const [isAlreadyBookedMode, setIsAlreadyBookedMode] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error("API Route Failed"); 
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) setAllEvents(result.data);
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const activeEvents = useMemo(() => {
    const active = allEvents.filter(e => getEventStatus(e.eventDate, e.eventTime) === "Active");
    active.sort((a, b) => getSafeTime(a.eventDate, a.eventTime) - getSafeTime(b.eventDate, b.eventTime));
    return active;
  }, [allEvents]);

  const selectedEventDetails = useMemo(() => {
    return allEvents.find(e => e.eventId === selectedEventId);
  }, [selectedEventId, allEvents]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return setError("Please select an event first.");
    if (mobileNumber.length < 10) return setError("Please enter a valid 10-digit mobile number.");
    
    if (!isAlreadyBookedMode) {
      if (entryType === "Couple") {
        if (!partnerFirstName || !partnerLastName || !partnerMobile) return setError("Please fill complete partner details for Couple entry.");
        if (partnerMobile === mobileNumber) return setError("Partner mobile number must be different from your mobile number.");
        if (partnerMobile.length < 10) return setError("Please enter a valid 10-digit partner mobile number.");
      }
    }

    setLoading(true); setError("");

    // 🚀 THE MASTER FIX: Verify Partner Identity First (Before Main Guest)
    if (!isAlreadyBookedMode && entryType === "Couple") {
      try {
        const pRes = await fetch("/api/guest/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName: partnerFirstName, lastName: partnerLastName, mobileNumber: partnerMobile, eventId: selectedEventId }),
        });
        const pData = await pRes.json();
        const pError = (pData.error || pData.message || "").toLowerCase();
        const pIsNotFound = pRes.status === 404 || pError.includes("not found");

        // If backend throws an error and it's NOT a "guest not found" (meaning the number is locked to a different name)
        if (!pRes.ok && !pIsNotFound) {
          setError(`Partner Error: ${pData.error || pData.message}`);
          setLoading(false);
          return; // Block execution, show exact error to user
        }
      } catch (err) {
        setError("Network error while verifying partner. Please try again.");
        setLoading(false);
        return;
      }
    }

    // 🚀 MAIN GUEST VERIFICATION
    try {
      const res = await fetch("/api/guest/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, mobileNumber, eventId: selectedEventId }),
      });
      const data = await res.json();
      
      const errorMessage = (data.error || data.message || "").toLowerCase();
      const isGuestNotFound = res.status === 404 || errorMessage.includes("not found");
      
      if (res.ok && data.success) {
        setSuccessData(data); setIsNewRegistration(false);
        if (data.data?.firstName) setFirstName(data.data.firstName);
      } else if (isGuestNotFound) {
        if (isAlreadyBookedMode) {
          setError("No booking found with these details. Please switch to New Registration/Upgrade.");
          setLoading(false);
          return;
        }
        setSuccessData({ guest: { firstName, lastName, mobileNumber } }); setIsNewRegistration(true); 
      } else {
        setError(data.error || data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally { setLoading(false); }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible', 'callback': () => {} });
    }
  };

  const handleSendOtp = async () => {
    setLoading(true); setError("");
    try {
      let phone = successData?.data?.mobileNumber || successData?.guest?.mobileNumber || mobileNumber;
      if (!phone) { setError("Mobile number is missing."); setLoading(false); return; }
      if (!phone.toString().startsWith("+")) phone = "+91" + phone;

      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result); setOtpSent(true);
    } catch (err: any) {
      setError("Failed to send OTP. Please refresh & try again.");
      if ((window as any).recaptchaVerifier) { (window as any).recaptchaVerifier.clear(); (window as any).recaptchaVerifier = null; }
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setOtpError("");

    try {
      await confirmationResult.confirm(otpInput);

      const currentStatus = successData?.rsvpStatus || successData?.data?.rsvpStatus || "Pending";
      const amountPaid = Number(successData?.data?.amount || successData?.guest?.amount || 0);
      
      const originalEntryType = successData?.data?.entryType || "Stag"; 
      let isUpgradeFlow = false;
      
      if (!isNewRegistration && currentStatus === "Confirmed" && !isAlreadyBookedMode) {
        if (originalEntryType === "Stag" && entryType === "Couple") isUpgradeFlow = true;
        if (entryType === "Group" && !successData?.data?.tableId) isUpgradeFlow = true;
      }

      // 🚀 THE MASTER FIX: ADDED "Failed" TO THE ROUTING CONDITION
      if (isNewRegistration || currentStatus === "Pending" || currentStatus === "Failed" || isUpgradeFlow) {
        const queryParams = new URLSearchParams({
          firstName, lastName, mobile: mobileNumber, eventId: selectedEventId,
          guestId: successData?.data?._id || successData?.guest?._id || "",
          entryType,
          ...(entryType === "Couple" && !isAlreadyBookedMode && { partnerFirstName, partnerLastName, partnerMobile }),
          ...(isUpgradeFlow && { isUpgrade: "true", amountPaid: amountPaid.toString() }) 
        }).toString();
        router.push(`/table-booking?${queryParams}`); 
        return;
      }

      if (currentStatus === "Confirmed") router.push(`/dashboard?firstName=${firstName}&lastName=${lastName}&eventId=${selectedEventId}`); 
      else if (currentStatus === "Need Verification") router.push('/status');

    } catch (error) { setOtpError("Incorrect OTP! Please try again."); } finally { setLoading(false); }
  };

  const rawPhone = successData?.data?.mobileNumber || successData?.guest?.mobileNumber || mobileNumber || "";
  const maskedPhone = rawPhone ? `******${String(rawPhone).slice(-4)}` : "";

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 relative py-12 overflow-hidden bg-[#050505] font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 via-neutral-950 to-black -z-10" />
      <div id="recaptcha-container"></div>

      {/* 🚀 UI OPTIMIZED FOR DESKTOP AND MOBILE */}
      <GlassCard className="w-full max-w-xl p-6 sm:p-10 relative z-10 shadow-2xl rounded-[2rem] border-white/5 bg-white/[0.02] backdrop-blur-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-wide text-white">Guest Registration</h1>
          <p className="text-neutral-400 text-sm">Secure your spot for the event</p>
        </div>

        {!successData ? (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="relative z-50">
              {eventsLoading ? (
                <div className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-5 flex items-center justify-center shadow-inner"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
              ) : (
                <div className="relative">
                  <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`w-full bg-black/40 border ${isDropdownOpen ? 'border-amber-500/50' : 'border-white/10 hover:border-white/20'} rounded-2xl pl-14 pr-5 py-4 flex items-center justify-between cursor-pointer transition-all shadow-inner ${activeEvents.length === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                    <Ticket className="absolute left-5 w-5 h-5 text-amber-500" />
                    <div className="flex flex-col text-left">
                      <span className={`font-bold tracking-wide ${selectedEventId ? "text-white" : "text-neutral-500"}`}>{selectedEventId ? selectedEventDetails?.mainTitle : activeEvents.length === 0 ? "No Upcoming Events" : "Select Your Event"}</span>
                      {selectedEventId && <span className="text-[10px] text-amber-500/80 mt-1 uppercase tracking-widest font-bold">🗓️ {formatEventDate(selectedEventDetails?.eventDate)} • 🕙 {selectedEventDetails?.eventTime || "TBA"}</span>}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${isDropdownOpen ? "rotate-180 text-amber-500" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && activeEvents.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute w-full mt-2 bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-60 overflow-y-auto">
                        {activeEvents.map((event) => (
                          <div key={event.eventId} onClick={() => { setSelectedEventId(event.eventId); setIsDropdownOpen(false); setError(""); }} className="px-6 py-4 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex flex-col">
                            <span className="text-white font-bold text-sm tracking-wide">{event.mainTitle}</span><span className="text-xs text-neutral-500 mt-1">{formatEventDate(event.eventDate)} • {event.eventTime}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <AnimatePresence>
              {selectedEventId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden pt-2">
                  <AnimatePresence>
                    {!isAlreadyBookedMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 mb-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button type="button" onClick={() => setEntryType("Stag")} className={`flex-1 py-3.5 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${entryType === "Stag" ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-neutral-500 hover:text-white"}`}><span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Stag</span><span className={`${entryType === "Stag" ? "text-black/70" : "text-neutral-600"}`}>₹{selectedEventDetails?.stagPrice || "TBA"}</span></button>
                        <button type="button" onClick={() => setEntryType("Couple")} className={`flex-1 py-3.5 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${entryType === "Couple" ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-neutral-500 hover:text-white"}`}><span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Couple</span><span className={`${entryType === "Couple" ? "text-black/70" : "text-neutral-600"}`}>₹{selectedEventDetails?.couplePrice || "TBA"}</span></button>
                        <button type="button" onClick={() => setEntryType("Group")} className={`flex-1 py-3.5 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${entryType === "Group" ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-neutral-500 hover:text-white"}`}><span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5"/> Group</span><span className={`${entryType === "Group" ? "text-black/70" : "text-neutral-600"}`}>₹ Table Min</span></button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isAlreadyBookedMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4 text-center shadow-inner">
                        <p className="text-xs text-amber-500 font-bold tracking-wide flex items-center justify-center gap-2">
                          <Info className="w-4 h-4"/> Download pass by entering exact Name & Number.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="First Name" />
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="Last Name" />
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold border-r border-white/10 pr-3">+91</span>
                    <input type="tel" maxLength={10} required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl pl-16 pr-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="Your Mobile Number" />
                  </div>

                  <AnimatePresence>
                    {entryType === "Couple" && !isAlreadyBookedMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-5 mt-4 overflow-hidden border-t border-dashed border-white/10">
                        <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold flex items-center gap-2"><Heart className="w-3.5 h-3.5"/> Partner Details Required</p>
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" required={entryType === "Couple"} value={partnerFirstName} onChange={(e) => setPartnerFirstName(e.target.value)} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="Partner First Name" />
                          <input type="text" required={entryType === "Couple"} value={partnerLastName} onChange={(e) => setPartnerLastName(e.target.value)} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="Partner Last Name" />
                        </div>
                        <div className="relative">
                           <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold border-r border-white/10 pr-3">+91</span>
                           <input type="tel" maxLength={10} required={entryType === "Couple"} value={partnerMobile} onChange={(e) => setPartnerMobile(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-xl pl-16 pr-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="Partner Mobile Number" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && <p className="text-red-400 text-sm text-center font-bold tracking-wide bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-white to-gray-200 text-black py-4 rounded-xl font-bold uppercase tracking-widest flex justify-center items-center hover:scale-[0.98] transition-transform mt-6 shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isAlreadyBookedMode ? "Fetch Entry Pass" : "Verify & Proceed")} <ArrowRight className="w-4 h-4 ml-2"/>
                  </button>

                  <div className="pt-5 border-t border-white/5 mt-5 text-center">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsAlreadyBookedMode(!isAlreadyBookedMode);
                        setError(""); 
                      }}
                      className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                      {isAlreadyBookedMode 
                        ? "Looking to buy a new pass or upgrade? Click here" 
                        : "Already booked? Download your entry pass here"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        ) : !otpSent ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.15)]"><CheckCircle2 className="w-12 h-12"/></div>
            <h2 className="text-3xl font-bold text-white tracking-wide">Welcome, {firstName}!</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-inner">
              <p className="text-neutral-400 text-sm mb-2">{isNewRegistration ? `To register your ${entryType} entry,` : `Welcome back!`}</p>
              <p className="text-white font-medium">OTP will be sent to <span className="text-amber-400 font-mono tracking-widest text-lg ml-1">{maskedPhone}</span></p>
            </div>
            {error && <p className="text-red-400 text-sm text-center font-bold">{error}</p>}
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black py-4 rounded-xl font-black uppercase tracking-widest flex justify-center items-center hover:scale-[0.98] transition-transform shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Secure OTP"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]"><KeyRound className="w-12 h-12"/></div>
            <h2 className="text-2xl font-bold mb-4 tracking-wide text-white">Verification Code</h2>
            <input type="text" required maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-center text-4xl tracking-[0.5em] text-white outline-none font-mono focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="••••••" />
            {otpError && <p className="text-red-400 text-sm text-center font-bold mt-2 bg-red-500/10 py-2 rounded-xl border border-red-500/20">{otpError}</p>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-white to-gray-200 text-black py-4 rounded-xl font-black uppercase tracking-widest flex justify-center items-center hover:scale-[0.98] transition-transform mt-8 shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
            </button>
          </form>
        )}
      </GlassCard>
    </main>
  );
}