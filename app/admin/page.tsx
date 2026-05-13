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
  LogOut, Ticket, ScanLine, Crown, User, Lock,
  Database, ShieldAlert, UserX, UserCheck, ChevronDown, ChevronUp, History, Heart, ExternalLink, CreditCard, LayoutDashboard, PlusCircle
} from "lucide-react";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react"; 
import { toPng } from "html-to-image"; 
import { Scanner } from "@yudiel/react-qr-scanner"; 

export default function AdminDashboard() {
  const router = useRouter();

  const [allEvents, setAllEvents] = useState<any[]>([]); 
  const [activeEventId, setActiveEventId] = useState<string>(""); 
  
  const [guests, setGuests] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  const [crmData, setCrmData] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  const [expandedCrmGuest, setExpandedCrmGuest] = useState<string | null>(null); 

  const [isSearchCrmMode, setIsSearchCrmMode] = useState(false);
  const [crmAddSearchQuery, setCrmAddSearchQuery] = useState("");

  const [settings, setSettings] = useState({
    upiId: "", qrCode: "", mainTitle: "", mainHeadline: "", eventDate: "", eventTime: "", eventVenue: "", eventVibe: "", stagPrice: "", couplePrice: "",
    paymentMode: "manual", razorpayKey: "", razorpaySecret: "" 
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [formData, setFormData] = useState({ 
    _id: "", id: "", firstName: "", lastName: "", mobileNumber: "", amount: 0, rsvpStatus: "Pending", eventId: "",
    entryType: "Stag", partnerFirstName: "", partnerLastName: "", partnerMobile: "",
    isSubordinate: false, hostId: ""
  });

  const [downloadingGuest, setDownloadingGuest] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  // 🚀 LOGIC UNCHANGED: Bulletproof Date Parser
  const getEventStatus = (dateStr: string, timeStr: string) => {
    if (!dateStr) return "Active"; 
    
    try {
      const parts = dateStr.split(/[-/]/);
      let year = new Date().getFullYear(), month = 1, day = 1;
      
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = Number(parts[0]);
          month = Number(parts[1]);
          day = Number(parts[2]);
        } else {
          day = Number(parts[0]);
          month = Number(parts[1]);
          year = Number(parts[2]);
          if (year < 100) year += 2000; 
        }
      }

      let hours = 0, minutes = 0;
      if (timeStr) {
        if (timeStr.includes(':')) {
           const timeParts = timeStr.split(':');
           hours = Number(timeParts[0]);
           minutes = Number(timeParts[1]);
        } else {
           hours = Number(timeStr);
        }
      }
      
      const eventDateTime = new Date(year, month - 1, day, hours, minutes);
      
      if (isNaN(eventDateTime.getTime())) return "Active"; 
      
      const lockTime = new Date(eventDateTime.getTime() + 18 * 60 * 60 * 1000);
      return new Date() > lockTime ? "Completed" : "Active";
    } catch (e) {
      return "Active"; 
    }
  };

  const { activeEvents, completedEvents } = useMemo(() => {
    const active: any[] = [];
    const completed: any[] = [];
    allEvents.forEach((e: any) => {
      if (getEventStatus(e.eventDate, e.eventTime) === "Active") active.push(e);
      else completed.push(e);
    });
    active.sort((a: any, b: any) => new Date(`${a.eventDate}T${a.eventTime}`).getTime() - new Date(`${b.eventDate}T${b.eventTime}`).getTime());
    completed.sort((a: any, b: any) => new Date(`${b.eventDate}T${b.eventTime}`).getTime() - new Date(`${a.eventDate}T${a.eventTime}`).getTime());
    
    return { activeEvents: active, completedEvents: completed };
  }, [allEvents]);

  const currentSavedEvent = useMemo(() => allEvents.find((e: any) => e.eventId === activeEventId), [allEvents, activeEventId]);
  const isCurrentEventActive = currentSavedEvent 
    ? getEventStatus(currentSavedEvent.eventDate, currentSavedEvent.eventTime) === "Active" 
    : true;

  const fetchWithSafeJSON = async (url: string, options?: any) => {
    const res = await fetch(url, options);
    if (!res.ok && res.status === 401) {
      router.push('/admin/login');
      throw new Error("Unauthorized");
    }
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch (e) {
      throw new Error(`Invalid Response`);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetchWithSafeJSON('/api/admin/settings');
      const result = response.data;
      
      if (result.success && Array.isArray(result.data)) {
        setAllEvents(result.data);
        
        const globalKeys = {
          key: result.data.find((e: any) => e.razorpayKey)?.razorpayKey || "rzp_test_SoRUGbeDDagVeE",
          secret: result.data.find((e: any) => e.razorpaySecret)?.razorpaySecret || "CLYCy9UfuDp7kcGtiwoonhEy"
        };

        const savedEventId = localStorage.getItem("adminActiveEventId");
        const isSavedEventValid = result.data.some((e: any) => e.eventId === savedEventId);

        if (savedEventId && isSavedEventValid) {
          setActiveEventId(savedEventId);
          const matchedEvent = result.data.find((e: any) => e.eventId === savedEventId);
          setSettings({
            ...matchedEvent, 
            paymentMode: matchedEvent.paymentMode || "manual", 
            razorpayKey: matchedEvent.razorpayKey || globalKeys.key, 
            razorpaySecret: matchedEvent.razorpaySecret || globalKeys.secret 
          });
        } else if (!activeEventId && result.data.length > 0) {
          const firstActive = result.data.find((e: any) => getEventStatus(e.eventDate, e.eventTime) === "Active");
          const targetEvent = firstActive || result.data[0];
          
          if(targetEvent) {
             setActiveEventId(targetEvent.eventId);
             setSettings({
               ...targetEvent, 
               paymentMode: targetEvent.paymentMode || "manual", 
               razorpayKey: targetEvent.razorpayKey || globalKeys.key, 
               razorpaySecret: targetEvent.razorpaySecret || globalKeys.secret 
             });
             localStorage.setItem("adminActiveEventId", targetEvent.eventId);
          }
        }
      }
    } catch (error) { console.error("Fetch events failed:", error); }
  };

  const fetchGuestsAndTables = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const guestsRes = await fetchWithSafeJSON(`/api/admin/guests?eventId=${eventId}`);
      if (guestsRes.data.success) {
        setGuests(Array.isArray(guestsRes.data.guests || guestsRes.data.data) ? (guestsRes.data.guests || guestsRes.data.data) : []);
      } else {
        setGuests([]);
      }

      const tablesRes = await fetchWithSafeJSON(`/api/admin/tables?eventId=${eventId}`);
      if (tablesRes.ok && tablesRes.data.success) {
        setTables(tablesRes.data.data || []);
      }
    } catch (error) { 
      toast.error("Error loading data"); 
      setGuests([]); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchCrmData = async () => {
    setCrmLoading(true);
    try {
      const response = await fetchWithSafeJSON('/api/admin/crm');
      if (response.data.success) setCrmData(response.data.data || []);
    } catch (error) { 
      toast.error("Failed to fetch CRM data"); 
    } finally { 
      setCrmLoading(false); 
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (activeEventId && view !== "CRM") {
      fetchGuestsAndTables(activeEventId); 
      const currentEvent = allEvents.find((e: any) => e.eventId === activeEventId);
      
      const globalKeys = {
        key: allEvents.find((e: any) => e.razorpayKey)?.razorpayKey || "rzp_test_SoRUGbeDDagVeE",
        secret: allEvents.find((e: any) => e.razorpaySecret)?.razorpaySecret || "CLYCy9UfuDp7kcGtiwoonhEy"
      };

      if (currentEvent) setSettings({
        ...currentEvent, 
        paymentMode: currentEvent.paymentMode || "manual", 
        razorpayKey: currentEvent.razorpayKey || globalKeys.key, 
        razorpaySecret: currentEvent.razorpaySecret || globalKeys.secret 
      });
    }
  }, [activeEventId, allEvents, view]);

  useEffect(() => { if (view === "CRM") fetchCrmData(); }, [view]);
  
  const handleLogout = async () => {
    const res = await fetch('/api/admin/logout', { method: 'POST' });
    if (res.ok) { toast.success("Logged out successfully"); router.push('/admin/login'); }
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
      const response = await fetchWithSafeJSON('/api/admin/settings', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, eventId: activeEventId }),
      });
      if (response.ok) toast.success("Platform Settings Updated Successfully!");
      fetchEvents();
    } catch (error) { toast.error("Error saving settings"); } finally { setSavingSettings(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!id) return toast.error("Error: Guest ID not found!");
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const response = await fetchWithSafeJSON('/api/admin/guests/delete', { 
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) 
        });
        if (response.ok) { toast.success(`${name} removed`); fetchGuestsAndTables(activeEventId); }
      } catch (error) { toast.error("Network error while deleting"); }
    }
  };

  const handleCrmDelete = async (mobileNumber: string, name: string) => {
    if (!mobileNumber) return;
    if (confirm(`⚠️ WARNING: Are you sure you want to COMPLETELY wipe ${name} from the database?`)) {
      const toastId = toast.loading("Wiping guest data...");
      try {
        const response = await fetchWithSafeJSON('/api/admin/crm/delete', { 
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileNumber: String(mobileNumber) }) 
        });
        if (response.ok) { toast.success(`${name} deleted.`, { id: toastId }); fetchCrmData(); fetchGuestsAndTables(activeEventId); }
      } catch (error) { toast.error("Network error", { id: toastId }); }
    }
  };

  const toggleBlacklist = async (rawMobileNumber: string | number, isBlacklisted: boolean) => {
    const mobileNumber = String(rawMobileNumber);
    const action = isBlacklisted ? "remove" : "add";
    const confirmMsg = isBlacklisted ? `UNBAN ${mobileNumber}?` : `BLACKLIST ${mobileNumber}?`;
    if (!confirm(confirmMsg)) return;

    const toastId = toast.loading("Processing...");
    try {
      const response = await fetchWithSafeJSON('/api/admin/blacklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileNumber, action, reason: "Admin Discretion" })
      });
      if (response.data.success) { toast.success(response.data.message, { id: toastId }); fetchCrmData(); }
    } catch (err) { toast.error("Network error", { id: toastId }); }
  };

  const openEditModal = (guest: any) => { 
    setIsEditing(true); setIsSearchCrmMode(false); 
    setFormData({ 
      ...guest, 
      id: guest._id || guest.id || "", 
      _id: guest._id || guest.id || "", 
      entryType: guest.entryType || "Stag", 
      partnerFirstName: "", partnerLastName: "", partnerMobile: "",
      isSubordinate: guest.isSubordinate || false,
      hostId: guest.hostId || ""
    }); 
    setIsModalOpen(true); 
  };
  
  const openVerifyModal = (guest: any) => { setSelectedGuest(guest); setIsVerifyModalOpen(true); };

  const handleVerifyAction = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    const toastId = toast.loading("Verifying and syncing linked guests...");
    
    const guestId = selectedGuest.id || selectedGuest._id;
    const groupId = selectedGuest.isSubordinate ? selectedGuest.hostId : guestId;

    const linkedMembers = guests.filter((g: any) => {
      const gId = g.id || g._id;
      return gId === groupId || g.hostId === groupId;
    });

    const membersToUpdate = linkedMembers.length > 0 ? linkedMembers : [selectedGuest];

    try {
      await Promise.all(membersToUpdate.map(member => 
        fetchWithSafeJSON('/api/admin/guests/edit', { 
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ...member, rsvpStatus: newStatus }) 
        })
      ));
      
      toast.success(`Verified: Guest & Linked Partners updated!`, { id: toastId });
      setIsVerifyModalOpen(false); 
      fetchGuestsAndTables(activeEventId);
    } catch (err) {
      toast.error("Failed to verify group completely.", { id: toastId });
    }
    
    setIsUpdatingStatus(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!isEditing) {
      const isDuplicate = guests.some((g: any) => String(g.mobileNumber) === String(formData.mobileNumber));
      if (isDuplicate) return toast.error("This mobile number is already registered for this specific event!");
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading("Saving changes...");
    const url = isEditing ? '/api/admin/guests/edit' : '/api/admin/guests/add';
    
    const payload = { 
      ...formData, 
      id: formData.id || formData._id, 
      _id: formData.id || formData._id, 
      eventId: activeEventId,
      ...(formData.entryType === "Couple" && !isEditing && { partnerDetails: { firstName: formData.partnerFirstName, lastName: formData.partnerLastName, phone: formData.partnerMobile } })
    };

    try {
      const response = await fetchWithSafeJSON(url, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (response.ok) {
        if (isEditing) {
           const formGuestId = formData.id || formData._id;
           const groupId = formData.isSubordinate ? formData.hostId : formGuestId;
           
           const linkedMembers = guests.filter((g: any) => {
              const gId = g.id || g._id;
              return (gId === groupId || g.hostId === groupId) && gId !== formGuestId; 
           });

           if (linkedMembers.length > 0) {
              await Promise.all(linkedMembers.map(member => 
                 fetchWithSafeJSON('/api/admin/guests/edit', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...member, rsvpStatus: formData.rsvpStatus })
                 })
              ));
           }
        }
        
        toast.success(isEditing ? "Updated & Synced successfully!" : "Added successfully!", { id: toastId });
        setIsModalOpen(false); 
        fetchGuestsAndTables(activeEventId);
      } else {
        toast.error(response.data.error || response.data.message || "Failed to save changes", { id: toastId });
      }
    } catch (err) {
      toast.error("Network Error", { id: toastId });
    }
    
    setIsSubmitting(false);
  };

  const openWhatsApp = (guest: any) => {
    let message = `Hello ${guest.firstName}!`;
    if (guest.rsvpStatus === 'Confirmed') message = `Hi ${guest.firstName}! \n\nYour RSVP for *${settings.mainTitle || 'our event'}* is CONFIRMED!\n\n *Your VIP Entry Code:* ${guest.entryCode}\n\n *Venue:* ${settings.eventVenue || 'TBA'}\n *Date:* ${settings.eventDate || 'TBA'}\n *Time:* ${settings.eventTime || 'TBA'}\n\nI have also attached your VIP Entry Pass. See you there! `;
    else if (guest.rsvpStatus === 'Need Verification') message = `Hi ${guest.firstName}, we have received your payment screenshot for ₹${guest.amount}. We are currently verifying it and will send your Entry Code very soon! `;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/91${guest.mobileNumber}?text=${encodedMessage}`, '_blank');
  };

  // 🚀 FIXED: Reliable PDF Generator with increased delay for DOM paint
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
           width: eleWidth, 
           height: eleHeight 
        });
        
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [eleWidth, eleHeight] });
        pdf.addImage(dataUrl, "PNG", 0, 0, eleWidth, eleHeight);
        pdf.save(`${guest.firstName}_VIP_Pass.pdf`);
        toast.success("Party Pass Downloaded!", { id: toastId });
      } catch (error) { 
        toast.error("Failed to generate pass. Try again.", { id: toastId }); 
      } finally { 
        setDownloadingGuest(null); 
      }
    }, 1000); // Wait for hidden DOM to securely mount
  };

  // 🚀 FIXED: Strict array handling for Yudiel's Scanner
  const handleScan = (result: any) => {
    if (!result || !Array.isArray(result) || result.length === 0) return;
    
    const text = String(result[0].rawValue).trim();
    if (!text) return;
    
    const foundGuest = guests.find((g: any) => String(g.entryCode) === text);
    
    if (foundGuest) setScannedResult(foundGuest); 
    else setScannedResult({ error: true, code: text });
  };

  const markCheckedIn = async (guest: any) => {
    const toastId = toast.loading("Checking in...");
    try {
       const response = await fetchWithSafeJSON('/api/admin/guests/edit', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...guest, rsvpStatus: 'Checked-In' }) });
       if (response.ok) { toast.success(`Checked-In successfully!`, { id: toastId }); setScannedResult(null); setIsScannerOpen(false); fetchGuestsAndTables(activeEventId); }
    } catch(e) {
       toast.error("Network Error during Check-in", { id: toastId });
    }
  };

  const openBase64InNewTab = (base64Data: string) => {
    const win = window.open("");
    if (win) {
      win.document.write(`
        <html style="height: 100%; background: #0e0e0e;">
          <head><title>Payment Verification</title></head>
          <body style="margin: 0; height: 100%; display: flex; align-items: center; justify-content: center;">
            <img src="${base64Data}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
          </body>
        </html>
      `);
    }
  };

  const filteredGuests = useMemo(() => {
    let list = Array.isArray(guests) ? [...guests] : [];
    if (view === "Confirmed") list = list.filter((g: any) => g.rsvpStatus === "Confirmed");
    if (view === "Need Verification") list = list.filter((g: any) => g.rsvpStatus === "Need Verification");
    if (view === "Checked-In") list = list.filter((g: any) => g.rsvpStatus === "Checked-In");
    if (view === "Pending") list = list.filter((g: any) => g.rsvpStatus === "Pending");
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((g: any) => `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase().includes(query) || (g.entryCode || "").toLowerCase().includes(query) || String(g.mobileNumber || "").toLowerCase().includes(query));
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
  }, [guests, view, searchQuery]);

  const filteredCrmData = useMemo(() => {
    if (!crmSearchQuery) return crmData;
    const query = crmSearchQuery.toLowerCase().trim();
    return crmData.filter((g: any) => `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase().includes(query) || String(g.mobileNumber || "").toLowerCase().includes(query));
  }, [crmData, crmSearchQuery]);

  const modalCrmResults = useMemo(() => {
    if (!crmAddSearchQuery) return [];
    const query = crmAddSearchQuery.toLowerCase().trim();
    return crmData.filter((c: any) => `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(query) || String(c.mobileNumber || "").toLowerCase().includes(query)).slice(0, 5); 
  }, [crmData, crmAddSearchQuery]);

  const revenueReceived = guests.filter((g: any) => ["Confirmed", "Checked-In", "Not Attended"].includes(g.rsvpStatus)).reduce((sum, g) => {
    if (g.isSubordinate) return sum; 
    const guestTable = tables.find((t: any) => t.id === g.tableId);
    const amt = (g.isCaptain && guestTable) ? Number(guestTable.minSpend) : Number(g.amount || 0);
    return sum + amt;
  }, 0);

  const stats = [
    { label: "Total Guests", value: guests.length, target: "Overview", icon: Users, color: "text-blue-400", bg: "bg-blue-500/20" },
    { 
      label: !isCurrentEventActive ? "All Guests" : "Confirmed", 
      value: !isCurrentEventActive ? guests.length : guests.filter((g: any) => g.rsvpStatus === "Confirmed").length, 
      target: !isCurrentEventActive ? "Overview" : "Confirmed", 
      icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" 
    },
    { 
      label: !isCurrentEventActive ? "Checked-In" : "Need Verification", 
      value: guests.filter((g: any) => g.rsvpStatus === (!isCurrentEventActive ? "Checked-In" : "Need Verification")).length, 
      target: !isCurrentEventActive ? "Checked-In" : "Need Verification", 
      icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/20" 
    },
  ];

  return (
    <main className="min-h-screen w-full bg-[#050505] p-3 sm:p-6 md:p-10 relative text-white overflow-x-hidden font-sans">
      <style dangerouslySetInnerHTML={{__html: ` @media print { body { background: white !important; color: black !important; padding: 0 !important; } .no-print { display: none !important; } .table-container { border: 1px solid #ccc !important; box-shadow: none !important; } th, td { color: black !important; border-bottom: 1px solid #eee !important; padding: 12px !important; } .print-badge { border: none !important; background: none !important; font-weight: bold !important; } } `}} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-black to-black -z-10 fixed no-print" />

      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
        
        <div className="flex flex-col gap-5 no-print bg-white/[0.02] border border-white/5 p-4 sm:p-6 rounded-[2rem] shadow-2xl backdrop-blur-md">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {view !== "Overview" && (
                <button onClick={() => setView("Overview")} className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5 border border-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">
                {view === "Overview" ? "Dashboard" : view === "Settings" ? "Platform Settings" : view === "CRM" ? "Master Database" : `${view} List`}
              </h1>
            </div>

            {view !== "CRM" && (
              <div className="bg-black/50 border border-white/10 rounded-xl pl-3 pr-2 py-1.5 flex items-center gap-2 shadow-inner w-fit min-w-[200px] mt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <select 
                  value={activeEventId} 
                  onChange={(e) => {
                    setActiveEventId(e.target.value);
                    localStorage.setItem("adminActiveEventId", e.target.value); 
                  }} 
                  className="bg-transparent text-sm outline-none cursor-pointer font-medium text-neutral-300 focus:text-white w-full appearance-none"
                >
                  {!isCurrentEventActive ? (
                    <>
                      <optgroup label="🔒 Viewing Past Event" className="text-red-400 bg-neutral-900 font-bold">
                         <option value={activeEventId} className="text-white font-medium">
                           {completedEvents.find((e: any) => e.eventId === activeEventId)?.mainTitle} ({activeEventId})
                         </option>
                      </optgroup>
                      {activeEvents.length > 0 && (
                        <optgroup label="🟢 Active & Upcoming" className="text-green-500 bg-neutral-900 font-bold">
                          {activeEvents.map((e) => <option key={e.eventId} value={e.eventId} className="text-white font-medium">{e.mainTitle} ({e.eventId})</option>)}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <>
                      {activeEvents.length === 0 && <option value="">No Active Events</option>}
                      {activeEvents.length > 0 && (
                        <optgroup label="🟢 Active & Upcoming" className="text-green-500 bg-neutral-900 font-bold">
                          {activeEvents.map((e) => <option key={e.eventId} value={e.eventId} className="text-white font-medium">{e.mainTitle} ({e.eventId})</option>)}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            {view !== "Settings" && (
              <div className="relative flex-grow sm:flex-grow-0 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="text" placeholder={view === "CRM" ? "Search CRM..." : "Search Guests..."} className="bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-500/50 w-full transition-colors" onChange={(e) => view === "CRM" ? setCrmSearchQuery(e.target.value) : setSearchQuery(e.target.value)} />
              </div>
            )}
            
            {view !== "Overview" && view !== "Settings" && view !== "CRM" && (
              <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-500/20 no-print transition-all"><Printer className="w-4 h-4" /> Export</button>
            )}

            {view !== "CRM" && <button onClick={() => router.push("/admin/manage-events")} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-all"><LayoutDashboard className="w-4 h-4" /> Manage Events</button>}
            {view !== "CRM" && <button onClick={() => setView("CRM")} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-all"><Database className="w-4 h-4" /> CRM</button>}
            {view !== "CRM" && isCurrentEventActive && <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]"><ScanLine className="w-4 h-4" /> Scan</button>}
            {view !== "CRM" && <button onClick={() => router.push(`/admin/tables?eventId=${activeEventId}`)} className="flex items-center gap-1.5 bg-amber-500 text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">Tables</button>}
            
            <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

            {view !== "CRM" && <button onClick={() => setView("Settings")} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors" title="Settings"><Settings className="w-4 h-4 text-neutral-400" /></button>}
            <button onClick={handleLogout} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 text-red-400 transition-all" title="Logout"><LogOut className="w-4 h-4" /></button>

            {view !== "CRM" && isCurrentEventActive && (
              <button onClick={() => { setIsEditing(false); setIsSearchCrmMode(false); setCrmAddSearchQuery(""); setFormData({ _id: "", id: "", firstName: "", lastName: "", mobileNumber: "", amount: 0, rsvpStatus: "Pending", eventId: activeEventId, entryType: "Stag", partnerFirstName: "", partnerLastName: "", partnerMobile: "", isSubordinate: false, hostId: "" }); setIsModalOpen(true); }} className="flex items-center gap-1.5 w-full sm:w-auto bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 justify-center mt-2 sm:mt-0 transition-all ml-auto"><Plus className="w-4 h-4" /> Add Guest</button>
            )}
          </div>
        </div>

        {view !== "CRM" && !isCurrentEventActive && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-4 no-print shadow-lg">
             <div className="bg-red-500/20 p-2.5 rounded-full flex-shrink-0"><Lock className="w-5 h-5 text-red-400" /></div>
             <div>
                <h3 className="text-red-400 font-bold text-sm sm:text-base uppercase tracking-wider">Event Locked</h3>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1 leading-relaxed">This event commenced over 18 hours ago and is now permanently locked. You can only view and export the data.</p>
             </div>
          </motion.div>
        )}

        {/* 🚀 SETTINGS VIEW */}
        {view === "Settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print animate-in fade-in duration-500">
            
            <GlassCard className="p-6 sm:p-8 border-white/10 rounded-[2rem] bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-6 text-amber-400 border-b border-white/5 pb-4">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-xl font-bold text-white tracking-wide">Event Content</h2>
              </div>
              <div className="space-y-5 text-white">
                <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Title</label><input disabled={!isCurrentEventActive} value={settings.mainTitle} onChange={(e) => setSettings({...settings, mainTitle: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Headline</label><input disabled={!isCurrentEventActive} value={settings.mainHeadline} onChange={(e) => setSettings({...settings, mainHeadline: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Date</label><input disabled={!isCurrentEventActive} value={settings.eventDate} onChange={(e) => setSettings({...settings, eventDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                  <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Time</label><input disabled={!isCurrentEventActive} value={settings.eventTime} onChange={(e) => setSettings({...settings, eventTime: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                </div>
                <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Venue</label><input disabled={!isCurrentEventActive} value={settings.eventVenue} onChange={(e) => setSettings({...settings, eventVenue: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Vibe</label><input disabled={!isCurrentEventActive} value={settings.eventVibe} onChange={(e) => setSettings({...settings, eventVibe: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-white/10">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Stag Price (₹)</label>
                    <input type="number" disabled={!isCurrentEventActive} value={settings.stagPrice || ""} onChange={(e) => setSettings({...settings, stagPrice: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">Couple Price (₹)</label>
                    <input type="number" disabled={!isCurrentEventActive} value={settings.couplePrice || ""} onChange={(e) => setSettings({...settings, couplePrice: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" />
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard className="p-6 sm:p-8 border-white/10 rounded-[2rem] bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-6 text-blue-400 border-b border-white/5 pb-4">
                  <IndianRupee className="w-5 h-5" />
                  <h2 className="text-xl font-bold text-white tracking-wide">Payment Setup</h2>
                </div>
                
                <div className="space-y-6 text-white">
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                     <label className="text-xs text-neutral-500 uppercase mb-3 block font-bold tracking-widest">Active Gateway</label>
                     <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => setSettings({...settings, paymentMode: "manual"})} 
                          disabled={!isCurrentEventActive}
                          className={`flex-1 py-3.5 rounded-xl text-xs uppercase font-bold tracking-widest transition-all border ${settings.paymentMode === "manual" ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-white/5 border-white/10 text-neutral-500 hover:text-white"}`}
                        >
                          Manual (QR/UPI)
                        </button>
                        <button 
                          onClick={() => setSettings({...settings, paymentMode: "razorpay"})} 
                          disabled={!isCurrentEventActive}
                          className={`flex-1 py-3.5 rounded-xl text-xs uppercase font-bold tracking-widest transition-all border ${settings.paymentMode === "razorpay" ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2" : "bg-white/5 border-white/10 text-neutral-500 hover:text-white flex items-center justify-center gap-2"}`}
                        >
                          <CreditCard className="w-4 h-4"/> Auto (Razorpay)
                        </button>
                     </div>
                     <p className="text-[10px] text-neutral-500 mt-3 text-center">
                       {settings.paymentMode === "manual" ? "Guests will upload screenshots for admin verification." : "Payments will be automatically captured and verified instantly."}
                     </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {settings.paymentMode === "manual" ? (
                      <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                        <div><label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">UPI ID</label><input disabled={!isCurrentEventActive} value={settings.upiId} onChange={(e) => setSettings({...settings, upiId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 outline-none focus:border-amber-500/50 disabled:opacity-50 transition-colors" /></div>
                        <div>
                          <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1.5 block">QR Code</label>
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="w-28 h-28 flex-shrink-0 bg-black/80 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                              {settings.qrCode ? <img src={settings.qrCode} className="w-full h-full object-contain p-2" /> : <X className="text-neutral-600" />}
                            </div>
                            {isCurrentEventActive && (
                              <label className="flex-1 w-full h-28 border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center transition-colors"><UploadCloud className="w-6 h-6 mb-2 text-neutral-500" /><span className="text-xs text-neutral-400 font-medium">Upload New QR</span><input type="file" className="hidden" onChange={handleQrUpload} /></label>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="razorpay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                        <div>
                           <label className="text-xs text-blue-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5"><Sparkles className="w-3 h-3"/> Razorpay Key ID</label>
                           <input type="text" disabled={!isCurrentEventActive} value={settings.razorpayKey} onChange={(e) => setSettings({...settings, razorpayKey: e.target.value})} className="w-full bg-blue-900/10 border border-blue-500/30 rounded-xl p-3.5 outline-none focus:border-blue-500/50 text-white disabled:opacity-50 font-mono text-sm shadow-inner" />
                        </div>
                        <div>
                           <label className="text-xs text-blue-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5"><Lock className="w-3 h-3"/> Razorpay Key Secret</label>
                           <input type="password" disabled={!isCurrentEventActive} value={settings.razorpaySecret} onChange={(e) => setSettings({...settings, razorpaySecret: e.target.value})} className="w-full bg-blue-900/10 border border-blue-500/30 rounded-xl p-3.5 outline-none focus:border-blue-500/50 text-white disabled:opacity-50 font-mono text-sm shadow-inner" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
              
              <button onClick={saveSettings} disabled={savingSettings || !isCurrentEventActive} className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-3 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed">
                {savingSettings ? <Loader2 className="animate-spin w-5 h-5" /> : isCurrentEventActive ? "Save Settings" : "Event Locked"}
              </button>
            </div>
          </div>
        )}

        {/* 🚀 STATS GRID */}
        {view === "Overview" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 no-print animate-in fade-in duration-500">
            {stats.map((stat: any, i: number) => (
              <div key={i} onClick={() => setView(stat.target)} className="cursor-pointer h-full">
                <GlassCard className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/5 transition-all group h-full rounded-2xl border-white/5 bg-white/[0.02]">
                  <div className="mb-3 sm:mb-0">
                    <p className="text-neutral-500 text-[10px] sm:text-xs uppercase tracking-widest mb-1 font-bold group-hover:text-neutral-300 transition-colors">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color} flex-shrink-0`}><stat.icon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                </GlassCard>
              </div>
            ))}
            
            <GlassCard className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-purple-500/5 border-purple-500/20 h-full rounded-2xl cursor-default">
              <div className="mb-3 sm:mb-0">
                <p className="text-purple-400/70 text-[10px] sm:text-xs uppercase tracking-widest mb-1 font-bold">Revenue</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-400">₹{revenueReceived}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 flex-shrink-0"><IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" /></div>
            </GlassCard>
          </div>
        )}

        {/* 🚀 GLOBAL CRM */}
        {view === "CRM" && (
          <GlassCard className="p-0 overflow-hidden table-container border-white/5 bg-white/[0.01] rounded-2xl animate-in fade-in duration-700 shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-white/5 font-medium no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-500/5">
              <span className="text-sm sm:text-base text-indigo-400 font-bold tracking-wide flex items-center gap-2"><Database className="w-5 h-5"/> Global Customer Data</span>
              {crmLoading && <Loader2 className="animate-spin w-4 h-4 text-indigo-400 flex-shrink-0" />}
            </div>
            
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                <thead className="text-[10px] text-neutral-500 uppercase tracking-widest border-b border-white/5 bg-black/40 font-bold">
                  <tr><th className="p-4 pl-6">Mobile Number</th><th className="p-4">Name</th><th className="p-4">LTV (Value)</th><th className="p-4">Events</th><th className="p-4">Status</th><th className="p-4 text-center pr-6">Actions</th></tr>
                </thead>
                <tbody className="text-sm">
                  {filteredCrmData.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-neutral-500 italic">No CRM records found.</td></tr>
                  ) : (
                    filteredCrmData.map((guest: any, idx: number) => (
                      <Fragment key={idx}>
                        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 pl-6 font-mono font-medium text-white">{guest.mobileNumber}</td>
                          <td className="p-4 capitalize text-neutral-300 font-medium">{guest.firstName} {guest.lastName}</td>
                          <td className="p-4 text-emerald-400 font-mono font-bold">₹{guest.totalSpent}</td>
                          <td className="p-4"><span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-300">{guest.eventsAttended?.length || 0}</span></td>
                          <td className="p-4">
                            {guest.isBlacklisted ? <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 w-fit"><ShieldAlert className="w-3 h-3"/> Banned</span> : <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 w-fit"><UserCheck className="w-3 h-3"/> Active</span>}
                          </td>
                          <td className="p-4 pr-6 flex justify-center items-center gap-2">
                            <button onClick={() => setExpandedCrmGuest(expandedCrmGuest === guest.mobileNumber ? null : guest.mobileNumber)} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"><History className="w-3.5 h-3.5"/> History {expandedCrmGuest === guest.mobileNumber ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}</button>
                            <button onClick={() => toggleBlacklist(guest.mobileNumber, guest.isBlacklisted)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${guest.isBlacklisted ? 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700' : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'}`}>{guest.isBlacklisted ? "Unban" : <><UserX className="w-3.5 h-3.5"/> Ban</>}</button>
                            <button onClick={() => handleCrmDelete(guest.mobileNumber, guest.firstName)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300" title="Delete record"><Trash2 className="w-3.5 h-3.5"/></button>
                          </td>
                        </tr>
                        
                        <AnimatePresence>
                          {expandedCrmGuest === guest.mobileNumber && (
                            <tr className="bg-black/60 border-b border-white/5">
                              <td colSpan={6} className="p-0">
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                  <div className="p-6 sm:p-8">
                                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History className="w-4 h-4"/> Event Attendance History</h4>
                                    {guest.eventsAttended?.length === 0 ? <p className="text-sm text-neutral-500 italic">No events recorded.</p> : (
                                      <div className="space-y-3">
                                        {guest.eventsAttended.map((evt: any, i: number) => {
                                          const evtDetails = allEvents.find((e: any) => e.eventId === evt.eventId);
                                          return (
                                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors">
                                              <div className="flex flex-col"><span className="text-sm font-bold text-white tracking-wide">{evtDetails ? evtDetails.mainTitle : evt.eventId}</span><span className="text-xs text-neutral-500 mt-1 font-mono">{evtDetails?.eventDate ? `${evtDetails.eventDate} • ${evtDetails.eventTime || ''}` : 'Date TBA'}</span></div>
                                              <div className="flex gap-2 items-center flex-wrap">
                                                <span className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold border ${evt.status === 'Confirmed' || evt.status === 'Checked-In' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>{evt.status}</span>
                                                {evt.isCaptain && <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5"><Crown className="w-3 h-3"/> Captain</span>}
                                                {evt.isSubordinate && <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold bg-white/10 text-neutral-300 border border-white/20 flex items-center gap-1.5"><User className="w-3 h-3"/> Pax</span>}
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
        
        {/* 🚀 GUEST LIST TABLE */}
        {view !== "Settings" && view !== "CRM" && (
          <GlassCard className="p-0 overflow-hidden table-container border-white/5 bg-white/[0.01] rounded-2xl animate-in fade-in duration-700 shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-white/5 font-medium no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02]">
              <span className="text-sm sm:text-base font-bold text-white tracking-wide">Displaying {filteredGuests.length} Guests</span>
              {loading && <Loader2 className="animate-spin w-5 h-5 text-amber-500 flex-shrink-0" />}
            </div>
            
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                <thead className="text-[10px] text-neutral-500 uppercase tracking-widest border-b border-white/5 bg-black/40 font-bold">
                  <tr><th className="p-4 pl-6">Guest Profile</th><th className="p-4 no-print">Contact</th><th className="p-4 no-print">Amount</th><th className="p-4">Entry Code</th><th className="p-4">Status</th><th className="p-4 text-center pr-6 no-print">Quick Actions</th></tr>
                </thead>
                <tbody className="text-sm">
                  {filteredGuests.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-neutral-500 italic">No guests found for this criteria.</td></tr>
                  ) : (
                    filteredGuests.map((guest: any) => (
                      <tr key={guest.id || guest._id || Math.random()} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${guest.isSubordinate ? 'bg-white/[0.01]' : ''}`}>
                        
                        <td className="p-4 pl-6 capitalize font-medium">
                          <div className="flex items-center gap-3">
                            {guest.isSubordinate && <div className="w-4 h-4 border-l-2 border-b-2 border-neutral-700 rounded-bl ml-2 opacity-50"></div>}
                            <span className="text-white">{guest.firstName} {guest.lastName}</span>
                            
                            {/* 🚀 ELITE BADGES */}
                            <div className="flex gap-1.5 items-center flex-wrap">
                              {guest.isCaptain && guest.entryType !== 'Couple' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm"><Crown className="w-3 h-3"/> Captain</span>}
                              {guest.entryType === 'Couple' && !guest.isSubordinate && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm"><Heart className="w-3 h-3"/> Couple</span>}
                              {guest.entryType === 'Group' && !guest.isSubordinate && !guest.isCaptain && <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm"><Users className="w-3 h-3"/> Group Lead</span>}
                              
                              {guest.isSubordinate && guest.source === 'couple_partner' && <span className="bg-rose-500/5 text-rose-300 border border-rose-500/10 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1"><Heart className="w-3 h-3"/> Partner</span>}
                              {guest.isSubordinate && guest.source !== 'couple_partner' && <span className="bg-white/5 text-neutral-400 border border-white/10 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Pax</span>}
                              {(!guest.entryType || guest.entryType === 'Stag') && !guest.isSubordinate && !guest.isCaptain && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm"><User className="w-3 h-3"/> Stag</span>}
                              
                              {/* 🚀 THE NEW TABLE BADGE */}
                              {guest.tableId && (
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm">
                                  T: {tables.find((t: any) => t.id === guest.tableId)?.tableName || "VIP"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-neutral-400 font-mono no-print text-xs">{guest.mobileNumber}</td>
                        <td className="p-4 text-emerald-400 font-mono font-bold no-print">{guest.isSubordinate ? <span className="text-neutral-600">-</span> : guest.isCaptain && guest.tableId ? `₹${tables.find((t: any) => t.id === guest.tableId)?.minSpend || guest.amount || 0}` : `₹${guest.amount || 0}`}</td>
                        <td className="p-4 font-mono text-amber-400 font-bold tracking-widest bg-amber-500/5 px-3 rounded-lg w-max inline-block mt-2 border border-amber-500/10">{guest.entryCode || "N/A"}</td>
                        <td className="p-4">
                          <span className={`print-badge px-2.5 py-1 rounded-md text-[10px] border whitespace-nowrap font-bold tracking-widest uppercase shadow-sm
                            ${guest.rsvpStatus === 'Confirmed' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 
                              guest.rsvpStatus === 'Checked-In' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' :
                              guest.rsvpStatus === 'Need Verification' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 animate-pulse' :
                              guest.rsvpStatus === 'Failed' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                              guest.rsvpStatus === 'Not Attended' ? 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}
                          >{guest.rsvpStatus}</span>
                        </td>
                        <td className="p-4 pr-6 flex justify-center items-center gap-1.5 no-print">
                           {(guest.rsvpStatus === 'Need Verification' || guest.screenshot) && !guest.isSubordinate && isCurrentEventActive && (
                             <button onClick={() => openVerifyModal(guest)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors" title="Verify Proof"><Eye className="w-4 h-4"/></button>
                           )}
                           <button onClick={() => openWhatsApp(guest)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-colors" title="Send WhatsApp Update"><MessageCircle className="w-4 h-4"/></button>
                           {(guest.rsvpStatus === 'Confirmed' || guest.rsvpStatus === 'Checked-In') && (
                             <button onClick={() => downloadVIPPass(guest)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-black transition-colors" title="Download VIP Pass"><Ticket className="w-4 h-4"/></button>
                           )}
                           {isCurrentEventActive && (
                             <button onClick={() => openEditModal(guest)} className="p-2 bg-white/5 text-neutral-300 rounded-lg hover:bg-white hover:text-black transition-colors" title="Edit"><Edit className="w-4 h-4"/></button>
                           )}
                           {isCurrentEventActive && (
                             <button onClick={() => handleDelete(guest.id || guest._id, guest.firstName)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors" title="Delete"><Trash2 className="w-4 h-4"/></button>
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
        {/* 🚀 FIXED: Scanner Component - Clean and Robust */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md no-print">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
              <button onClick={() => { setIsScannerOpen(false); setScannedResult(null); }} className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"><X className="w-5 h-5"/></button>
              {!scannedResult ? (
                <div className="p-6">
                  <h2 className="text-xl text-center text-white font-bold tracking-wide mb-6">Scan Entry Pass</h2>
                  
                  <div className="rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.15)] relative bg-black aspect-square flex items-center justify-center w-full min-h-[300px]">
                    <Scanner 
                      onScan={(result) => handleScan(result)} 
                    />
                  </div>
                  
                  <p className="text-center text-neutral-500 text-sm mt-4 animate-pulse">Position QR Code within the frame...</p>
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center bg-gradient-to-b from-neutral-900 to-black">
                  {scannedResult.error ? (
                    <div><div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20"><X className="w-10 h-10 text-red-500"/></div><h2 className="text-2xl text-white font-bold">Invalid Pass</h2><p className="text-red-400 font-mono mt-2">{scannedResult.code}</p><p className="text-neutral-400 mt-2 text-sm">This code does not exist in the database.</p></div>
                  ) : (
                    <div>
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20"><CheckCircle2 className="w-10 h-10 text-green-500"/></div>
                      <h2 className="text-2xl sm:text-3xl text-white font-bold capitalize">{scannedResult.firstName} {scannedResult.lastName}</h2>
                      <div className="bg-white/5 py-2 px-4 rounded-lg inline-block mt-3 border border-white/10"><p className="text-amber-400 font-mono tracking-widest text-lg font-bold">{scannedResult.entryCode}</p></div>
                      <p className={`mt-4 uppercase tracking-widest text-xs font-bold ${scannedResult.rsvpStatus === 'Confirmed' ? 'text-green-400' : scannedResult.rsvpStatus === 'Checked-In' ? 'text-purple-400' : 'text-red-400'}`}>Status: {scannedResult.rsvpStatus}</p>
                      {scannedResult.rsvpStatus !== 'Checked-In' && <button onClick={() => markCheckedIn(scannedResult)} className="mt-8 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 text-lg">Mark as Checked-In</button>}
                    </div>
                  )}
                  <button onClick={() => setScannedResult(null)} className="mt-6 text-neutral-400 hover:text-white transition-colors uppercase tracking-widest text-xs">Scan Another Pass</button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-md">
              <GlassCard className="p-6 sm:p-8 relative border-white/10 rounded-[2rem] bg-[#0a0a0a]">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full"><X className="w-5 h-5"/></button>
                <h2 className="text-xl font-bold mb-6 text-white tracking-wide">{isEditing ? "Edit Guest Details" : "Add New Guest"}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  {isSearchCrmMode ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input autoFocus placeholder="Search CRM by Name or Mobile..." className="w-full bg-black border border-indigo-500/30 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500 transition-all shadow-inner" value={crmAddSearchQuery} onChange={(e) => setCrmAddSearchQuery(e.target.value)} />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                        {modalCrmResults.length === 0 && crmAddSearchQuery && <p className="text-xs text-neutral-500 text-center py-4 bg-white/5 rounded-xl border border-white/5 border-dashed">No guest found in CRM.</p>}
                        {modalCrmResults.map((c: any) => (
                          <div key={c.mobileNumber} onClick={() => { setFormData({...formData, firstName: c.firstName, lastName: c.lastName, mobileNumber: c.mobileNumber}); setIsSearchCrmMode(false); setCrmAddSearchQuery(""); }} className="p-3 bg-white/[0.03] hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 rounded-xl cursor-pointer flex justify-between items-center transition-all group">
                            <div>
                              <p className="text-sm font-bold text-white capitalize group-hover:text-indigo-300">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-neutral-400 font-mono mt-0.5">{c.mobileNumber}</p>
                            </div>
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                               <PlusCircle className="w-4 h-4 text-indigo-400 group-hover:text-black" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setIsSearchCrmMode(false)} className="w-full py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/5 transition-all mt-2">Cancel Search</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-4 bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
                        <button type="button" onClick={() => setFormData({...formData, entryType: "Stag"})} className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1.5 ${formData.entryType === "Stag" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}><User className="w-3 h-3"/> Stag</button>
                        <button type="button" onClick={() => setFormData({...formData, entryType: "Couple"})} className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1.5 ${formData.entryType === "Couple" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}><Heart className="w-3 h-3"/> Couple</button>
                        <button type="button" onClick={() => setFormData({...formData, entryType: "Group"})} className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1.5 ${formData.entryType === "Group" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}><Users className="w-3 h-3"/> Group</button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input required placeholder="First Name" className="bg-black/50 border border-white/10 rounded-xl p-3.5 w-full text-sm outline-none focus:border-amber-500/50 text-white shadow-inner" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                        <input required placeholder="Last Name" className="bg-black/50 border border-white/10 rounded-xl p-3.5 w-full text-sm outline-none focus:border-amber-500/50 text-white shadow-inner" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                      </div>
                      <input required placeholder="Mobile Number" className="bg-black/50 border border-white/10 rounded-xl p-3.5 w-full text-sm outline-none focus:border-amber-500/50 text-white shadow-inner" value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} />

                      <AnimatePresence>
                        {formData.entryType === "Couple" && !isEditing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-3 overflow-hidden">
                            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">Partner Details</p>
                            <div className="grid grid-cols-2 gap-4">
                              <input type="text" required={formData.entryType === "Couple"} value={formData.partnerFirstName} onChange={(e) => setFormData({...formData, partnerFirstName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 shadow-inner" placeholder="First Name" />
                              <input type="text" required={formData.entryType === "Couple"} value={formData.partnerLastName} onChange={(e) => setFormData({...formData, partnerLastName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 shadow-inner" placeholder="Last Name" />
                            </div>
                            <input type="tel" maxLength={10} required={formData.entryType === "Couple"} value={formData.partnerMobile} onChange={(e) => setFormData({...formData, partnerMobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 shadow-inner" placeholder="Partner Mobile Number" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest ml-1 mb-1.5 block">Amount (₹)</label>
                          <input type="number" required className="bg-black/50 border border-white/10 rounded-xl p-3.5 w-full text-sm outline-none focus:border-amber-500/50 text-white shadow-inner" value={formData.amount} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest ml-1 mb-1.5 block">Status</label>
                          <select className="bg-black/80 border border-white/10 rounded-xl p-3.5 w-full text-sm outline-none focus:border-amber-500/50 text-white shadow-inner appearance-none" value={formData.rsvpStatus} onChange={(e) => setFormData({...formData, rsvpStatus: e.target.value})}>
                            <option value="Pending">Pending</option>
                            <option value="Need Verification">Need Verification</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Checked-In">Checked-In</option>
                            <option value="Failed">Failed</option>
                            <option value="Not Attended">Not Attended</option>
                          </select>
                        </div>
                      </div>

                      {!isEditing && (
                        <div className="pt-3 border-t border-white/5 mt-5">
                          <button type="button" onClick={() => { setIsSearchCrmMode(true); fetchCrmData(); }} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-bold uppercase tracking-widest transition-colors">
                            <Database className="w-3.5 h-3.5" /> Import from Master CRM
                          </button>
                        </div>
                      )}
                      
                      <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black py-4 rounded-xl font-black uppercase tracking-widest mt-6 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Save Guest Record"}
                      </button>
                    </>
                  )}
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* 🚀 CLASSIC VERIFY PAYMENT MODAL RESTORED */}
        {isVerifyModalOpen && selectedGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsVerifyModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl">
              <GlassCard className="p-6 sm:p-8 relative overflow-hidden flex flex-col items-center border-white/10 w-full rounded-[2rem] bg-[#0a0a0a]">
                <button onClick={() => setIsVerifyModalOpen(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white bg-white/5 p-2 rounded-full z-20 transition-colors"><X className="w-5 h-5"/></button>
                <h2 className="text-xl font-bold mb-1 text-white tracking-wide text-center">Verify Payment Proof</h2>
                <p className="text-sm text-neutral-400 mb-6 text-center">{selectedGuest.firstName} {selectedGuest.lastName} • Total: <strong className="text-white">₹{selectedGuest.amount}</strong></p>
                
                <div className="w-full text-left bg-white/[0.02] p-5 rounded-2xl mb-6 border border-white/5">
                  <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5"/> Transaction Status</p>
                  <div className="flex justify-between items-center mb-2 pb-3 border-b border-white/5">
                     <span className="text-zinc-400 text-sm font-medium">Total Expected Value:</span>
                     <span className="text-white font-mono font-bold text-lg">₹{selectedGuest.amount}</span>
                  </div>
                  
                  <div className="w-full overflow-y-auto pr-1 space-y-3 mt-4 max-h-[40vh] hide-scrollbar">
                    {selectedGuest.paymentHistory && selectedGuest.paymentHistory.length > 0 ? (
                      selectedGuest.paymentHistory.map((hist: any, i: number) => (
                        <div key={i} className={`flex gap-3 sm:gap-4 items-center p-3 rounded-xl border ${hist.method === 'razorpay_auto' ? 'bg-blue-900/10 border-blue-500/20' : 'bg-black/40 border-white/5'}`}>
                           
                           {hist.method === 'razorpay_auto' ? (
                             <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30 flex-shrink-0 shadow-inner">
                               <CreditCard className="w-6 h-6" />
                             </div>
                           ) : (
                             <img src={hist.screenshot} className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0 shadow-sm" />
                           )}
                           
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-zinc-500 font-medium truncate mb-1">{new Date(hist.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              <p className="text-sm text-emerald-400 font-mono font-bold">+ ₹{hist.amountPaid}</p>
                              <p className="text-[10px] uppercase text-amber-500 mt-1 tracking-widest font-bold truncate">
                                {hist.type} Pass {hist.method === 'razorpay_auto' && <span className="text-blue-400 ml-1">#{(hist.paymentId || '').slice(-6)}</span>}
                              </p>
                           </div>
                           
                           {hist.method !== 'razorpay_auto' && hist.screenshot && (
                             <button 
                               onClick={() => openBase64InNewTab(hist.screenshot)} 
                               className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10 transition-all whitespace-nowrap flex-shrink-0 font-bold tracking-wide"
                             >
                                <ExternalLink className="w-3 h-3" /> <span className="hidden sm:inline">View</span>
                             </button>
                           )}
                        </div>
                      ))
                    ) : (
                      <div className="w-full">
                         {selectedGuest.screenshot ? (
                            <div className="flex gap-3 sm:gap-4 items-center bg-black/40 p-3 rounded-xl border border-white/5">
                               <img src={selectedGuest.screenshot} className="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0 shadow-sm" />
                               <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-zinc-500 font-medium mb-1">Legacy Payment</p>
                                  <p className="text-sm text-emerald-400 font-mono font-bold">₹{selectedGuest.amount}</p>
                                  <p className="text-[10px] uppercase text-amber-500 mt-1 tracking-widest font-bold">{selectedGuest.entryType} Pass</p>
                               </div>
                               <button 
                                 onClick={() => openBase64InNewTab(selectedGuest.screenshot)} 
                                 className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10 transition-all whitespace-nowrap flex-shrink-0 font-bold tracking-wide"
                               >
                                  <ExternalLink className="w-3 h-3" /> <span className="hidden sm:inline">View</span>
                               </button>
                            </div>
                         ) : (
                           <p className="text-neutral-500 font-light italic text-sm text-center py-6 bg-black/20 rounded-xl border border-white/5 border-dashed">No payment record or screenshot provided.</p>
                         )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full mt-auto">
                  <button onClick={() => handleVerifyAction('Failed')} disabled={isUpdatingStatus} className="flex-1 w-full bg-red-500/10 text-red-400 border border-red-500/20 py-4 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest text-sm">Reject</button>
                  <button onClick={() => handleVerifyAction('Confirmed')} disabled={isUpdatingStatus} className="flex-1 w-full bg-green-500/10 text-green-400 border border-green-500/20 py-4 rounded-xl hover:bg-green-500 hover:text-white transition-all font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-none">Approve</button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 FIXED: Reliable PDF Pass Element */}
      <div className="fixed -top-[9999px] -left-[9999px] no-print opacity-0 pointer-events-none">
        <div id="admin-concert-ticket-export" className="flex w-[800px] h-[300px] bg-neutral-950 text-white font-sans overflow-hidden border border-amber-500/30 rounded-xl shadow-2xl relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black opacity-80"></div>
          <div className="w-[580px] p-8 flex flex-col justify-between relative z-10 border-r-2 border-dashed border-neutral-700">
             <div><h3 className="text-amber-500 tracking-[0.3em] uppercase text-xs font-bold mb-2">VIP ADMISSION</h3><h1 className="text-4xl font-black uppercase tracking-wider text-white drop-shadow-md">{settings.mainTitle || "THE INFINITY EVENT"}</h1><p className="text-neutral-400 mt-1 text-lg italic font-serif">{settings.mainHeadline || "Exclusive Access Only"}</p></div>
             <div><p className="text-neutral-500 text-xs uppercase tracking-widest mb-1">Admit One</p><h2 className="text-3xl font-bold uppercase tracking-wide text-white">{(downloadingGuest?.firstName || "Guest")} {(downloadingGuest?.lastName || "")}</h2></div>
             <div className="flex gap-10 border-t border-neutral-800 pt-5 mt-2">
                <div><p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Date</p><p className="font-bold text-white tracking-wide">{settings.eventDate || "TBA"}</p></div>
                <div><p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Time</p><p className="font-bold text-white tracking-wide">{settings.eventTime || "TBA"}</p></div>
                {downloadingGuest?.tableId && <div><p className="text-amber-500 text-xs uppercase tracking-wider mb-1">VIP Table</p><p className="font-bold text-amber-400 tracking-wide">{tables.find((t: any) => t.id === downloadingGuest?.tableId)?.tableName || "Reserved"}</p></div>}
             </div>
          </div>
          <div className="w-[220px] bg-amber-500/5 p-6 flex flex-col items-center justify-center relative z-10">
             <p className="text-amber-500 text-sm font-bold tracking-[0.2em] mb-4 text-center">SCAN AT GATE</p>
             <div className="bg-white p-2 rounded-xl mb-4 shadow-[0_0_15px_rgba(251,191,36,0.2)]"><QRCodeSVG value={downloadingGuest?.entryCode || "000000"} size={100} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} /></div>
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 text-center">Entry Code</p>
             <p className="text-xl font-mono font-bold text-white tracking-[0.1em] text-center">{downloadingGuest?.entryCode || "N/A"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}