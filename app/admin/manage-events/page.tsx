"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { toast } from "sonner";
import { 
  Calendar, Clock, MapPin, Users, PlusCircle, Trash2, ArrowLeft, Loader2, X, ArrowRight, History 
} from "lucide-react"; 

export default function ManageEventsPage() {
  const router = useRouter();

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Create Event State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    mainTitle: "", mainHeadline: "", eventDate: "", eventTime: "", eventVenue: "", stagPrice: "", couplePrice: ""
  });

  // 🚀 FIXED DATE LOGIC: Force strict local parsing to prevent timezone jumps
  const getEventStatus = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return "Active"; 
    
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create Date explicitly avoiding UTC 'Z' or ISO string bugs
    const eventDateTime = new Date(year, month - 1, day, hours, minutes);
    
    if (isNaN(eventDateTime.getTime())) return "Active"; 
    
    const lockTime = new Date(eventDateTime.getTime() + 18 * 60 * 60 * 1000);
    return new Date() > lockTime ? "Completed" : "Active";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, guestsRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/guests') 
      ]);
      
      const eventsData = await eventsRes.json();
      if (eventsData.success && Array.isArray(eventsData.data)) {
        setAllEvents(eventsData.data);
      }
      
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json();
        if (guestsData.success) {
           const guestList = Array.isArray(guestsData.guests || guestsData.data) ? (guestsData.guests || guestsData.data) : [];
           setAllGuests(guestList);
           
           // 🚀 SMART BACKGROUND CLEANUP: Mark Confirmed as "Not Attended" if event is Past
           await runAutoNotAttendedCleanup(eventsData.data, guestList);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 🚀 The Auto-Not-Attended Master Logic
  const runAutoNotAttendedCleanup = async (events: any[], guests: any[]) => {
    const pastEvents = events.filter(e => getEventStatus(e.eventDate, e.eventTime) === "Completed");
    const pastEventIds = pastEvents.map(e => e.eventId);
    
    // Find guests in past events who are STILL "Confirmed" (Meaning they never got Checked-In)
    const guestsToUpdate = guests.filter(g => 
      pastEventIds.includes(g.eventId) && g.rsvpStatus === "Confirmed"
    );

    if (guestsToUpdate.length > 0) {
      console.log(`Auto-cleaning ${guestsToUpdate.length} unattended guests...`);
      try {
        await Promise.all(guestsToUpdate.map(g => 
          fetch('/api/admin/guests/edit', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...g, rsvpStatus: "Not Attended" })
          })
        ));
        // Refetch guests silently to update UI numbers
        const res = await fetch('/api/admin/guests');
        const data = await res.json();
        setAllGuests(Array.isArray(data.guests || data.data) ? (data.guests || data.data) : []);
      } catch (e) {
        console.error("Failed to auto-cleanup guests", e);
      }
    }
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: any[] = [];
    const past: any[] = [];
    allEvents.forEach((e: any) => {
      if (getEventStatus(e.eventDate, e.eventTime) === "Active") upcoming.push(e);
      else past.push(e);
    });
    
    // Sort Upcoming: Closest first (Ascending)
    upcoming.sort((a: any, b: any) => new Date(`${a.eventDate}T${a.eventTime}`).getTime() - new Date(`${b.eventDate}T${b.eventTime}`).getTime());
    // Sort Past: Most recently concluded first (Descending)
    past.sort((a: any, b: any) => new Date(`${b.eventDate}T${b.eventTime}`).getTime() - new Date(`${a.eventDate}T${a.eventTime}`).getTime());
    
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [allEvents]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEvent(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...eventFormData, paymentMode: "manual"}),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Event Hub Created! Code: ${result.eventId}`);
        setIsEventModalOpen(false);
        setEventFormData({ mainTitle: "", mainHeadline: "", eventDate: "", eventTime: "", eventVenue: "", stagPrice: "", couplePrice: "" });
        await fetchData(); // Refresh list
      }
    } catch (error) { toast.error("Failed to create event"); } finally { setIsCreatingEvent(false); }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if(confirm(`Are you absolutely sure you want to delete the event "${eventName}"? This action cannot be undone.`)) {
      const toastId = toast.loading("Deleting event...");
      try {
        const res = await fetch('/api/admin/events/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });
        if (res.ok) {
           toast.success("Event deleted permanently.", { id: toastId });
           if (localStorage.getItem("adminActiveEventId") === eventId) {
             localStorage.removeItem("adminActiveEventId");
           }
           fetchData();
        } else {
           toast.error("Failed to delete event.", { id: toastId });
        }
      } catch (err) {
        toast.error("Network Error", { id: toastId });
      }
    }
  };

  const navigateToAdmin = (eventId: string) => {
    localStorage.setItem("adminActiveEventId", eventId);
    router.push('/admin');
  };

  const renderEventCard = (event: any, isPast: boolean) => {
    // Stats calculation
    const eventGuests = allGuests.filter(g => g.eventId === event.eventId);
    const totalGuests = eventGuests.length;
    // For past events, attended means Checked-In. 
    // For upcoming, it shows how many are currently Checked-In vs Total registered
    const attendedGuests = eventGuests.filter(g => g.rsvpStatus === "Checked-In").length;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        key={event.eventId}
        onClick={() => navigateToAdmin(event.eventId)}
        className="group bg-white/[0.03] border border-white/10 hover:border-amber-500/50 hover:bg-white/[0.05] rounded-2xl p-6 cursor-pointer transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none transition-opacity group-hover:opacity-100 opacity-0" />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">{event.mainTitle}</h3>
            <span className="text-xs font-mono text-neutral-500">ID: {event.eventId}</span>
          </div>
          {!isPast && (
            <button 
              onClick={(e) => handleDeleteEvent(event.eventId, event.mainTitle, e)}
              className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2 mb-6 relative z-10">
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <Calendar className="w-4 h-4 text-amber-500/70" />
            {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <Clock className="w-4 h-4 text-amber-500/70" />
            {event.eventTime}
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <MapPin className="w-4 h-4 text-amber-500/70" />
            <span className="truncate">{event.eventVenue}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-between items-end relative z-10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Guests Attended</p>
            <p className="text-lg font-mono font-bold text-white">
              <span className="text-amber-400">{attendedGuests}</span> <span className="text-neutral-600">/ {totalGuests}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-amber-500 group-hover:translate-x-1 transition-transform">
            Manage <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen w-full bg-[#050505] p-4 sm:p-6 md:p-10 relative text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-black to-black -z-10 fixed" />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5 border border-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-wide flex items-center gap-3">
                 Event Management
              </h1>
              <p className="text-sm text-neutral-500 mt-1">Create, track, and organize all your events in one place.</p>
            </div>
          </div>

          <button onClick={() => setIsEventModalOpen(true)} className="flex items-center gap-2 bg-amber-500 text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95">
            <PlusCircle className="w-5 h-5" /> Create New Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 pb-px">
          <button 
            onClick={() => setActiveTab("upcoming")}
            className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === "upcoming" ? "text-amber-500" : "text-neutral-500 hover:text-white"}`}
          >
            Upcoming Events ({upcomingEvents.length})
            {activeTab === "upcoming" && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500" />}
          </button>
          <button 
            onClick={() => setActiveTab("past")}
            className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === "past" ? "text-amber-500" : "text-neutral-500 hover:text-white"}`}
          >
            Past Events ({pastEvents.length})
            {activeTab === "past" && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500" />}
          </button>
        </div>

        {/* Event Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
            <p className="text-sm text-neutral-500 tracking-widest uppercase">Loading Events...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activeTab === "upcoming" && upcomingEvents.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Upcoming Events</h3>
                  <p className="text-sm text-neutral-500">Create a new event hub to get started.</p>
                </div>
              )}
              {activeTab === "past" && pastEvents.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <History className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Past Events</h3>
                  <p className="text-sm text-neutral-500">Events will appear here 18 hours after their scheduled time.</p>
                </div>
              )}

              {activeTab === "upcoming" && upcomingEvents.map(e => renderEventCard(e, false))}
              {activeTab === "past" && pastEvents.map(e => renderEventCard(e, true))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Add Event Modal (Same as original) */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg">
              <GlassCard className="p-6 sm:p-8 relative border-white/10">
                <button onClick={() => setIsEventModalOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
                <h2 className="text-xl sm:text-2xl font-light mb-6 text-white flex items-center gap-3"><PlusCircle className="text-amber-400" /> New Event Hub</h2>
                
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required placeholder="Party Title" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-amber-500/50 text-white" value={eventFormData.mainTitle} onChange={(e) => setEventFormData({...eventFormData, mainTitle: e.target.value})} />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] text-neutral-500 uppercase ml-1">Event Date</label><input type="date" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" value={eventFormData.eventDate} onChange={(e) => setEventFormData({...eventFormData, eventDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-neutral-500 uppercase ml-1">Event Time</label><input type="time" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" value={eventFormData.eventTime} onChange={(e) => setEventFormData({...eventFormData, eventTime: e.target.value})} /></div>
                  </div>
                  
                  <input placeholder="Venue" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-amber-500/50 text-white" value={eventFormData.eventVenue} onChange={(e) => setEventFormData({...eventFormData, eventVenue: e.target.value})} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase ml-1">Stag Price (₹)</label>
                      <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" value={eventFormData.stagPrice || ""} onChange={(e) => setEventFormData({...eventFormData, stagPrice: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase ml-1">Couple Price (₹)</label>
                      <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" value={eventFormData.couplePrice || ""} onChange={(e) => setEventFormData({...eventFormData, couplePrice: e.target.value})} />
                    </div>
                  </div>
                  
                  <button disabled={isCreatingEvent} className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 active:scale-95 transition-all mt-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">{isCreatingEvent ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "Launch Event Engine 🚀"}</button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}