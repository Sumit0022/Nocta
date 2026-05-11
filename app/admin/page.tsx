"use client";

// 🚀 NEXT.JS BUILD FIX
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { toast } from "sonner";
import { 
  Users, CheckCircle2, IndianRupee, MessageCircle, Plus, 
  Loader2, X, Edit, Eye, AlertCircle, Trash2, Search, 
  ArrowLeft, Printer, Settings, UploadCloud, Sparkles,
  LogOut, Ticket, ScanLine, PlusCircle, Crown, User, Lock,
  Database, ShieldAlert, UserX, UserCheck, ChevronDown, ChevronUp, History
} from "lucide-react";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react"; 
import { toPng } from "html-to-image"; 
import { Scanner } from "@yudiel/react-qr-scanner"; 

export default function AdminDashboard() {
  const router = useRouter();

  // --- MULTI-EVENT STATES ---
  const [allEvents, setAllEvents] = useState<any[]>([]); 
  const [activeEventId, setActiveEventId] = useState<string>(""); 
  const [isEventModalOpen, setIsEventModalOpen] = useState(false); 
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    mainTitle: "",
    mainHeadline: "",
    eventDate: "",
    eventTime: "",
    eventVenue: "",
  });

  // --- EXISTING STATES ---
  const [guests, setGuests] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  // 🚀 PHASE 2: CRM STATES
  const [crmData, setCrmData] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  const [expandedCrmGuest, setExpandedCrmGuest] = useState<string | null>(null); // Kundali Track State

  const [settings, setSettings] = useState({
    upiId: "", 
    qrCode: "", 
    mainTitle: "", 
    mainHeadline: "",
    eventDate: "", 
    eventTime: "", 
    eventVenue: "", 
    eventVibe: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [formData, setFormData] = useState({ 
    _id: "", 
    firstName: "", 
    lastName: "", 
    mobileNumber: "", 
    amount: 0, 
    rsvpStatus: "Pending",
    eventId: "" 
  });

  // VIP PASS & SCANNER STATES
  const [downloadingGuest, setDownloadingGuest] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  // 🚀 PHASE 1: EVENT LIFECYCLE LOGIC (18-Hour Lock)
  const getEventStatus = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return "Active"; 
    const eventDateTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(eventDateTime.getTime())) return "Active"; 
    const lockTime = new Date(eventDateTime.getTime() + 18 * 60 * 60 * 1000);
    return new Date() > lockTime ? "Completed" : "Active";
  };

  // 🚀 PHASE 1: SMART EVENT SORTING
  const { activeEvents, completedEvents } = useMemo(() => {
    const active: any[] = [];
    const completed: any[] = [];
    
    allEvents.forEach(e => {
      if (getEventStatus(e.eventDate, e.eventTime) === "Active") active.push(e);
      else completed.push(e);
    });
    
    active.sort((a, b) => new Date(`${a.eventDate}T${a.eventTime}`).getTime() - new Date(`${b.eventDate}T${b.eventTime}`).getTime());
    completed.sort((a, b) => new Date(`${b.eventDate}T${b.eventTime}`).getTime() - new Date(`${a.eventDate}T${a.eventTime}`).getTime());
    
    return { activeEvents: active, completedEvents: completed };
  }, [allEvents]);

  const isCurrentEventActive = settings.eventDate ? getEventStatus(settings.eventDate, settings.eventTime) === "Active" : true;

  // --- DATA FETCHING ---
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setAllEvents(result.data);
        if (!activeEventId && result.data.length > 0) {
          const firstActive = result.data.find((e: any) => getEventStatus(e.eventDate, e.eventTime) === "Active");
          const targetEvent = firstActive || result.data[0];
          setActiveEventId(targetEvent.eventId);
          setSettings(targetEvent);
        }
      }
    } catch (error) { 
      console.error("Fetch events failed:", error); 
    }
  };

  const fetchGuestsAndTables = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const resGuests = await fetch(`/api/admin/guests?eventId=${eventId}`);
      if (resGuests.status === 401) {
        router.push('/admin/login');
        return;
      }
      const resultGuests = await resGuests.json();
      if (resultGuests.success) {
        const fetchedList = resultGuests.guests || resultGuests.data || [];
        setGuests(Array.isArray(fetchedList) ? fetchedList : []);
      } else {
        setGuests([]);
      }

      const resTables = await fetch(`/api/admin/tables?eventId=${eventId}`);
      const resultTables = await resTables.json();
      if (resultTables.success) {
        setTables(resultTables.data || []);
      }
      
    } catch (error) { 
      console.error("Fetch failed:", error); 
      toast.error("Error loading data");
      setGuests([]); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  // 🚀 PHASE 2: FETCH GLOBAL CRM DATA
  const fetchCrmData = async () => {
    setCrmLoading(true);
    try {
      const res = await fetch('/api/admin/crm');
      const result = await res.json();
      if (result.success) {
        setCrmData(result.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch CRM data");
    } finally {
      setCrmLoading(false);
    }
  };

  // Initial Load
  useEffect(() => { 
    fetchEvents(); 
  }, []);

  // Event Switch Logic
  useEffect(() => {
    if (activeEventId && view !== "CRM") {
      fetchGuestsAndTables(activeEventId); 
      const currentEvent = allEvents.find(e => e.eventId === activeEventId);
      if (currentEvent) {
        setSettings(currentEvent);
      }
    }
  }, [activeEventId, allEvents, view]);

  // CRM Load Logic
  useEffect(() => {
    if (view === "CRM") {
      fetchCrmData();
    }
  }, [view]);
  
  // --- HANDLERS ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEvent(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventFormData),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Event Hub Created! Code: ${result.eventId}`);
        setIsEventModalOpen(false);
        setEventFormData({ mainTitle: "", mainHeadline: "", eventDate: "", eventTime: "", eventVenue: "" });
        await fetchEvents();
        setActiveEventId(result.eventId);
      }
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleLogout = async () => {
    const res = await fetch('/api/admin/logout', { method: 'POST' });
    if (res.ok) {
      toast.success("Logged out successfully");
      router.push('/admin/login');
    } else {
      toast.error("Logout failed");
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings({ ...settings, qrCode: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, eventId: activeEventId }),
      });
      if (res.ok) toast.success("Platform Settings Updated Successfully!");
      if (res.status === 401) router.push('/admin/login');
    } catch (error) { 
      toast.error("Error saving settings"); 
    } 
    finally { 
      setSavingSettings(false); 
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!id) {
      toast.error("Error: Guest ID not found!");
      return;
    }

    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const res = await fetch('/api/admin/guests/delete', { 
          method: 'DELETE', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id }) 
        });
        
        if (res.status === 401) router.push('/admin/login');
        
        if (res.ok) {
          toast.success(`${name} removed successfully`);
          fetchGuestsAndTables(activeEventId);
        } else {
          toast.error("Failed to delete guest");
        }
      } catch (error) {
        toast.error("Network error while deleting");
      }
    }
  };

  // 🚀 PHASE 2: BLACKLIST TOGGLE LOGIC
  const toggleBlacklist = async (mobileNumber: string, isBlacklisted: boolean) => {
    const action = isBlacklisted ? "remove" : "add";
    const confirmMsg = isBlacklisted 
      ? `Are you sure you want to UNBAN ${mobileNumber}?` 
      : `Are you sure you want to BLACKLIST ${mobileNumber}? They won't be able to book any future events.`;

    if (!confirm(confirmMsg)) return;

    const toastId = toast.loading("Processing...");
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, action, reason: "Admin Discretion" })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message, { id: toastId });
        fetchCrmData(); // Refresh CRM list instantly
      } else {
        toast.error(result.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Network error while updating blacklist", { id: toastId });
    }
  };

  const openEditModal = (guest: any) => { 
    setIsEditing(true); 
    setFormData({ ...guest }); 
    setIsModalOpen(true); 
  };
  
  const openVerifyModal = (guest: any) => { 
    setSelectedGuest(guest); 
    setIsVerifyModalOpen(true); 
  };

  const handleVerifyAction = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    const res = await fetch('/api/admin/guests/edit', { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...selectedGuest, rsvpStatus: newStatus }) 
    });
    if (res.status === 401) router.push('/admin/login');
    if (res.ok) {
      toast.success(`Guest set to: ${newStatus}`);
      setIsVerifyModalOpen(false); 
      setIsUpdatingStatus(false); 
      fetchGuestsAndTables(activeEventId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    const url = isEditing ? '/api/admin/guests/edit' : '/api/admin/guests/add';
    const res = await fetch(url, { 
      method: isEditing ? 'PUT' : 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...formData, eventId: activeEventId }) 
    });
    if (res.status === 401) router.push('/admin/login');
    if (res.ok) {
      toast.success(isEditing ? "Guest details updated" : "New guest added");
      setIsModalOpen(false); 
      setIsSubmitting(false); 
      fetchGuestsAndTables(activeEventId);
    }
  };

  const openWhatsApp = (guest: any) => {
    let message = `Hello ${guest.firstName}!`;

    if (guest.rsvpStatus === 'Confirmed') {
      message = `Hi ${guest.firstName}! \n\nYour RSVP for *${settings.mainTitle || 'our event'}* is CONFIRMED!\n\n *Your VIP Entry Code:* ${guest.entryCode}\n\n *Venue:* ${settings.eventVenue || 'TBA'}\n *Date:* ${settings.eventDate || 'TBA'}\n *Time:* ${settings.eventTime || 'TBA'}\n\nI have also attached your VIP Entry Pass. See you there! `;
    } else if (guest.rsvpStatus === 'Need Verification') {
      message = `Hi ${guest.firstName}, we have received your payment screenshot for ₹${guest.amount}. We are currently verifying it and will send your Entry Code very soon! `;
    } else if (guest.rsvpStatus === 'Pending') {
      message = `Hi ${guest.firstName}, your RSVP is currently pending. Please complete your payment of ₹${guest.amount} to get your VIP Entry Code. Let us know if you need any help! `;
    } else if (guest.rsvpStatus === 'Failed') {
      message = `Hi ${guest.firstName}, there was an issue verifying your payment. Please contact us so we can resolve this and confirm your RSVP! `;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/91${guest.mobileNumber}?text=${encodedMessage}`, '_blank');
  };

  const downloadVIPPass = (guest: any) => {
    setDownloadingGuest(guest); 
    const toastId = toast.loading("Generating Concert-Style VIP Pass...");

    setTimeout(async () => {
      try {
        const ticketElement = document.getElementById("admin-concert-ticket-export");
        if (!ticketElement) throw new Error("Ticket element not rendered");

        const eleWidth = ticketElement.scrollWidth;
        const eleHeight = ticketElement.scrollHeight;

        const dataUrl = await toPng(ticketElement, { 
          backgroundColor: "#0a0a0a", 
          pixelRatio: 2, 
          cacheBust: true, 
          width: eleWidth, 
          height: eleHeight 
        });

        const pdf = new jsPDF({ 
          orientation: "landscape", 
          unit: "px", 
          format: [eleWidth, eleHeight] 
        });
        
        pdf.addImage(dataUrl, "PNG", 0, 0, eleWidth, eleHeight);
        pdf.save(`${guest.firstName}_VIP_Pass.pdf`);
        toast.success("Party Pass Downloaded! Attach it in WhatsApp. 🎉", { id: toastId });
      } catch (error) {
        toast.error("Failed to generate pass", { id: toastId });
        console.error(error);
      } finally {
        setDownloadingGuest(null);
      }
    }, 500); 
  };

  const handleScan = (result: any) => {
    const text = Array.isArray(result) ? result[0].rawValue : result;
    if (!text) return;
    
    const foundGuest = guests.find(g => g.entryCode === text);
    if (foundGuest) {
      setScannedResult(foundGuest);
    } else {
      setScannedResult({ error: true, code: text });
    }
  };

  const markCheckedIn = async (guest: any) => {
    const toastId = toast.loading("Checking in guest...");
    const res = await fetch('/api/admin/guests/edit', { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...guest, rsvpStatus: 'Checked-In' }) 
    });
    if (res.ok) {
      toast.success(`${guest.firstName} is Checked-In successfully!`, { id: toastId });
      setScannedResult(null); 
      setIsScannerOpen(false); 
      fetchGuestsAndTables(activeEventId);
    } else {
      toast.error("Failed to check-in", { id: toastId });
    }
  };

  const filteredGuests = useMemo(() => {
    let list = Array.isArray(guests) ? [...guests] : [];
    if (view === "Confirmed") list = list.filter(g => g.rsvpStatus === "Confirmed");
    if (view === "Need Verification") list = list.filter(g => g.rsvpStatus === "Need Verification");
    if (view === "Pending") list = list.filter(g => g.rsvpStatus === "Pending");
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(g => {
        const fullName = `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase();
        const entryCode = (g.entryCode || "").toLowerCase();
        const phone = String(g.mobileNumber || "").toLowerCase();

        return fullName.includes(query) || 
               entryCode.includes(query) || 
               phone.includes(query);
      });
    }

    const sortedList: any[] = [];
    const processedIds = new Set();

    list.forEach(g => {
      const gId = g._id || g.id;
      if (g.isCaptain && !processedIds.has(gId)) {
        sortedList.push(g);
        processedIds.add(gId);
        
        const subs = list.filter(sub => sub.isSubordinate && sub.hostId === gId);
        subs.forEach(sub => {
          const subId = sub._id || sub.id;
          sortedList.push(sub);
          processedIds.add(subId);
        });
      }
    });

    list.forEach(g => {
      const gId = g._id || g.id;
      if (!processedIds.has(gId)) {
        sortedList.push(g);
        processedIds.add(gId);
      }
    });

    return sortedList;
  }, [guests, view, searchQuery]);

  // 🚀 PHASE 2: Filter CRM Data
  const filteredCrmData = useMemo(() => {
    if (!crmSearchQuery) return crmData;
    const query = crmSearchQuery.toLowerCase().trim();
    return crmData.filter(g => 
      `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase().includes(query) || 
      String(g.mobileNumber || "").toLowerCase().includes(query)
    );
  }, [crmData, crmSearchQuery]);

  const revenueReceived = guests.filter(g => g.rsvpStatus === "Confirmed" || g.rsvpStatus === "Checked-In").reduce((sum, g) => {
    if (g.isSubordinate) return sum; 
    const guestTable = tables.find(t => t.id === g.tableId);
    const amt = (g.isCaptain && guestTable) ? Number(guestTable.minSpend) : Number(g.amount || 0);
    return sum + amt;
  }, 0);

  const stats = [
    { 
      label: "Total Guests", 
      value: guests.length, 
      target: "Overview", 
      icon: Users, 
      color: "text-blue-400", 
      bg: "bg-blue-500/20" 
    },
    { 
      label: "Confirmed", 
      value: guests.filter(g => g.rsvpStatus === "Confirmed").length, 
      target: "Confirmed", 
      icon: CheckCircle2, 
      color: "text-green-400", 
      bg: "bg-green-500/20" 
    },
    { 
      label: "Need Verification", 
      value: guests.filter(g => g.rsvpStatus === "Need Verification").length, 
      target: "Need Verification", 
      icon: AlertCircle, 
      color: "text-amber-400", 
      bg: "bg-amber-500/20" 
    },
  ];

  return (
    <main className="min-h-screen w-full p-4 sm:p-6 md:p-10 relative text-white overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
          body { background: white !important; color: black !important; padding: 0 !important; } 
          .no-print { display: none !important; } 
          .table-container { border: 1px solid #ccc !important; box-shadow: none !important; } 
          th, td { color: black !important; border-bottom: 1px solid #eee !important; padding: 12px !important; } 
          .print-badge { border: none !important; background: none !important; font-weight: bold !important; } 
        }
      `}} />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10 fixed no-print" />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex items-center gap-4">
              {view !== "Overview" && (
                <button 
                  onClick={() => setView("Overview")} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-light tracking-wide">
                {/* 🚀 Dynamic Header Title */}
                {view === "Overview" ? "Command Center" : view === "Settings" ? "Platform Settings" : view === "CRM" ? "Master Guest Database" : `${view} List`}
              </h1>
            </div>

            {view !== "CRM" && (
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <div className="bg-white/5 border border-white/10 rounded-full pl-4 pr-3 py-1.5 flex items-center gap-3 w-full sm:w-auto">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <select 
                    value={activeEventId} 
                    onChange={(e) => setActiveEventId(e.target.value)}
                    className="bg-transparent text-sm outline-none cursor-pointer font-medium text-neutral-300 focus:text-white w-full"
                  >
                    {allEvents.length === 0 && <option value="">No Active Event</option>}
                    {activeEvents.length > 0 && (
                      <optgroup label="🟢 Active & Upcoming" className="text-green-500 bg-neutral-900 font-bold">
                        {activeEvents.map((e) => (
                          <option key={e.eventId} value={e.eventId} className="text-white font-medium">
                            {e.mainTitle} ({e.eventId})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {completedEvents.length > 0 && (
                      <optgroup label="🔒 Past / Completed" className="text-red-400 bg-neutral-900 font-bold mt-2">
                        {completedEvents.map((e) => (
                          <option key={e.eventId} value={e.eventId} className="text-neutral-400 font-medium">
                            {e.mainTitle} (Locked)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <button 
                  onClick={() => setIsEventModalOpen(true)} 
                  className="p-1.5 hover:bg-white/10 rounded-full text-amber-400 transition-colors" 
                  title="Create New Event"
                >
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            {view !== "Settings" && (
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0 mb-2 sm:mb-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder={view === "CRM" ? "Search by name or number..." : "Search..."}
                  className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-white/30 w-full sm:w-48 md:w-64" 
                  onChange={(e) => view === "CRM" ? setCrmSearchQuery(e.target.value) : setSearchQuery(e.target.value)} 
                />
              </div>
            )}
            
            {view !== "Overview" && view !== "Settings" && view !== "CRM" && (
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500/30 no-print flex-grow sm:flex-grow-0 justify-center"
              >
                <Printer className="w-4 h-4" /> Export
              </button>
            )}

            {/* 🚀 PHASE 2: CRM NAVIGATION BUTTON */}
            {view !== "CRM" && (
              <button 
                onClick={() => setView("CRM")} 
                className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500/20 transition-all flex-grow sm:flex-grow-0 justify-center"
              >
                <Database className="w-4 h-4" /> Global CRM
              </button>
            )}

            {view !== "CRM" && isCurrentEventActive && (
              <button 
                onClick={() => setIsScannerOpen(true)} 
                className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all flex-grow sm:flex-grow-0 justify-center"
              >
                <ScanLine className="w-4 h-4" /> Scan Pass
              </button>
            )}

            {view !== "CRM" && (
              <button 
                onClick={() => router.push(`/admin/tables?eventId=${activeEventId}`)}
                className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-all shadow-[0_0_15px_rgba(251,191,36,0.2)] flex-grow sm:flex-grow-0 justify-center"
              >
                Manage Tables
              </button>
            )}

            {view !== "CRM" && (
              <button 
                onClick={() => setView("Settings")} 
                className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors" 
                title="Settings"
              >
                <Settings className="w-5 h-5 text-neutral-400" />
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-red-400 transition-all flex items-center justify-center" 
              title="Logout Session"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {view !== "CRM" && isCurrentEventActive && (
              <button 
                onClick={() => {
                  setIsEditing(false); 
                  setFormData({ _id: "", firstName: "", lastName: "", mobileNumber: "", amount: 0, rsvpStatus: "Pending", eventId: activeEventId }); 
                  setIsModalOpen(true);
                }} 
                className="flex items-center gap-2 bg-white text-neutral-950 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-200 flex-grow sm:flex-grow-0 justify-center"
              >
                <Plus className="w-4 h-4" /> Add Guest
              </button>
            )}
          </div>
        </div>

        {/* 🚀 PHASE 1: COMPLETED EVENT RED BANNER */}
        {view !== "CRM" && !isCurrentEventActive && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 no-print shadow-[0_0_20px_rgba(239,68,68,0.1)]">
             <div className="bg-red-500/20 p-2 rounded-full flex-shrink-0 mt-0.5"><Lock className="w-5 h-5 text-red-400" /></div>
             <div>
                <h3 className="text-red-400 font-bold text-lg tracking-wide uppercase">Event Completed & Locked</h3>
                <p className="text-neutral-400 text-sm mt-1 leading-relaxed">This event commenced over 18 hours ago and is now permanently locked to protect historical data. You cannot add new guests, scan passes, or edit details. You can only view and export the data.</p>
             </div>
          </motion.div>
        )}

        {/* --- SETTINGS VIEW --- */}
        {view === "Settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print animate-in fade-in duration-500">
            
            <GlassCard className="p-6 sm:p-8 border-white/10 h-fit">
              <div className="flex items-center gap-3 mb-6 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-xl font-medium text-white">Event Content</h2>
              </div>
              <div className="space-y-4 text-white">
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Title</label>
                  <input 
                    disabled={!isCurrentEventActive}
                    value={settings.mainTitle} 
                    onChange={(e) => setSettings({...settings, mainTitle: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Headline</label>
                  <input 
                    disabled={!isCurrentEventActive}
                    value={settings.mainHeadline} 
                    onChange={(e) => setSettings({...settings, mainHeadline: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Date</label>
                    <input 
                      disabled={!isCurrentEventActive}
                      value={settings.eventDate} 
                      onChange={(e) => setSettings({...settings, eventDate: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Time</label>
                    <input 
                      disabled={!isCurrentEventActive}
                      value={settings.eventTime} 
                      onChange={(e) => setSettings({...settings, eventTime: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Venue</label>
                  <input 
                    disabled={!isCurrentEventActive}
                    value={settings.eventVenue} 
                    onChange={(e) => setSettings({...settings, eventVenue: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Vibe</label>
                  <input 
                    disabled={!isCurrentEventActive}
                    value={settings.eventVibe} 
                    onChange={(e) => setSettings({...settings, eventVibe: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 disabled:opacity-50" 
                  />
                </div>
              </div>
            </GlassCard>

            <div className="space-y-8">
              <GlassCard className="p-6 sm:p-8 border-white/10">
                <div className="flex items-center gap-3 mb-6 text-blue-400">
                  <IndianRupee className="w-5 h-5" />
                  <h2 className="text-xl font-medium text-white">Payment Setup</h2>
                </div>
                <div className="space-y-4 text-white">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">UPI ID</label>
                    <input 
                      disabled={!isCurrentEventActive}
                      value={settings.upiId} 
                      onChange={(e) => setSettings({...settings, upiId: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 text-white disabled:opacity-50" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">QR Code</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center mt-2">
                      <div className="w-24 h-24 flex-shrink-0 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                        {settings.qrCode ? (
                          <img src={settings.qrCode} className="w-full h-full object-contain" />
                        ) : (
                          <X className="text-neutral-500" />
                        )}
                      </div>
                      {isCurrentEventActive && (
                        <label className="flex-1 w-full border-2 border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center">
                          <UploadCloud className="w-6 h-6 mb-1 text-neutral-500" />
                          <span className="text-xs text-neutral-500 italic">Change QR</span>
                          <input type="file" className="hidden" onChange={handleQrUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              <button 
                onClick={saveSettings} 
                disabled={savingSettings || !isCurrentEventActive} 
                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex justify-center items-center gap-3 transition-colors text-white shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? <Loader2 className="animate-spin w-5 h-5" /> : isCurrentEventActive ? "Publish All Changes" : "Locked (Cannot Edit)"}
              </button>
            </div>

          </div>
        )}

        {/* --- STATS GRID --- */}
        {view === "Overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print animate-in fade-in duration-500">
            {stats.map((stat, i) => (
              <div key={i} onClick={() => setView(stat.target)} className="cursor-pointer h-full">
                <GlassCard className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group h-full">
                  <div>
                    <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1 group-hover:text-white transition-colors">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-semibold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color} flex-shrink-0`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </GlassCard>
              </div>
            ))}
            
            <GlassCard className="p-6 flex items-center justify-between bg-purple-500/5 border-purple-500/20 h-full">
              <div>
                <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">
                  Revenue Received
                </p>
                <p className="text-3xl font-semibold text-purple-400">
                  ₹{revenueReceived}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 font-bold flex-shrink-0">
                <IndianRupee className="w-6 h-6" />
              </div>
            </GlassCard>
          </div>
        )}

        {/* 🚀 PHASE 2: MASTER CRM TABLE WITH KUNDALI */}
        {view === "CRM" && (
          <GlassCard className="p-0 overflow-hidden table-container border-white/10 animate-in fade-in duration-700">
            <div className="p-4 sm:p-6 border-b border-white/10 font-medium no-print flex justify-between items-center bg-indigo-500/5">
              <span className="text-sm sm:text-base text-indigo-400 flex items-center gap-2">
                <Database className="w-5 h-5"/> Global Customer Database
              </span>
              {crmLoading && <Loader2 className="animate-spin w-4 h-4 text-indigo-400 flex-shrink-0" />}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                <thead className="text-xs text-neutral-400 uppercase tracking-widest border-b border-white/5 bg-white/5">
                  <tr>
                    <th className="p-4">Mobile Number</th>
                    <th className="p-4">Name (Last Recorded)</th>
                    <th className="p-4">Total Value</th>
                    <th className="p-4">Events</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredCrmData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 italic">
                        No CRM records found.
                      </td>
                    </tr>
                  ) : (
                    filteredCrmData.map((guest, idx) => (
                      <Fragment key={idx}>
                        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-mono font-medium">{guest.mobileNumber}</td>
                          <td className="p-4 capitalize text-neutral-300">{guest.firstName} {guest.lastName}</td>
                          <td className="p-4 text-emerald-400 font-mono">₹{guest.totalSpent}</td>
                          <td className="p-4">
                            <span className="bg-white/10 px-2 py-1 rounded text-xs">{guest.eventsAttended?.length || 0} events</span>
                          </td>
                          <td className="p-4">
                            {guest.isBlacklisted ? (
                              <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 w-fit">
                                <ShieldAlert className="w-3 h-3"/> Blacklisted
                              </span>
                            ) : (
                              <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 w-fit">
                                <UserCheck className="w-3 h-3"/> Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 flex justify-center items-center gap-2">
                            {/* KUNDALI BUTTON */}
                            <button 
                              onClick={() => setExpandedCrmGuest(expandedCrmGuest === guest.mobileNumber ? null : guest.mobileNumber)}
                              className="flex items-center gap-1 bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            >
                              <History className="w-3 h-3"/> History {expandedCrmGuest === guest.mobileNumber ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                            </button>
                            
                            {/* BAN BUTTON */}
                            <button 
                              onClick={() => toggleBlacklist(guest.mobileNumber, guest.isBlacklisted)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                guest.isBlacklisted 
                                  ? 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700' 
                                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              {guest.isBlacklisted ? "Unban" : <><UserX className="w-3 h-3"/> Ban</>}
                            </button>
                          </td>
                        </tr>
                        
                        {/* 🚀 GUEST KUNDALI (EXPANDED ROW - LIST VIEW FORMAT) */}
                        <AnimatePresence>
                          {expandedCrmGuest === guest.mobileNumber && (
                            <tr className="bg-black/40 border-b border-white/5">
                              <td colSpan={6} className="p-0">
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: "auto" }} 
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-6">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <History className="w-4 h-4"/> Event Attendance History
                                    </h4>
                                    {guest.eventsAttended?.length === 0 ? (
                                      <p className="text-sm text-neutral-500 italic">No events recorded.</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {guest.eventsAttended.map((evt: any, i: number) => {
                                          const evtDetails = allEvents.find(e => e.eventId === evt.eventId);
                                          return (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                              <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">
                                                  {evtDetails ? evtDetails.mainTitle : evt.eventId}
                                                </span>
                                                <span className="text-xs text-neutral-400 mt-1 font-mono">
                                                  {evtDetails?.eventDate ? `${evtDetails.eventDate} • ${evtDetails.eventTime || ''}` : 'Date TBA'}
                                                </span>
                                              </div>
                                              <div className="flex gap-2 items-center flex-wrap">
                                                <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded font-bold ${
                                                  evt.status === 'Confirmed' || evt.status === 'Checked-In' 
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                                }`}>
                                                  {evt.status}
                                                </span>
                                                {evt.isCaptain && <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1"><Crown className="w-3 h-3"/> Captain</span>}
                                                {evt.isSubordinate && <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded font-bold bg-white/10 text-neutral-300 border border-white/20 flex items-center gap-1"><User className="w-3 h-3"/> Pax</span>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
        
        {/* --- EVENT GUEST TABLE --- */}
        {view !== "Settings" && view !== "CRM" && (
          <GlassCard className="p-0 overflow-hidden table-container border-white/10 animate-in fade-in duration-700">
            <div className="p-4 sm:p-6 border-b border-white/10 font-medium no-print flex justify-between items-center">
              <span className="text-sm sm:text-base">Displaying {filteredGuests.length} Guests in {settings.mainTitle}</span>
              {loading && <Loader2 className="animate-spin w-4 h-4 text-neutral-500 flex-shrink-0" />}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                <thead className="text-xs text-neutral-400 uppercase tracking-widest border-b border-white/5 bg-white/5">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4 no-print">Contact</th>
                    <th className="p-4 no-print">Amount</th>
                    <th className="p-4">Unique ID</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 italic">
                        No guests found.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id || guest._id || Math.random()} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${guest.isSubordinate ? 'bg-white/[0.01]' : ''}`}>
                        
                        <td className="p-4 capitalize font-medium">
                          <div className="flex items-center gap-2">
                            {guest.isSubordinate && <div className="w-3 h-3 border-l-2 border-b-2 border-neutral-600 rounded-bl ml-2 opacity-50"></div>}
                            <span>{guest.firstName} {guest.lastName}</span>
                            {guest.isCaptain && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest flex items-center gap-1"><Crown className="w-3 h-3"/> Captain</span>}
                            {guest.isSubordinate && <span className="bg-white/5 text-neutral-400 border border-white/10 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Pax</span>}
                          </div>
                        </td>

                        <td className="p-4 text-neutral-400 no-print">
                          {guest.mobileNumber}
                        </td>
                        
                        <td className="p-4 text-purple-400 font-mono no-print">
                          {guest.isSubordinate ? (
                            <span className="text-neutral-600">-</span>
                          ) : guest.isCaptain && guest.tableId ? (
                            `₹${tables.find(t => t.id === guest.tableId)?.minSpend || guest.amount || 0}`
                          ) : (
                            `₹${guest.amount || 0}`
                          )}
                        </td>

                        <td className="p-4 font-mono text-amber-400 font-bold tracking-widest">
                          {guest.entryCode || "N/A"}
                        </td>
                        <td className="p-4">
                          <span className={`print-badge px-2 py-1 rounded text-[10px] border whitespace-nowrap
                            ${guest.rsvpStatus === 'Confirmed' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 
                              guest.rsvpStatus === 'Checked-In' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10 font-bold tracking-widest uppercase' :
                              guest.rsvpStatus === 'Need Verification' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10 animate-pulse' :
                              guest.rsvpStatus === 'Failed' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                              'text-amber-400 border-amber-500/20 bg-amber-500/5'}`}
                          >
                            {guest.rsvpStatus}
                          </span>
                        </td>
                        <td className="p-4 flex justify-center items-center gap-3 no-print">
                           {/* 🚀 PHASE 1: LOCK VERIFY/EDIT/DELETE IF EVENT COMPLETED */}
                           {(guest.rsvpStatus === 'Need Verification' || guest.screenshot) && !guest.isSubordinate && isCurrentEventActive && (
                             <button 
                               onClick={() => openVerifyModal(guest)} 
                               className="text-blue-400 hover:text-white" 
                               title="Verify Proof"
                             >
                               <Eye className="w-5 h-5"/>
                             </button>
                           )}
                           
                           <button 
                             onClick={() => openWhatsApp(guest)} 
                             className="text-neutral-400 hover:text-green-400" 
                             title="Send WhatsApp Update"
                           >
                             <MessageCircle className="w-5 h-5"/>
                           </button>
                           
                           {(guest.rsvpStatus === 'Confirmed' || guest.rsvpStatus === 'Checked-In') && (
                             <button 
                               onClick={() => downloadVIPPass(guest)} 
                               className="text-amber-400 hover:text-amber-300" 
                               title="Download VIP Pass"
                             >
                               <Ticket className="w-5 h-5"/>
                             </button>
                           )}

                           {isCurrentEventActive && (
                             <button 
                               onClick={() => openEditModal(guest)} 
                               className="text-neutral-400 hover:text-white" 
                               title="Edit"
                             >
                               <Edit className="w-5 h-5"/>
                             </button>
                           )}
                           
                           {isCurrentEventActive && (
                             <button 
                               onClick={() => handleDelete(guest.id || guest._id, guest.firstName)} 
                               className="text-neutral-500 hover:text-red-500" 
                               title="Delete"
                             >
                               <Trash2 className="w-5 h-5"/>
                             </button>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      <AnimatePresence>
        
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="w-full max-w-lg"
            >
              <GlassCard className="p-6 sm:p-8 relative border-white/10">
                <button 
                  onClick={() => setIsEventModalOpen(false)} 
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                >
                  <X className="w-5 h-5"/>
                </button>
                
                <h2 className="text-xl sm:text-2xl font-light mb-6 text-white flex items-center gap-3">
                  <PlusCircle className="text-amber-400" /> New Event Hub
                </h2>
                
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input 
                    required 
                    placeholder="Party Title" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-amber-500/50 text-white" 
                    value={eventFormData.mainTitle} 
                    onChange={(e) => setEventFormData({...eventFormData, mainTitle: e.target.value})} 
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase ml-1">Event Date</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" 
                        value={eventFormData.eventDate} 
                        onChange={(e) => setEventFormData({...eventFormData, eventDate: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase ml-1">Event Time</label>
                      <input 
                        type="time" 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none text-white scheme-dark" 
                        value={eventFormData.eventTime} 
                        onChange={(e) => setEventFormData({...eventFormData, eventTime: e.target.value})} 
                      />
                    </div>
                  </div>
                  
                  <input 
                    placeholder="Venue" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-amber-500/50 text-white" 
                    value={eventFormData.eventVenue} 
                    onChange={(e) => setEventFormData({...eventFormData, eventVenue: e.target.value})} 
                  />
                  
                  <button 
                    disabled={isCreatingEvent} 
                    className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 active:scale-95 transition-all mt-4"
                  >
                    {isCreatingEvent ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "Launch Event Engine 🚀"}
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {isScannerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="z-10 w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl shadow-amber-500/10"
            >
              <button 
                onClick={() => { setIsScannerOpen(false); setScannedResult(null); }} 
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-all"
              >
                <X className="w-5 h-5"/>
              </button>

              {!scannedResult ? (
                <div className="p-6">
                  <h2 className="text-2xl text-center text-white font-light tracking-wide mb-6">
                    Scan Entry Pass
                  </h2>
                  <div className="rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.15)] relative">
                    <Scanner onScan={handleScan} />
                  </div>
                  <p className="text-center text-neutral-500 text-sm mt-4 animate-pulse">
                    Position QR Code within the frame...
                  </p>
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center bg-gradient-to-b from-neutral-900 to-black">
                  {scannedResult.error ? (
                    <div>
                      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <X className="w-10 h-10 text-red-500"/>
                      </div>
                      <h2 className="text-2xl text-white font-bold">Invalid Pass</h2>
                      <p className="text-red-400 font-mono mt-2">{scannedResult.code}</p>
                      <p className="text-neutral-400 mt-2 text-sm">This code does not exist in the database.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                        <CheckCircle2 className="w-10 h-10 text-green-500"/>
                      </div>
                      <h2 className="text-2xl sm:text-3xl text-white font-bold capitalize">
                        {scannedResult.firstName} {scannedResult.lastName}
                      </h2>
                      <div className="bg-white/5 py-2 px-4 rounded-lg inline-block mt-3 border border-white/10">
                        <p className="text-amber-400 font-mono tracking-widest text-lg font-bold">
                          {scannedResult.entryCode}
                        </p>
                      </div>
                      <p className={`mt-4 uppercase tracking-widest text-xs font-bold ${scannedResult.rsvpStatus === 'Confirmed' ? 'text-green-400' : scannedResult.rsvpStatus === 'Checked-In' ? 'text-purple-400' : 'text-red-400'}`}>
                        Status: {scannedResult.rsvpStatus}
                      </p>

                      {scannedResult.rsvpStatus !== 'Checked-In' && (
                        <button 
                          onClick={() => markCheckedIn(scannedResult)} 
                          className="mt-8 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 text-lg"
                        >
                          Mark as Checked-In
                        </button>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => setScannedResult(null)} 
                    className="mt-6 text-neutral-400 hover:text-white transition-colors uppercase tracking-widest text-xs"
                  >
                    Scan Another Pass
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="z-10 w-full max-w-md"
            >
              <GlassCard className="p-6 sm:p-8 relative border-white/10">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-light mb-6 text-white">
                  {isEditing ? "Edit Guest Details" : "Add New Guest"}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      required 
                      placeholder="First Name" 
                      className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" 
                      value={formData.firstName} 
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                    />
                    <input 
                      required 
                      placeholder="Last Name" 
                      className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                    />
                  </div>
                  <input 
                    required 
                    placeholder="Mobile Number" 
                    className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" 
                    value={formData.mobileNumber} 
                    onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 ml-1">Amount (₹)</label>
                      <input 
                        type="number" 
                        required 
                        className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 mt-1 text-white" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 ml-1">Status</label>
                      <select 
                        className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 w-full outline-none mt-1 text-white" 
                        value={formData.rsvpStatus} 
                        onChange={(e) => setFormData({...formData, rsvpStatus: e.target.value})}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Need Verification">Need Verification</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Checked-In">Checked-In</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    disabled={isSubmitting} 
                    className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium hover:bg-neutral-200 mt-6 transition-colors shadow-lg"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Save Changes"}
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {isVerifyModalOpen && selectedGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsVerifyModalOpen(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="z-10 w-full max-w-lg"
            >
              <GlassCard className="p-6 relative overflow-hidden flex flex-col items-center border-white/10">
                <button 
                  onClick={() => setIsVerifyModalOpen(false)} 
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white bg-black/50 p-2 rounded-full z-20"
                >
                  <X className="w-5 h-5"/>
                </button>
                <h2 className="text-lg font-medium mb-1 text-white tracking-wide text-center">
                  Verify Payment Proof
                </h2>
                <p className="text-sm text-neutral-400 mb-4 text-center">
                  {selectedGuest.firstName} {selectedGuest.lastName} • ₹{selectedGuest.amount}
                </p>
                <div className="w-full h-64 sm:h-96 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-6">
                  {selectedGuest.screenshot ? (
                    <img src={selectedGuest.screenshot} alt="Payment Proof" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-neutral-500 font-light italic">No screenshot provided.</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button 
                    onClick={() => handleVerifyAction('Failed')} 
                    disabled={isUpdatingStatus} 
                    className="flex-1 w-full bg-red-500/10 text-red-400 border border-red-500/20 py-3 rounded-lg hover:bg-red-500/20 transition-all font-medium"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleVerifyAction('Confirmed')} 
                    disabled={isUpdatingStatus} 
                    className="flex-1 w-full bg-green-500/10 text-green-400 border border-green-500/20 py-3 rounded-lg hover:bg-green-500/20 transition-all font-medium"
                  >
                    Approve & Confirm
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed -top-[9999px] -left-[9999px] no-print">
        {downloadingGuest && (
          <div id="admin-concert-ticket-export" className="flex w-[800px] h-[300px] bg-neutral-950 text-white font-sans overflow-hidden border border-amber-500/30 rounded-xl relative shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black opacity-80"></div>
            
            <div className="w-[580px] p-8 flex flex-col justify-between relative z-10 border-r-2 border-dashed border-neutral-700">
               <div>
                  <h3 className="text-amber-500 tracking-[0.3em] uppercase text-xs font-bold mb-2">
                    VIP ADMISSION
                  </h3>
                  <h1 className="text-4xl font-black uppercase tracking-wider text-white drop-shadow-md">
                    {settings.mainTitle || "THE INFINITY EVENT"}
                  </h1>
                  <p className="text-neutral-400 mt-1 text-lg italic font-serif">
                    {settings.mainHeadline || "Exclusive Access Only"}
                  </p>
               </div>
               <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-widest mb-1">
                    Admit One
                  </p>
                  <h2 className="text-3xl font-bold uppercase tracking-wide text-white">
                    {downloadingGuest.firstName} {downloadingGuest.lastName}
                  </h2>
               </div>
               <div className="flex gap-10 border-t border-neutral-800 pt-5 mt-2">
                  <div>
                     <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Date</p>
                     <p className="font-bold text-white tracking-wide">{settings.eventDate || "TBA"}</p>
                  </div>
                  <div>
                     <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Time</p>
                     <p className="font-bold text-white tracking-wide">{settings.eventTime || "TBA"}</p>
                  </div>
                  
                  {downloadingGuest.tableId && (
                    <div>
                       <p className="text-amber-500 text-xs uppercase tracking-wider mb-1">VIP Table</p>
                       <p className="font-bold text-amber-400 tracking-wide">
                         {tables.find(t => t.id === downloadingGuest.tableId)?.tableName || "Reserved"}
                       </p>
                    </div>
                  )}
               </div>
            </div>

            <div className="w-[220px] bg-amber-500/5 p-6 flex flex-col items-center justify-center relative z-10">
               <p className="text-amber-500 text-sm font-bold tracking-[0.2em] mb-4 text-center">
                 SCAN AT GATE
               </p>
               <div className="bg-white p-2 rounded-xl mb-4 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  <QRCodeSVG 
                    value={downloadingGuest.entryCode || "N/A"} 
                    size={100} 
                    bgColor={"#ffffff"} 
                    fgColor={"#000000"} 
                    level={"H"} 
                  />
               </div>
               <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 text-center">
                 Entry Code
               </p>
               <p className="text-xl font-mono font-bold text-white tracking-[0.1em] text-center">
                 {downloadingGuest.entryCode || "N/A"}
               </p>
            </div>
          </div>
        )}
      </div>

    </main>
  );
}