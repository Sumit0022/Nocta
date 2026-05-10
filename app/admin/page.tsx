"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { toast } from "sonner";
import { 
  Users, CheckCircle2, IndianRupee, MessageCircle, Plus, 
  Loader2, X, Edit, Eye, AlertCircle, Trash2, Search, 
  ArrowLeft, Printer, Settings, UploadCloud, Sparkles,
  LogOut, Ticket, ScanLine
} from "lucide-react";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react"; 
import { toPng } from "html-to-image"; 
import { Scanner } from "@yudiel/react-qr-scanner"; 

export default function AdminDashboard() {
  const router = useRouter();

  // --- STATES ---
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  const [settings, setSettings] = useState({
    upiId: "", qrCode: "", mainTitle: "", mainHeadline: "",
    eventDate: "", eventTime: "", eventVenue: "", eventVibe: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [formData, setFormData] = useState({ _id: "", firstName: "", lastName: "", mobileNumber: "", amount: 0, rsvpStatus: "Pending" });

  // 🚀 VIP PASS & SCANNER STATES
  const [downloadingGuest, setDownloadingGuest] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  // --- DATA FETCHING ---
  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/guests');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const result = await res.json();
      
      if (result.success) {
        const fetchedList = result.guests || result.data || [];
        setGuests(Array.isArray(fetchedList) ? fetchedList : []);
      } else {
        setGuests([]);
      }
      
    } catch (error) { 
      console.error("Fetch guests failed:", error); 
      toast.error("Error loading guest list");
      setGuests([]); 
    } 
    finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const result = await res.json();
      if (result.success && result.data) {
        setSettings({
          upiId: result.data.upiId || "",
          qrCode: result.data.qrCode || "",
          mainTitle: result.data.mainTitle || "",
          mainHeadline: result.data.mainHeadline || "",
          eventDate: result.data.eventDate || "",
          eventTime: result.data.eventTime || "",
          eventVenue: result.data.eventVenue || "",
          eventVibe: result.data.eventVibe || ""
        });
      }
    } catch (error) { console.error("Fetch settings failed:", error); }
  };

  useEffect(() => { 
    fetchGuests(); 
    fetchSettings(); 
  }, []);

  // --- HANDLERS ---
  
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
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success("Platform Settings Updated Successfully!");
      if (res.status === 401) router.push('/admin/login');
    } catch (error) { toast.error("Error saving settings"); } 
    finally { setSavingSettings(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const res = await fetch('/api/admin/guests/delete', { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id }) 
      });
      if (res.status === 401) router.push('/admin/login');
      if (res.ok) {
        toast.success(`${name} removed successfully`);
        fetchGuests();
      }
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
      fetchGuests();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    const url = isEditing ? '/api/admin/guests/edit' : '/api/admin/guests/add';
    const res = await fetch(url, { 
      method: isEditing ? 'PUT' : 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(formData) 
    });
    if (res.status === 401) router.push('/admin/login');
    if (res.ok) {
      toast.success(isEditing ? "Guest details updated" : "New guest added");
      setIsModalOpen(false); 
      setIsSubmitting(false); 
      fetchGuests();
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

  // 🚀 HIGH-END CONCERT VIP PASS GENERATOR
  const downloadVIPPass = (guest: any) => {
    setDownloadingGuest(guest); // Hidden div ko activate karega
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

        // Landscape mode PDF (size matches the 800x300 div perfectly)
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [eleWidth, eleHeight] });
        pdf.addImage(dataUrl, "PNG", 0, 0, eleWidth, eleHeight);
        
        pdf.save(`${guest.firstName}_Concert_Pass.pdf`);
        toast.success("Party Pass Downloaded! Attach it in WhatsApp. 🎉", { id: toastId });
      } catch (error) {
        toast.error("Failed to generate pass", { id: toastId });
        console.error(error);
      } finally {
        setDownloadingGuest(null);
      }
    }, 500); 
  };

  // 🚀 SCANNER LOGIC
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...guest, rsvpStatus: 'Checked-In' }) 
    });
    if (res.ok) {
      toast.success(`${guest.firstName} is Checked-In successfully!`, { id: toastId });
      setScannedResult(null); 
      setIsScannerOpen(false); 
      fetchGuests();
    } else {
      toast.error("Failed to check-in", { id: toastId });
    }
  };

  // --- LOGIC & FILTERING ---
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
    return list;
  }, [guests, view, searchQuery]);

  const revenueReceived = guests.filter(g => g.rsvpStatus === "Confirmed" || g.rsvpStatus === "Checked-In").reduce((sum, g) => sum + (g.amount || 0), 0);

  const stats = [
    { label: "Total Guests", value: guests.length, target: "Overview", icon: Users, color: "text-blue-400", bg: "bg-blue-500/20" },
    { label: "Confirmed", value: guests.filter(g => g.rsvpStatus === "Confirmed").length, target: "Confirmed", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" },
    { label: "Need Verification", value: guests.filter(g => g.rsvpStatus === "Need Verification").length, target: "Need Verification", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/20" },
  ];

  return (
    <main className="min-h-screen w-full p-6 md:p-10 relative text-white">
      {/* CSS FOR PRINTING (PDF) */}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-4">
            {view !== "Overview" && (
              <button onClick={() => setView("Overview")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-3xl font-light tracking-wide">
              {view === "Overview" ? "Command Center" : view === "Settings" ? "Platform Settings" : `${view} List`}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {view !== "Settings" && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-white/30 w-full md:w-64" 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            )}
            {view !== "Overview" && view !== "Settings" && (
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500/30 no-print">
                <Printer className="w-4 h-4" /> Export Data
              </button>
            )}

            {/* 🚀 NEW: SCANNER BUTTON */}
            <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all">
              <ScanLine className="w-4 h-4" /> Scan Pass
            </button>

            <button onClick={() => setView("Settings")} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors" title="Settings">
              <Settings className="w-5 h-5 text-neutral-400" />
            </button>

            <button 
              onClick={handleLogout} 
              className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-red-400 transition-all flex items-center justify-center" 
              title="Logout Session"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <button onClick={() => {setIsEditing(false); setFormData({ _id: "", firstName: "", lastName: "", mobileNumber: "", amount: 0, rsvpStatus: "Pending" }); setIsModalOpen(true);}} className="flex items-center gap-2 bg-white text-neutral-950 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-200">
              <Plus className="w-4 h-4" /> Add Guest
            </button>
          </div>
        </div>

        {/* --- SETTINGS VIEW --- */}
        {view === "Settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print animate-in fade-in duration-500">
            <GlassCard className="p-8 border-white/10 h-fit">
              <div className="flex items-center gap-3 mb-6 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-xl font-medium text-white">Event Content</h2>
              </div>
              <div className="space-y-4 text-white">
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Title</label>
                  <input value={settings.mainTitle} onChange={(e) => setSettings({...settings, mainTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Headline</label>
                  <input value={settings.mainHeadline} onChange={(e) => setSettings({...settings, mainHeadline: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Date</label>
                    <input value={settings.eventDate} onChange={(e) => setSettings({...settings, eventDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Time</label>
                    <input value={settings.eventTime} onChange={(e) => setSettings({...settings, eventTime: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Venue</label>
                  <input value={settings.eventVenue} onChange={(e) => setSettings({...settings, eventVenue: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Vibe</label>
                  <input value={settings.eventVibe} onChange={(e) => setSettings({...settings, eventVibe: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30" />
                </div>
              </div>
            </GlassCard>

            <div className="space-y-8">
              <GlassCard className="p-8 border-white/10">
                <div className="flex items-center gap-3 mb-6 text-blue-400">
                  <IndianRupee className="w-5 h-5" />
                  <h2 className="text-xl font-medium text-white">Payment Setup</h2>
                </div>
                <div className="space-y-4 text-white">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">UPI ID</label>
                    <input value={settings.upiId} onChange={(e) => setSettings({...settings, upiId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mt-1 outline-none focus:border-white/30 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">QR Code</label>
                    <div className="flex gap-4 items-center mt-2">
                      <div className="w-24 h-24 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                        {settings.qrCode ? <img src={settings.qrCode} className="w-full h-full object-contain" /> : <X className="text-neutral-500" />}
                      </div>
                      <label className="flex-1 border-2 border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center">
                        <UploadCloud className="w-6 h-6 mb-1 text-neutral-500" />
                        <span className="text-xs text-neutral-500 italic">Change QR</span>
                        <input type="file" className="hidden" onChange={handleQrUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </GlassCard>
              <button onClick={saveSettings} disabled={savingSettings} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex justify-center items-center gap-3 transition-colors text-white shadow-xl shadow-blue-900/20">
                {savingSettings ? <Loader2 className="animate-spin w-5 h-5" /> : "Publish All Changes"}
              </button>
            </div>
          </div>
        )}

        {/* --- STATS GRID --- */}
        {view === "Overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print animate-in fade-in duration-500">
            {stats.map((stat, i) => (
              <div key={i} onClick={() => setView(stat.target)} className="cursor-pointer h-full">
                <GlassCard className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group h-full">
                  <div>
                    <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1 group-hover:text-white transition-colors">{stat.label}</p>
                    <p className="text-3xl font-semibold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </GlassCard>
              </div>
            ))}
            <GlassCard className="p-6 flex items-center justify-between bg-purple-500/5 border-purple-500/20 h-full">
              <div>
                <p className="text-neutral-400 text-xs uppercase tracking-widest mb-1">Revenue Received</p>
                <p className="text-3xl font-semibold text-purple-400">₹{revenueReceived}</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 font-bold">
                <IndianRupee className="w-6 h-6" />
              </div>
            </GlassCard>
          </div>
        )}
        
        {/* --- GUEST TABLE --- */}
        {view !== "Settings" && (
          <GlassCard className="p-0 overflow-hidden table-container border-white/10 animate-in fade-in duration-700">
            <div className="p-6 border-b border-white/10 font-medium no-print flex justify-between items-center">
              <span>Displaying {filteredGuests.length} Guests</span>
              {loading && <Loader2 className="animate-spin w-4 h-4 text-neutral-500" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
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
                    <tr><td colSpan={6} className="p-8 text-center text-neutral-500 italic">No guests found.</td></tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id || guest._id || Math.random()} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 capitalize font-medium">{guest.firstName} {guest.lastName}</td>
                        <td className="p-4 text-neutral-400 no-print">{guest.mobileNumber}</td>
                        <td className="p-4 text-purple-400 font-mono no-print">₹{guest.amount || 0}</td>
                        <td className="p-4 font-mono text-amber-400 font-bold tracking-widest">{guest.entryCode || "N/A"}</td>
                        <td className="p-4">
                          <span className={`print-badge px-2 py-1 rounded text-[10px] border whitespace-nowrap
                            ${guest.rsvpStatus === 'Confirmed' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 
                              guest.rsvpStatus === 'Checked-In' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10 font-bold tracking-widest uppercase' :
                              guest.rsvpStatus === 'Need Verification' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10 animate-pulse' :
                              guest.rsvpStatus === 'Failed' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                              'text-amber-400 border-amber-500/20 bg-amber-500/5'}`}>
                            {guest.rsvpStatus}
                          </span>
                        </td>
                        <td className="p-4 flex justify-center items-center gap-3 no-print">
                           {(guest.rsvpStatus === 'Need Verification' || guest.screenshot) && (
                             <button onClick={() => openVerifyModal(guest)} className="text-blue-400 hover:text-white" title="Verify Proof"><Eye className="w-5 h-5"/></button>
                           )}
                           
                           {/* 🚀 SMART WHATSAPP BUTTON */}
                           <button onClick={() => openWhatsApp(guest)} className="text-neutral-400 hover:text-green-400" title="Send WhatsApp Update"><MessageCircle className="w-5 h-5"/></button>
                           
                           {/* 🚀 FANCY VIP PASS BUTTON */}
                           {(guest.rsvpStatus === 'Confirmed' || guest.rsvpStatus === 'Checked-In') && (
                             <button onClick={() => downloadVIPPass(guest)} className="text-amber-400 hover:text-amber-300" title="Download VIP Pass"><Ticket className="w-5 h-5"/></button>
                           )}

                           <button onClick={() => openEditModal(guest)} className="text-neutral-400 hover:text-white" title="Edit"><Edit className="w-5 h-5"/></button>
                           <button onClick={() => handleDelete(guest._id, guest.firstName)} className="text-neutral-500 hover:text-red-500" title="Delete"><Trash2 className="w-5 h-5"/></button>
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

      {/* --- ALL MODALS --- */}
      <AnimatePresence>
        
        {/* 🚀 QR SCANNER MODAL */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md no-print">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl shadow-amber-500/10">
              <button onClick={() => { setIsScannerOpen(false); setScannedResult(null); }} className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-all"><X className="w-5 h-5"/></button>

              {!scannedResult ? (
                <div className="p-6">
                  <h2 className="text-2xl text-center text-white font-light tracking-wide mb-6">Scan Entry Pass</h2>
                  <div className="rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.15)] relative">
                    <Scanner onScan={handleScan} />
                  </div>
                  <p className="text-center text-neutral-500 text-sm mt-4 animate-pulse">Position QR Code within the frame...</p>
                </div>
              ) : (
                <div className="p-8 text-center bg-gradient-to-b from-neutral-900 to-black">
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
                      <h2 className="text-3xl text-white font-bold capitalize">{scannedResult.firstName} {scannedResult.lastName}</h2>
                      <div className="bg-white/5 py-2 px-4 rounded-lg inline-block mt-3 border border-white/10">
                        <p className="text-amber-400 font-mono tracking-widest text-lg font-bold">{scannedResult.entryCode}</p>
                      </div>
                      <p className={`mt-4 uppercase tracking-widest text-xs font-bold ${scannedResult.rsvpStatus === 'Confirmed' ? 'text-green-400' : scannedResult.rsvpStatus === 'Checked-In' ? 'text-purple-400' : 'text-red-400'}`}>
                        Status: {scannedResult.rsvpStatus}
                      </p>

                      {scannedResult.rsvpStatus !== 'Checked-In' && (
                        <button onClick={() => markCheckedIn(scannedResult)} className="mt-8 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 text-lg">
                          Mark as Checked-In
                        </button>
                      )}
                    </div>
                  )}
                  <button onClick={() => setScannedResult(null)} className="mt-6 text-neutral-400 hover:text-white transition-colors uppercase tracking-widest text-xs">
                    Scan Another Pass
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ADD/EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-md">
              <GlassCard className="p-8 relative border-white/10">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                <h2 className="text-xl font-light mb-6 text-white">{isEditing ? "Edit Guest Details" : "Add New Guest"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="First Name" className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                    <input required placeholder="Last Name" className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <input required placeholder="Mobile Number" className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 text-white" value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 ml-1">Amount (₹)</label>
                      <input type="number" required className="bg-white/5 border border-white/10 rounded-lg p-3 w-full outline-none focus:border-white/30 mt-1 text-white" value={formData.amount} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 ml-1">Status</label>
                      <select className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 w-full outline-none mt-1 text-white" value={formData.rsvpStatus} onChange={(e) => setFormData({...formData, rsvpStatus: e.target.value})}>
                        <option value="Pending">Pending</option>
                        <option value="Need Verification">Need Verification</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Checked-In">Checked-In</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </div>
                  <button disabled={isSubmitting} className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium hover:bg-neutral-200 mt-6 transition-colors shadow-lg">
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Save Changes"}
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* VERIFY PAYMENT MODAL */}
        {isVerifyModalOpen && selectedGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsVerifyModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-lg">
              <GlassCard className="p-6 relative overflow-hidden flex flex-col items-center border-white/10">
                <button onClick={() => setIsVerifyModalOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white bg-black/50 p-2 rounded-full z-20"><X className="w-5 h-5"/></button>
                <h2 className="text-lg font-medium mb-1 text-white tracking-wide">Verify Payment Proof</h2>
                <p className="text-sm text-neutral-400 mb-4">{selectedGuest.firstName} {selectedGuest.lastName} • ₹{selectedGuest.amount}</p>
                <div className="w-full h-96 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-6">
                  {selectedGuest.screenshot ? (
                    <img src={selectedGuest.screenshot} alt="Payment Proof" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-neutral-500 font-light italic">No screenshot provided.</p>
                  )}
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => handleVerifyAction('Failed')} disabled={isUpdatingStatus} className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-3 rounded-lg hover:bg-red-500/20 transition-all font-medium">Reject</button>
                  <button onClick={() => handleVerifyAction('Confirmed')} disabled={isUpdatingStatus} className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-3 rounded-lg hover:bg-green-500/20 transition-all font-medium">Approve & Confirm</button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 HIDDEN HD CONCERT TICKET FOR EXPORT */}
      <div className="fixed -top-[9999px] -left-[9999px] no-print">
        {downloadingGuest && (
          <div id="admin-concert-ticket-export" className="flex w-[800px] h-[300px] bg-neutral-950 text-white font-sans overflow-hidden border border-amber-500/30 rounded-xl relative shadow-2xl">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black opacity-80"></div>
            
            {/* Left Side: Event & Guest Info */}
            <div className="w-[580px] p-8 flex flex-col justify-between relative z-10 border-r-2 border-dashed border-neutral-700">
               <div>
                  <h3 className="text-amber-500 tracking-[0.3em] uppercase text-xs font-bold mb-2">VIP ADMISSION</h3>
                  <h1 className="text-4xl font-black uppercase tracking-wider text-white drop-shadow-md">{settings.mainTitle || "THE INFINITY EVENT"}</h1>
                  <p className="text-neutral-400 mt-1 text-lg italic font-serif">{settings.mainHeadline || "Exclusive Access Only"}</p>
               </div>
               <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-widest mb-1">Admit One</p>
                  <h2 className="text-3xl font-bold uppercase tracking-wide text-white">{downloadingGuest.firstName} {downloadingGuest.lastName}</h2>
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
                  <div>
                     <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Venue</p>
                     <p className="font-bold text-white tracking-wide truncate max-w-[150px]">{settings.eventVenue || "TBA"}</p>
                  </div>
               </div>
            </div>

            {/* Right Side: Tear-off Stub & QR */}
            <div className="w-[220px] bg-amber-500/5 p-6 flex flex-col items-center justify-center relative z-10">
               <p className="text-amber-500 text-sm font-bold tracking-[0.2em] mb-4 text-center">SCAN AT GATE</p>
               <div className="bg-white p-2 rounded-xl mb-4 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  <QRCodeSVG value={downloadingGuest.entryCode || "N/A"} size={100} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} />
               </div>
               <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 text-center">Entry Code</p>
               <p className="text-xl font-mono font-bold text-white tracking-[0.1em] text-center">{downloadingGuest.entryCode || "N/A"}</p>
            </div>
          </div>
        )}
      </div>

    </main>
  );
}