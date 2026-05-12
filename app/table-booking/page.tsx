"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, ArrowRight, UserPlus, Loader2, User } from "lucide-react";
import GlassCard from "@/components/atoms/GlassCard";

function TableBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const firstName = searchParams.get("firstName") || "";
  const lastName = searchParams.get("lastName") || "";
  const eventId = searchParams.get("eventId") || "";
  const guestId = searchParams.get("guestId") || "";
  
  // 🚀 THE FIX: Catch the primary mobile number from URL
  const mobile = searchParams.get("mobile") || ""; 

  // 🚀 TICKET DETAILS
  const entryType = searchParams.get("entryType") || "Stag";
  const partnerFirstName = searchParams.get("partnerFirstName") || "";
  const partnerLastName = searchParams.get("partnerLastName") || "";
  const partnerMobile = searchParams.get("partnerMobile") || "";

  // 🚀 UPGRADE MISSING LINK FIX
  const isUpgrade = searchParams.get("isUpgrade") === "true";
  const amountPaid = searchParams.get("amountPaid") || "0";

  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [subOrdinates, setSubOrdinates] = useState<{firstName: string, lastName: string, phone: string}[]>([]);

  useEffect(() => {
    if(!eventId) return;
    const fetchTables = async () => {
      try {
        const res = await fetch(`/api/admin/tables?eventId=${eventId}`);
        const result = await res.json();
        if (result.success) setTables(result.data.filter((t: any) => t.status === "Available"));
      } catch (e) {}
    };
    fetchTables();
  }, [eventId]);

  const handleTableSelect = (table: any) => {
    if (selectedTable?.id === table.id) {
      setSelectedTable(null);
      setSubOrdinates([]);
      return;
    }
    
    setSelectedTable(table);
    const paxCount = table.capacity - 1; 

    // SMART AUTO-FILL FOR COUPLES
    const initialSubOrdinates = Array(paxCount).fill({ firstName: "", lastName: "", phone: "" });
    if (entryType === "Couple" && paxCount > 0) {
      initialSubOrdinates[0] = {
        firstName: partnerFirstName,
        lastName: partnerLastName,
        phone: partnerMobile
      };
    }
    setSubOrdinates(initialSubOrdinates);
  };

  const handleSubOrdinateChange = (index: number, field: string, value: string) => {
    const newSubs = [...subOrdinates];
    newSubs[index] = { ...newSubs[index], [field]: value };
    setSubOrdinates(newSubs);
  };

  const proceedToPayment = () => {
    // GROUP FORCE TABLE VALIDATION
    if (entryType === "Group" && !selectedTable) {
      return alert("Groups must reserve a VIP table to proceed. General Entry is not available for Group selection.");
    }

    if (selectedTable) {
      const incomplete = subOrdinates.some(sub => !sub.firstName || !sub.lastName || !sub.phone);
      if (incomplete) return alert("Please fill complete details (First & Last Name) for all Sub-ordinates to issue their passes.");
      localStorage.setItem("pendingTable", JSON.stringify({ table: selectedTable, subOrdinates }));
    } else {
      localStorage.removeItem("pendingTable");
    }
    
    // 🚀 FIXED: Pass 'mobile' to Payment Page
    const queryParams = new URLSearchParams({
      firstName, lastName, mobile, eventId, guestId, entryType, // Added 'mobile' here
      ...(entryType === "Couple" && !selectedTable && { partnerFirstName, partnerLastName, partnerMobile }),
      ...(isUpgrade && { isUpgrade: "true", amountPaid }) 
    }).toString();

    router.push(`/payment?${queryParams}`);
  };

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8" />
        </motion.div>
        
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest mb-2">
          {entryType === "Group" ? "Select Your VIP Table" : "Upgrade to VIP"}
        </h1>
        <p className="text-zinc-400 text-sm">
          {entryType === "Group" 
            ? "Table reservation is mandatory for group bookings." 
            : "Would you like to reserve a premium table? (Optional)"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => handleTableSelect(table)}
            className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 ${selectedTable?.id === table.id ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'bg-white/5 border-white/10 hover:border-white/30 backdrop-blur-md'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className={`text-xl font-bold uppercase tracking-wider ${selectedTable?.id === table.id ? 'text-amber-500' : 'text-white'}`}>{table.tableName}</h3>
              <span className="flex items-center gap-1 text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded-full"><Users className="w-3 h-3"/> {table.capacity} Pax</span>
            </div>
            <p className="text-sm text-zinc-400 mb-1">Minimum Spend</p>
            <p className="text-2xl font-mono text-white">₹{table.minSpend}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTable && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
            <GlassCard className="p-6 border-amber-500/20 bg-amber-500/[0.02]">
              <h3 className="text-lg font-bold text-amber-500 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> You are the Captain</h3>
              <p className="text-sm text-zinc-400 mb-6 border-b border-white/10 pb-4">Please provide details for the remaining {subOrdinates.length} guests (Sub-ordinates) joining your table. They will receive individual entry QR codes linked to your table.</p>
              
              <div className="space-y-6">
                {subOrdinates.map((sub, idx) => (
                  <div key={idx} className="flex flex-col gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    
                    <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      Guest {idx + 1} 
                      {entryType === "Couple" && idx === 0 && <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><User className="w-3 h-3"/> Partner</span>}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="First Name" 
                          value={sub.firstName} 
                          onChange={(e) => handleSubOrdinateChange(idx, "firstName", e.target.value)} 
                          className={`w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-amber-500/50 ${entryType === "Couple" && idx === 0 ? "opacity-75 cursor-not-allowed" : ""}`} 
                          readOnly={entryType === "Couple" && idx === 0} 
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Last Name" 
                          value={sub.lastName} 
                          onChange={(e) => handleSubOrdinateChange(idx, "lastName", e.target.value)} 
                          className={`w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-amber-500/50 ${entryType === "Couple" && idx === 0 ? "opacity-75 cursor-not-allowed" : ""}`} 
                          readOnly={entryType === "Couple" && idx === 0} 
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">+91</span>
                      <input 
                        type="text" 
                        maxLength={10} 
                        placeholder="Mobile Number" 
                        value={sub.phone} 
                        onChange={(e) => handleSubOrdinateChange(idx, "phone", e.target.value.replace(/[^0-9]/g, ''))} 
                        className={`w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-amber-500/50 ${entryType === "Couple" && idx === 0 ? "opacity-75 cursor-not-allowed" : ""}`} 
                        readOnly={entryType === "Couple" && idx === 0} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button onClick={proceedToPayment} className="w-full sm:flex-1 bg-amber-500 text-black py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          Proceed to Payment <ArrowRight className="w-5 h-5" />
        </button>
        
        {!selectedTable && entryType !== "Group" && (
          <button onClick={proceedToPayment} className="w-full sm:flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex justify-center items-center">
            Skip, General Entry Only
          </button>
        )}
      </div>
    </div>
  );
}

export default function TableBookingPage() {
  return (
    <main className="min-h-screen w-full bg-[#050505] flex flex-col items-center justify-center px-4 py-12 text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-black to-black -z-10" />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-amber-500" /></div>}>
        <TableBookingContent />
      </Suspense>
    </main>
  );
}