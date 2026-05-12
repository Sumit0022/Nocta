"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, ArrowRight, UserPlus, Loader2, User, Sparkles, CheckCircle2, Phone, Heart } from "lucide-react";
import GlassCard from "@/components/atoms/GlassCard";

function TableBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const firstName = searchParams.get("firstName") || "";
  const lastName = searchParams.get("lastName") || "";
  const eventId = searchParams.get("eventId") || "";
  const guestId = searchParams.get("guestId") || "";
  
  const mobile = searchParams.get("mobile") || ""; 

  const entryType = searchParams.get("entryType") || "Stag";
  const partnerFirstName = searchParams.get("partnerFirstName") || "";
  const partnerLastName = searchParams.get("partnerLastName") || "";
  const partnerMobile = searchParams.get("partnerMobile") || "";

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
    
    const queryParams = new URLSearchParams({
      firstName, lastName, mobile, eventId, guestId, entryType,
      ...(entryType === "Couple" && !selectedTable && { partnerFirstName, partnerLastName, partnerMobile }),
      ...(isUpgrade && { isUpgrade: "true", amountPaid }) 
    }).toString();

    router.push(`/payment?${queryParams}`);
  };

  return (
    <div className="max-w-4xl w-full mx-auto pb-20">
      
      {/* 🚀 PREMIUM HERO SECTION */}
      <div className="text-center mb-12 relative z-10 mt-6">
        <motion.div 
          initial={{ scale: 0, opacity: 0, rotate: -15 }} 
          animate={{ scale: 1, opacity: 1, rotate: 0 }} 
          transition={{ duration: 0.6, type: "spring" }}
          className="w-20 h-20 bg-gradient-to-br from-amber-400/20 to-amber-600/5 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] backdrop-blur-xl"
        >
          <Crown className="w-10 h-10 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/40 mb-4"
        >
          {entryType === "Group" ? "Reserve VIP Table" : "Upgrade to VIP"}
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed"
        >
          {entryType === "Group" 
            ? "Premium table reservation is mandatory for group bookings to ensure exclusive service." 
            : "Elevate your experience. Would you like to reserve a premium table for your party? (Optional)"}
        </motion.p>
      </div>

      {/* 🚀 VIP TABLE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
        {tables.map((table, i) => {
          const isSelected = selectedTable?.id === table.id;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              key={table.id}
              onClick={() => handleTableSelect(table)}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden p-7 rounded-[2rem] border cursor-pointer transition-all duration-500 group
                ${isSelected 
                  ? 'bg-gradient-to-br from-amber-500/10 to-amber-900/20 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)]' 
                  : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05] backdrop-blur-md shadow-2xl'
                }`}
            >
              {/* Decorative Background Blur */}
              {isSelected && <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 blur-[50px] rounded-full pointer-events-none" />}

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-2xl font-black uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-white group-hover:text-amber-400/80 transition-colors'}`}>{table.tableName}</h3>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-amber-500 text-black rounded-full p-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.div>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-widest ${isSelected ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-zinc-400 border border-white/10'}`}>
                    <Users className="w-3.5 h-3.5"/> Up to {table.capacity} Pax
                  </span>
                </div>
              </div>
              
              <div className="mt-auto relative z-10 border-t border-white/5 pt-5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Minimum Spend</p>
                <p className="text-3xl font-mono font-bold text-white flex items-baseline gap-1">
                  <span className="text-xl text-zinc-400 font-sans">₹</span>{table.minSpend}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 🚀 THE PREMIUM GUEST LIST FORM */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }} 
            animate={{ opacity: 1, height: "auto", y: 0 }} 
            exit={{ opacity: 0, height: 0, y: -20 }} 
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden mb-12 relative z-10"
          >
            <GlassCard className="p-0 border-white/10 bg-[#0a0a0a]/80 shadow-2xl relative overflow-hidden rounded-[2rem]">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300" />
              
              <div className="p-8 md:p-10 border-b border-white/5 bg-gradient-to-b from-amber-500/5 to-transparent">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                  <Crown className="w-7 h-7 text-amber-500" /> 
                  Guest List Details
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  You are the designated <strong className="text-amber-500 font-medium">Captain</strong> for <strong className="text-white">{selectedTable.tableName}</strong>. Please provide the details for the remaining <strong className="text-white">{subOrdinates.length} guests</strong> joining your table to generate their personal VIP passes.
                </p>
              </div>
              
              <div className="p-8 md:p-10 space-y-8 bg-black/40">
                {subOrdinates.map((sub, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.1 * idx }}
                    className="relative pl-6 md:pl-10 border-l border-white/10 hover:border-amber-500/50 transition-colors duration-300"
                  >
                    {/* 🚀 FIXED: All elements properly wrapped inside motion.div */}
                    <div className="absolute -left-[16px] top-0 bg-[#0a0a0a] border border-white/20 text-zinc-500 text-xs font-mono font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <p className="text-sm uppercase tracking-widest text-zinc-300 font-bold flex items-center gap-2">
                        Guest Identity
                        {entryType === "Couple" && idx === 0 && (
                          <span className="bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded text-[10px] flex items-center gap-1.5 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            <Heart className="w-3 h-3"/> Partner
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserPlus className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                        </div>
                        <input 
                          type="text" placeholder="First Name" 
                          value={sub.firstName} 
                          onChange={(e) => handleSubOrdinateChange(idx, "firstName", e.target.value)} 
                          className={`w-full bg-neutral-900/50 hover:bg-neutral-900 focus:bg-black border border-white/5 focus:border-amber-500/50 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none transition-all shadow-inner ${entryType === "Couple" && idx === 0 ? "opacity-60 cursor-not-allowed" : ""}`} 
                          readOnly={entryType === "Couple" && idx === 0} 
                        />
                      </div>
                      
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                        </div>
                        <input 
                          type="text" placeholder="Last Name" 
                          value={sub.lastName} 
                          onChange={(e) => handleSubOrdinateChange(idx, "lastName", e.target.value)} 
                          className={`w-full bg-neutral-900/50 hover:bg-neutral-900 focus:bg-black border border-white/5 focus:border-amber-500/50 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none transition-all shadow-inner ${entryType === "Couple" && idx === 0 ? "opacity-60 cursor-not-allowed" : ""}`} 
                          readOnly={entryType === "Couple" && idx === 0} 
                        />
                      </div>

                      <div className="relative group md:col-span-2">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none gap-2">
                          <Phone className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                          <span className="text-zinc-500 text-sm font-medium border-r border-white/10 pr-2">+91</span>
                        </div>
                        <input 
                          type="text" maxLength={10} placeholder="Mobile Number" 
                          value={sub.phone} 
                          onChange={(e) => handleSubOrdinateChange(idx, "phone", e.target.value.replace(/[^0-9]/g, ''))} 
                          className={`w-full bg-neutral-900/50 hover:bg-neutral-900 focus:bg-black border border-white/5 focus:border-amber-500/50 rounded-xl pl-[4.5rem] pr-4 py-3.5 text-sm text-white outline-none transition-all shadow-inner tracking-wider ${entryType === "Couple" && idx === 0 ? "opacity-60 cursor-not-allowed" : ""}`} 
                          readOnly={entryType === "Couple" && idx === 0} 
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 PREMIUM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-4">
        <button 
          onClick={proceedToPayment} 
          className="w-full sm:w-auto min-w-[280px] bg-gradient-to-r from-amber-500 to-yellow-400 text-black py-4 px-8 rounded-2xl font-black uppercase tracking-widest hover:from-amber-400 hover:to-yellow-300 active:scale-95 transition-all duration-300 flex justify-center items-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_50px_rgba(245,158,11,0.5)]"
        >
          <Sparkles className="w-5 h-5" /> Proceed to Payment <ArrowRight className="w-5 h-5" />
        </button>
        
        {!selectedTable && entryType !== "Group" && (
          <button 
            onClick={proceedToPayment} 
            className="w-full sm:w-auto min-w-[280px] bg-white/[0.05] border border-white/10 text-zinc-300 py-4 px-8 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-300 flex justify-center items-center backdrop-blur-sm"
          >
            Skip, General Entry
          </button>
        )}
      </div>

    </div>
  );
}

export default function TableBookingPage() {
  return (
    <main className="min-h-screen w-full bg-[#030303] flex flex-col items-start justify-start px-4 sm:px-6 md:px-12 pt-16 pb-24 text-white relative selection:bg-amber-500/30 selection:text-amber-200">
      {/* Immersive Ambient Background */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-amber-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-[#030303] to-transparent pointer-events-none z-0" />
      
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen w-full"><Loader2 className="animate-spin w-10 h-10 text-amber-500" /></div>}>
        <TableBookingContent />
      </Suspense>
    </main>
  );
}