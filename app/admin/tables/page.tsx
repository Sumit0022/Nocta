"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, LayoutGrid, Users, IndianRupee, Crown, User, AlertCircle, ChevronDown, ArrowLeft } from "lucide-react";
import GlassCard from "@/components/atoms/GlassCard";
import { useSearchParams, useRouter } from "next/navigation"; // 🚀 useRouter add kiya navigation ke liye

export default function TableManager() {
  const router = useRouter(); // 🚀 Router initialize kiya
  const searchParams = useSearchParams();
  const defaultEventId = searchParams.get("eventId"); 

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form States
  const [tableName, setTableName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [layoutType, setLayoutType] = useState("default");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setEvents(result.data);
          
          if (defaultEventId && result.data.some((e: any) => e.eventId === defaultEventId)) {
            setSelectedEventId(defaultEventId);
          } else if (result.data.length > 0) {
            setSelectedEventId(result.data[0].eventId);
          }
        }
      } catch (err) {} finally { setLoading(false); }
    };
    fetchEvents();
  }, [defaultEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const fetchData = async () => {
      try {
        const resTables = await fetch(`/api/admin/tables?eventId=${selectedEventId}`);
        const resultTables = await resTables.json();
        if (resultTables.success) setTables(resultTables.data || []);

        const resGuests = await fetch(`/api/admin/guests?eventId=${selectedEventId}`);
        const resultGuests = await resGuests.json();
        if (resultGuests.success) {
          const fetchedGuests = resultGuests.guests || resultGuests.data || [];
          setGuests(Array.isArray(fetchedGuests) ? fetchedGuests : []);
        } else {
          setGuests([]);
        }
      } catch (err) {
        setGuests([]);
      }
    };
    fetchData();
  }, [selectedEventId]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId, tableName, capacity: Number(capacity), minSpend: Number(minSpend), layoutType })
      });
      const result = await res.json();
      if (result.success) {
        setTables([...tables, { id: result.id, eventId: selectedEventId, tableName, capacity, minSpend, layoutType, status: "Available" }]);
        setTableName(""); setCapacity(""); setMinSpend("");
      }
    } catch (err) {} finally { setAdding(false); }
  };

  const getTableReservationDetails = (tableId: string) => {
    const validGuests = Array.isArray(guests) ? guests : [];
    const captain = validGuests.find(g => g.tableId === tableId && g.isCaptain);
    const subs = validGuests.filter(g => g.tableId === tableId && g.isSubordinate && g.hostId === captain?._id);
    return { captain, subs };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin w-8 h-8 text-amber-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-6 md:p-12 font-sans selection:bg-amber-500/30">
      
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          {/* 🚀 NAYA: BACK BUTTON */}
          <button 
            onClick={() => router.push('/admin')} 
            className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all group"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" />
          </button>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Table Control</h1>
            <p className="text-sm text-zinc-500 uppercase tracking-widest">Layout & Reservations</p>
          </div>
        </div>
        
        {/* PREMIUM EVENT SELECTOR */}
        <div className="relative w-full md:w-64">
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)} 
            className="appearance-none w-full bg-black border border-white/10 rounded-xl pl-6 pr-12 py-3 text-white outline-none focus:border-amber-500 font-medium cursor-pointer shadow-lg transition-all"
          >
            {events.map(e => (
              <option key={e.eventId} value={e.eventId} className="bg-neutral-900 text-white py-2">
                {e.mainTitle}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ... (Add Table Form aur Tables list wala baki code same rahega) ... */}
        {/* (Sirf upar ka header section hi change hua hai) */}
        
        {/* ADD TABLE FORM */}
        <GlassCard className="col-span-1 p-6 h-fit border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-500" /> Add New Table</h2>
          <form onSubmit={handleAddTable} className="space-y-4">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">Table Name</label>
              <input type="text" required value={tableName} onChange={e => setTableName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-amber-500" placeholder="e.g. VIP-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Users className="w-3 h-3"/> Pax</label>
                <input type="number" required value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-amber-500" placeholder="4" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1"><IndianRupee className="w-3 h-3"/> Spend</label>
                <input type="number" required value={minSpend} onChange={e => setMinSpend(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-amber-500" placeholder="5000" />
              </div>
            </div>
            <button type="submit" disabled={adding} className="w-full mt-4 bg-amber-500 text-black font-bold uppercase tracking-widest py-4 rounded-xl flex justify-center items-center hover:bg-amber-600 transition-all">
              {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Table"}
            </button>
          </form>
        </GlassCard>

        {/* TABLES & RESERVATIONS LIST */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-amber-500" /> Live Floor Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => {
              const { captain, subs } = getTableReservationDetails(table.id);
              
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={table.id} className={`rounded-3xl p-6 border transition-all ${table.status === 'Requested' || table.status === 'Booked' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/[0.02] border-white/10'}`}>
                  
                  <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-wider">{table.tableName}</h3>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Min Spend: <span className="text-amber-500">₹{table.minSpend}</span></p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${table.status === 'Available' ? 'bg-green-500/10 text-green-400' : table.status === 'Requested' ? 'bg-orange-500/10 text-orange-400' : 'bg-amber-500/20 text-amber-500'}`}>
                      {table.status}
                    </span>
                  </div>
                  
                  {captain ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30"><Crown className="w-4 h-4 text-amber-500"/></div>
                        <div>
                          <p className="text-sm font-bold text-white">{captain.firstName} {captain.lastName}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Captain • {captain.mobileNumber}</p>
                        </div>
                      </div>
                      
                      {subs.length > 0 && (
                        <div className="pl-11 space-y-2 mt-2">
                          {subs.map((sub: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <User className="w-3 h-3 text-zinc-500" />
                              <p className="text-xs text-zinc-400">{sub.firstName} {sub.lastName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-600 text-sm py-4">
                      <AlertCircle className="w-4 h-4"/> No active reservation
                    </div>
                  )}

                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}