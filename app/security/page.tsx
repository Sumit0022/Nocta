"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from "react";
import { Scanner } from "@yudiel/react-qr-scanner"; 
import { CheckCircle2, X, Users, Crown, Heart, User, Search, Loader2, QrCode, AlertCircle, LogOut, ShieldCheck, Calendar, Clock, ChevronRight, ArrowLeft, Maximize } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// 🚀 FIREBASE IMPORTS
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore/lite";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function SecurityApp() {
  // --- AUTH STATES ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // --- EVENT STATES ---
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // --- APP STATES ---
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // --- SCANNER MODAL STATES ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  // 🚀 8-HOUR VISIBILITY LOGIC
  const isEventActive = (dateStr: string, timeStr: string) => {
    if (!dateStr) return true; 
    try {
      let eventDateTime = new Date(`${dateStr} ${timeStr || '00:00'}`);
      
      if (isNaN(eventDateTime.getTime())) {
        const parts = dateStr.split(/[-/]/);
        let year = new Date().getFullYear(), month = 1, day = 1;
        if (parts.length === 3) {
          if (parts[0].length === 4) { year = Number(parts[0]); month = Number(parts[1]); day = Number(parts[2]); } 
          else { day = Number(parts[0]); month = Number(parts[1]); year = Number(parts[2]); if (year < 100) year += 2000; }
          let hours = 0, minutes = 0;
          if (timeStr) {
            const timeParts = timeStr.split(':');
            hours = Number(timeParts[0]); minutes = Number(timeParts[1]);
          }
          eventDateTime = new Date(year, month - 1, day, hours, minutes);
        }
      }
      
      if (isNaN(eventDateTime.getTime())) return true; 
      const lockTime = new Date(eventDateTime.getTime() + 8 * 60 * 60 * 1000);
      return new Date() < lockTime;
    } catch (e) { return true; }
  };

  // 🚀 FETCH EVENTS (DUAL-ENGINE)
  const fetchEventsList = async () => {
    setLoadingEvents(true);
    let active: any[] = [];
    
    try {
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        active = data.data.filter((e: any) => isEventActive(e.eventDate, e.eventTime));
      }
    } catch (err) { console.warn("API Events Fetch Blocked by Middleware."); }

    if (active.length === 0) {
      try {
        const querySnapshot = await getDocs(collection(db, "events"));
        const eventsData = querySnapshot.docs.map(doc => doc.data());
        active = eventsData.filter((e: any) => isEventActive(e.eventDate, e.eventTime));
      } catch (err) {
        console.error("Firebase fallback failed", err);
      }
    }

    setAvailableEvents(active);
    setLoadingEvents(false);
  };

  useEffect(() => {
    const session = localStorage.getItem("nocta_security_session");
    if (session === "true") {
      setIsAuthenticated(true);
      fetchEventsList();
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error("Enter a valid 10-digit number");
    setAuthLoading(true);

    try {
      const q = query(collection(db, "team"), where("phone", "==", phone), where("role", "==", "security"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("Access Denied! Number not authorized.");
        setAuthLoading(false);
        return;
      }

      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
      }
      
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = `+91${phone}`;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      toast.success("OTP sent securely");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send OTP.");
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error("Enter a 6-digit OTP");
    setAuthLoading(true);

    try {
      await confirmationResult.confirm(otp);
      localStorage.setItem("nocta_security_session", "true");
      setIsAuthenticated(true);
      fetchEventsList();
      toast.success("Identity Verified!");
    } catch (error) {
      toast.error("Incorrect OTP!");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nocta_security_session");
    setIsAuthenticated(false);
    setSelectedEvent(null);
    setPhone("");
    setOtp("");
    setOtpSent(false);
  };

  const selectEventAndLoadGuests = async (event: any) => {
    setSelectedEvent(event);
    setLoadingGuests(true);
    setScannedResult(null);
    
    let guestList: any[] = [];

    try {
      const res = await fetch(`/api/admin/guests?eventId=${event.eventId}&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        guestList = Array.isArray(data.guests) ? data.guests : Array.isArray(data.data) ? data.data : [];
      }
    } catch (err) { console.warn("API Guest Fetch Blocked."); }

    if (guestList.length === 0) {
      try {
        const q = query(collection(db, "guests"), where("eventId", "==", event.eventId));
        const snapshot = await getDocs(q);
        guestList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        toast.error("Failed to sync guest list");
      }
    }

    setGuests(guestList);
    setLoadingGuests(false);
  };

  const filteredGuests = useMemo(() => {
    let list = [...guests];
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((g: any) => 
        `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase().includes(query) || 
        (g.entryCode || "").toLowerCase().includes(query) || 
        String(g.mobileNumber || "").toLowerCase().includes(query)
      );
    }

    const sortedList: any[] = [];
    const processedIds = new Set();

    list.forEach((g: any) => {
      const gId = g._id || g.id;
      if ((g.isCaptain || g.entryType === "Couple" || g.entryType === "Group") && !g.isSubordinate && !processedIds.has(gId)) {
        sortedList.push(g);
        processedIds.add(gId);
        const subs = list.filter((sub: any) => sub.isSubordinate && sub.hostId === gId);
        subs.forEach((sub: any) => { sortedList.push(sub); processedIds.add(sub._id || sub.id); });
      }
    });

    list.forEach((g: any) => {
      const gId = g._id || g.id;
      if (!processedIds.has(gId)) { sortedList.push(g); processedIds.add(gId); }
    });
    return sortedList;
  }, [guests, searchQuery]);

  const handleScan = (result: any) => {
    if (!result) return;
    let text = "";
    if (Array.isArray(result) && result.length > 0) text = result[0].rawValue;
    else if (typeof result === 'object' && result.text) text = result.text;
    else if (typeof result === 'string') text = result;
    if (!text) return;

    text = String(text).trim(); 
    const foundGuest = guests.find((g: any) => String(g.entryCode) === text);
    
    if (foundGuest) setScannedResult(foundGuest); 
    else setScannedResult({ error: true, code: text });
  };

  const markCheckedIn = async (guest: any) => {
    const toastId = toast.loading("Processing entry...");
    try {
       const response = await fetch('/api/admin/guests/edit', { 
           method: 'PUT', 
           headers: { 'Content-Type': 'application/json' }, 
           body: JSON.stringify({ ...guest, rsvpStatus: 'Checked-In' }) 
       });
       if (!response.ok) throw new Error("API Failed");
       toast.success(`Access Granted!`, { id: toastId }); 
       setScannedResult(null); 
       selectEventAndLoadGuests(selectedEvent); 
    } catch(e) {
       try {
         const guestRef = doc(db, "guests", guest.id || guest._id);
         await updateDoc(guestRef, { rsvpStatus: 'Checked-In' });
         toast.success(`Access Granted (Secure Sync)!`, { id: toastId });
         setScannedResult(null); 
         selectEventAndLoadGuests(selectedEvent);
       } catch (err) {
         toast.error("Network Error: Could not check-in.", { id: toastId });
       }
    }
  };

  // 🔒 UNAUTHENTICATED VIEW
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative bg-[#050505] font-sans">
        <div id="recaptcha-container"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-black to-black -z-10" />
        
        <div className="w-full max-w-md p-8 relative border border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl rounded-[2rem]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase">Nocta</h1>
            <p className="text-neutral-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold">Secure Gate Access</p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold border-r border-white/10 pr-3">+91</span>
                <input type="tel" maxLength={10} required value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-black/60 border border-white/10 hover:border-white/20 rounded-xl pl-16 pr-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="Staff Mobile Number" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase tracking-[0.1em] flex justify-center items-center hover:bg-amber-400 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Access"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in zoom-in">
               <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-black/60 border border-white/10 rounded-xl px-5 py-4 text-center text-3xl tracking-[0.5em] text-white outline-none font-mono focus:border-amber-500/50 transition-all shadow-inner" placeholder="••••••" />
               <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase tracking-[0.1em] flex justify-center items-center hover:bg-amber-400 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enter"}
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // 🔓 EVENT SELECTION SCREEN
  if (!selectedEvent) {
    return (
      <main className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center font-sans selection:bg-amber-500/30 px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-2xl font-black tracking-[0.15em] text-white uppercase">Nocta Gate</h1>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] mt-1">Select Active Event</p>
            </div>
            <button onClick={handleLogout} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"><LogOut className="w-5 h-5" /></button>
          </div>

          {loadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
              <p className="text-[10px] uppercase tracking-widest font-bold">Scanning for active events...</p>
            </div>
          ) : availableEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 bg-white/[0.02] rounded-[2rem] p-8">
              <AlertCircle className="w-12 h-12 text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 tracking-wide">No Active Events</h3>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-sm">There are no events scheduled within the 8-hour operational window.</p>
              <button onClick={fetchEventsList} className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Refresh</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableEvents.map((event, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <div onClick={() => selectEventAndLoadGuests(event)} className="cursor-pointer block">
                    <div className="p-6 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] hover:border-amber-500/30 transition-all rounded-[1.5rem] group flex items-center justify-between shadow-lg">
                      <div>
                        <h3 className="text-lg font-black tracking-wide uppercase text-white group-hover:text-amber-400 transition-colors line-clamp-1">{event.mainTitle || "Unnamed Event"}</h3>
                        <div className="flex gap-4 mt-3 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {event.eventDate || "TBA"}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {event.eventTime || "TBA"}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-black border border-white/10 group-hover:border-amber-500/50 group-hover:text-amber-400 flex items-center justify-center transition-all shadow-inner flex-shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // 🔓 AUTHENTICATED VIEW (GUEST LIST & SCANNER MODAL)
  return (
    <main className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center font-sans selection:bg-amber-500/30">
      
      <div className="w-full max-w-3xl flex flex-col h-screen">
        
        {/* TOP HEADER */}
        <div className="bg-[#050505] px-4 py-5 flex justify-between items-center z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedEvent(null)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all"><ArrowLeft className="w-4 h-4 text-white" /></button>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white uppercase line-clamp-1">{selectedEvent.mainTitle}</h1>
              <p className="text-[9px] text-green-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1 mt-1"><CheckCircle2 className="w-2.5 h-2.5"/> Gate Active</p>
            </div>
          </div>
          <button onClick={() => { selectEventAndLoadGuests(selectedEvent); toast.success("List Synced"); }} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all"><Loader2 className={`w-4 h-4 text-neutral-400 ${loadingGuests ? 'animate-spin text-amber-500' : ''}`} /></button>
        </div>

        {/* STICKY ACTION BAR (SCAN BUTTON + SEARCH) */}
        <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl px-4 py-4 border-b border-white/10">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] flex justify-center items-center gap-3 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] text-sm"
          >
            <Maximize className="w-5 h-5" /> TAP TO SCAN PASS
          </button>
          
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search guest name, number, or code..." 
              className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all placeholder:text-neutral-600 shadow-inner" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        {/* GUEST LIST CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 hide-scrollbar">
          {loadingGuests && guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
              <p className="text-[10px] uppercase tracking-widest font-bold">Loading secure list...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-16 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-xs uppercase tracking-widest font-bold">No Guests Found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuests.map((guest: any) => (
                <div key={guest.id || guest._id || Math.random()} className={`p-4 rounded-2xl flex justify-between items-center transition-all ${guest.isSubordinate ? 'bg-transparent border-l-2 border-l-white/10 ml-6 pl-4' : 'bg-white/[0.03] border border-white/5'}`}>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-white font-bold capitalize truncate text-sm tracking-wide">{guest.firstName} {guest.lastName}</h3>
                    </div>
                    
                    <div className="flex gap-2 items-center flex-wrap">
                      {guest.isCaptain && <span className="text-amber-500 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1"><Crown className="w-3 h-3"/> Capt</span>}
                      {guest.entryType === 'Couple' && !guest.isSubordinate && <span className="text-rose-400 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1"><Heart className="w-3 h-3"/> Cpl</span>}
                      {guest.isSubordinate && <span className="text-neutral-400 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Pax</span>}
                      {guest.tableId && <span className="text-indigo-400 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 ml-1 border-l border-white/10 pl-2">VIP {guest.preOrders?.length > 0 && "🍾"}</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className={`text-[8px] uppercase font-bold tracking-widest px-2 py-1 rounded mb-2 ${guest.rsvpStatus === 'Confirmed' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : guest.rsvpStatus === 'Checked-In' ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20' : 'text-neutral-400 bg-white/5 border border-white/10'}`}>{guest.rsvpStatus}</p>
                    {guest.rsvpStatus === 'Confirmed' && (
                      <button onClick={() => markCheckedIn(guest)} className="bg-white hover:bg-gray-200 text-black text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg active:scale-95 transition-all shadow-md">Check-In</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 FULL-SCREEN SCANNER MODAL */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-center px-4 no-print"
          >
            <div className="w-full max-w-md mx-auto relative">
              <button onClick={() => { setIsScannerOpen(false); setScannedResult(null); }} className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all"><X className="w-6 h-6"/></button>
              
              {!scannedResult ? (
                <div className="text-center">
                  <h2 className="text-2xl text-white font-black tracking-[0.2em] uppercase mb-8">Scan Pass</h2>
                  <div className="rounded-3xl overflow-hidden border-2 border-amber-500/50 relative bg-black aspect-square flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                    <Scanner onScan={(result) => handleScan(result)} />
                    <div className="absolute inset-0 pointer-events-none border-[60px] border-black/50" />
                  </div>
                  <p className="text-amber-500/80 text-xs mt-6 uppercase font-bold tracking-[0.2em] animate-pulse">Align QR Code within frame</p>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                  {scannedResult.error ? (
                    <div>
                      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><X className="w-12 h-12 text-red-500"/></div>
                      <h2 className="text-3xl text-white font-black uppercase tracking-wider">Invalid Pass</h2>
                      <p className="text-red-400 font-mono mt-3 text-lg">{scannedResult.code}</p>
                      <p className="text-neutral-500 mt-2 text-sm font-medium">Code not recognized for this event.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20"><CheckCircle2 className="w-12 h-12 text-green-500"/></div>
                      <h2 className="text-3xl text-white font-black capitalize tracking-tight mb-3 line-clamp-1">{scannedResult.firstName} {scannedResult.lastName}</h2>
                      
                      <div className="flex justify-center gap-3 mb-6 mt-4">
                        {scannedResult.isCaptain && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest flex items-center gap-1.5"><Crown className="w-4 h-4"/> Captain</span>}
                        {scannedResult.isSubordinate && <span className="bg-white/10 text-neutral-300 border border-white/20 text-xs px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest flex items-center gap-1.5"><User className="w-4 h-4"/> Pax</span>}
                        {scannedResult.tableId && <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest">VIP Table</span>}
                      </div>

                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-6 inline-block w-full">
                         <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Current Status</p>
                         <p className={`uppercase tracking-widest text-sm font-black ${scannedResult.rsvpStatus === 'Confirmed' ? 'text-green-400' : scannedResult.rsvpStatus === 'Checked-In' ? 'text-purple-400' : 'text-red-400'}`}>{scannedResult.rsvpStatus}</p>
                      </div>
                      
                      {scannedResult.rsvpStatus !== 'Checked-In' && (
                        <button onClick={() => markCheckedIn(scannedResult)} className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-[0.15em] rounded-xl hover:bg-amber-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.3)]">Grant Access</button>
                      )}
                    </div>
                  )}
                  <button onClick={() => setScannedResult(null)} className="mt-6 w-full py-4 bg-transparent border border-white/20 hover:bg-white/5 text-neutral-300 font-bold uppercase tracking-[0.1em] rounded-xl active:scale-95 text-xs transition-all">Scan Another Pass</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}