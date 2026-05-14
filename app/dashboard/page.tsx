"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image"; 
import { motion } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { CheckCircle2, Calendar, MapPin, Clock, Loader2, Download, Crown, Info, ShoppingCart } from "lucide-react"; 
import { toast } from "sonner";

// 🚀 THE FIX: Imported Firebase for the Dual-Engine Fallback
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore/lite";

export default function DashboardPage() {
  const [guestName, setGuestName] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  
  const [tableName, setTableName] = useState<string | null>(null);
  const [preOrders, setPreOrders] = useState<any[]>([]); 
  
  const [entryType, setEntryType] = useState("Stag");

  useEffect(() => {
    toast.dismiss();

    const fetchAllData = async () => {
      const params = new URLSearchParams(window.location.search);
      const fName = params.get("firstName");
      const lName = params.get("lastName");
      const eId = params.get("eventId"); 
      
      try {
        let fetchedTableId = null;

        // 1. FETCH GUEST DETAILS (For Entry Code, Table ID & Pre-orders)
        if (fName && lName) {
          setGuestName(`${fName} ${lName}`);
          const guestRes = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}&eventId=${eId || ""}`);
          const guestResult = await guestRes.json();
          if (guestResult.success && guestResult.data) {
            setEntryCode(guestResult.data.entryCode || "N/A");
            fetchedTableId = guestResult.data.tableId; 
            setEntryType(guestResult.data.entryType || "Stag");
            
            // 🚀 Pre-orders loaded for the VIP Pass
            if (guestResult.data.preOrders && guestResult.data.preOrders.length > 0) {
              setPreOrders(guestResult.data.preOrders);
            }
          }
        }

        // 2. 🚀 HYBRID FETCH: Event Details (API First, Firebase Fallback for Incognito)
        if (eId) {
          let currentEvent: any = null;
          try {
            const settingsRes = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: "no-store" });
            if (settingsRes.ok) {
              const settingsResult = await settingsRes.json();
              if (settingsResult.success && Array.isArray(settingsResult.data)) {
                currentEvent = settingsResult.data.find((e: any) => String(e.eventId).trim() === String(eId).trim());
              }
            }
          } catch(err) { console.warn("API Event fetch blocked. Falling back to DB."); }

          if (!currentEvent) {
            // 🛡️ Fallback: Bypass Next.js Middleware directly via Firebase
            try {
              const docRef = doc(db, "events", eId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) currentEvent = docSnap.data();
            } catch(err) { console.warn("Firebase Event fetch failed."); }
          }
          if (currentEvent) setEventDetails(currentEvent);
        }

        // 3. 🚀 HYBRID FETCH & TS ERROR KILLED: Table Details
        if (fetchedTableId && eId) {
          let foundTable: any = null; // 🚀 TS ERROR FIX: Forced 'any' type

          try {
            const tablesRes = await fetch(`/api/admin/tables?eventId=${eId}&t=${Date.now()}`, { cache: "no-store" });
            if (tablesRes.ok) {
              const tablesResult = await tablesRes.json();
              if (tablesResult.success && Array.isArray(tablesResult.data)) {
                foundTable = tablesResult.data.find((t: any) => String(t.id) === String(fetchedTableId));
              }
            }
          } catch(err) { console.warn("API Table fetch blocked. Falling back to DB."); }

          if (!foundTable) {
            // 🛡️ Fallback
            try {
              const tDocRef = doc(db, "tables", fetchedTableId);
              const tDocSnap = await getDoc(tDocRef);
              if (tDocSnap.exists()) {
                foundTable = tDocSnap.data();
              } else {
                const tablesQuery = query(collection(db, "tables"), where("eventId", "==", eId));
                const tablesSnapshot = await getDocs(tablesQuery);
                foundTable = tablesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).find((t: any) => String(t.id) === String(fetchedTableId));
              }
            } catch(err) { console.warn("Firebase Table fetch failed."); }
          }

          // 🚀 Safe extraction of tableName
          if (foundTable && foundTable.tableName) {
            setTableName(foundTable.tableName);
          }
        }

      } catch (e) {
        console.error("Dashboard Error:", e);
        toast.error("Failed to sync some data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  const downloadVIPPass = async () => {
    const ticketElement = document.getElementById("vip-pass-card");
    if (!ticketElement) {
      toast.error("Ticket card not found!");
      return;
    }

    const toastId = toast.loading("Generating your VIP Pass..."); 

    try {
      window.scrollTo(0, 0); 

      const eleWidth = ticketElement.scrollWidth;
      const eleHeight = ticketElement.scrollHeight;

      const dataUrl = await toPng(ticketElement, { 
        backgroundColor: "#0a0a0a", 
        pixelRatio: 2, 
        cacheBust: true,
        width: eleWidth,
        height: eleHeight, 
      });

      const pdf = new jsPDF({
        orientation: "p",
        unit: "px",
        format: [eleWidth, eleHeight]
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, eleWidth, eleHeight);
      
      const fileName = guestName ? `${guestName.replace(/\s+/g, '_')}_Entry_Pass.pdf` : "Entry_Pass.pdf";
      pdf.save(fileName);

      toast.success("VIP Pass Downloaded Successfully! 🎉", { id: toastId });
    } catch (error: any) {
      console.error("PDF generation failed", error);
      toast.error("Download Failed: " + (error.message || "Unknown error"), { id: toastId });
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        
        <div id="vip-pass-card" className="w-full rounded-3xl overflow-hidden">
          <GlassCard className="overflow-hidden p-0 relative border-0">
            <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 p-6 border-b border-white/10 text-center text-white">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-amber-400" />
              <h1 className="text-2xl font-light tracking-wide">VIP PASS GRANTED</h1>
              <h2 className="text-lg font-medium mt-2 capitalize">{guestName}</h2>
              <p className="text-xs text-amber-400/80 mt-1 uppercase tracking-widest">{eventDetails?.mainTitle || ""}</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-neutral-300">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Date</p>
                    <p className="font-medium">{eventDetails?.eventDate || "Loading..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <Clock className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Time</p>
                    <p className="font-medium">{eventDetails?.eventTime || "Loading..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Venue</p>
                    <p className="font-medium">{eventDetails?.eventVenue || "Loading..."}</p>
                  </div>
                </div>

                {tableName && (
                  <div className="flex items-center gap-4 text-amber-400 pt-3 border-t border-white/5">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-amber-500/70 uppercase tracking-widest">Table ID</p>
                      <p className="font-bold text-lg tracking-wide">{tableName}</p>
                    </div>
                  </div>
                )}
                
                {/* 🚀 PRE-ORDERED ITEMS SECTION IN VIP PASS */}
                {preOrders.length > 0 && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3 text-amber-500/70"/> Pre-Ordered Add-ons</p>
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5">
                      {preOrders.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-300">{item.name}</span>
                          <span className="text-amber-400 font-mono font-bold">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 text-center">
                
                <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-6 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                  {loading || !entryCode ? (
                     <div className="w-[120px] h-[120px] flex items-center justify-center bg-gray-100 rounded-xl">
                        <Loader2 className="animate-spin text-gray-400" />
                     </div>
                  ) : (
                    <QRCodeSVG 
                      value={entryCode} 
                      size={120} 
                      bgColor={"#ffffff"} 
                      fgColor={"#000000"} 
                      level={"H"} 
                    />
                  )}
                </div>

                <p className="text-xs text-neutral-500 mb-3 uppercase tracking-widest">Entry Code</p>
                <div className="bg-white/5 rounded-lg h-16 border border-white/10 font-mono text-2xl text-amber-400 flex items-center justify-center font-bold tracking-[0.3em]">
                  {loading ? <Loader2 className="animate-spin" /> : entryCode}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {entryType !== "Stag" && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center shadow-[0_0_15px_rgba(59,130,246,0.1)] animate-in fade-in zoom-in">
            <Info className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-xs text-blue-300 font-medium leading-relaxed">
              <strong className="text-blue-400">Important:</strong> You booked a {entryType} Pass! Please ask your partner/group to visit the main registration page, click <span className="text-white">"Already booked? Download your entry pass here"</span>, and enter their own details to download their individual tickets.
            </p>
          </div>
        )}

        <button 
          type="button" 
          onClick={downloadVIPPass}
          disabled={loading || !entryCode}
          className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Download VIP Pass (PDF)
        </button>

      </motion.div>
    </main>
  );
}