"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image"; // 🚀 NAYI LIBRARY YAHAN AAYI HAI
import { motion } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { CheckCircle2, Calendar, MapPin, Clock, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [guestName, setGuestName] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      const params = new URLSearchParams(window.location.search);
      const fName = params.get("firstName");
      const lName = params.get("lastName");
      
      try {
        if (fName && lName) {
          setGuestName(`${fName} ${lName}`);
          const guestRes = await fetch(`/api/guest/details?firstName=${fName}&lastName=${lName}`, { cache: "no-store" });
          const guestResult = await guestRes.json();
          if (guestResult.success) setEntryCode(guestResult.data.entryCode || "N/A");
        }

        const settingsRes = await fetch('/api/admin/settings', { cache: "no-store" });
        const settingsResult = await settingsRes.json();
        if (settingsResult.success) setEventDetails(settingsResult.data);

      } catch (e) {
        console.error("Dashboard Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // 🚀 VIP PASS DOWNLOAD FUNCTION (Ab html-to-image use kar raha hai)
  const downloadVIPPass = async () => {
    const ticketElement = document.getElementById("vip-pass-card");
    if (!ticketElement) {
      toast.error("Ticket card not found!");
      return;
    }

    const toastId = toast.loading("Generating your VIP Pass..."); 

    try {
      window.scrollTo(0, 0); 

      // 🚀 html-to-image Tailwind v4 aur Oklab colors ko perfectly samajhta hai
      const dataUrl = await toPng(ticketElement, { 
        backgroundColor: "#0a0a0a", 
        pixelRatio: 2, // HD Quality
        cacheBust: true,
      });

      const pdf = new jsPDF("p", "mm", "a5"); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Ticket ki height/width nikal kar PDF mein perfect fit karna
      const eleWidth = ticketElement.offsetWidth;
      const eleHeight = ticketElement.offsetHeight;
      const pdfHeight = (eleHeight * pdfWidth) / eleWidth;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const fileName = guestName ? `${guestName.replace(/\s+/g, '_')}_Nocta_VIP_Pass.pdf` : "Nocta_VIP_Pass.pdf";
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
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-neutral-300">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <div><p className="text-xs text-neutral-500 uppercase">Date</p><p className="font-medium">{eventDetails?.eventDate || "Loading..."}</p></div>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <Clock className="w-5 h-5 text-neutral-500" />
                  <div><p className="text-xs text-neutral-500 uppercase">Time</p><p className="font-medium">{eventDetails?.eventTime || "Loading..."}</p></div>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-500" />
                  <div><p className="text-xs text-neutral-500 uppercase">Venue</p><p className="font-medium">{eventDetails?.eventVenue || "Loading..."}</p></div>
                </div>
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