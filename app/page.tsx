"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import EventDetails from "@/components/organisms/EventDetails";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export default function GuestInvitationPage() {
  const [settings, setSettings] = useState<any>(null);

  // 🚀 ADMIN SETTINGS FETCH KARNA
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: "no-store" });
        const result = await res.json();
        if (result.success && result.data) {
          setSettings(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-sm tracking-[0.3em] text-neutral-400 uppercase mb-6"
        >
          {/* 🚀 DYNAMIC TITLE */}
          {settings?.mainTitle || "You are cordially invited"}
        </motion.p>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className="text-4xl md:text-6xl font-light tracking-tight mb-8 max-w-4xl whitespace-pre-line"
        >
          {/* 🚀 DYNAMIC HEADLINE */}
          {settings?.mainHeadline || "A Private Gathering"}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="h-24 w-[1px] bg-gradient-to-b from-white/0 via-white/50 to-white/0 mb-8"
        />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-12 flex flex-col items-center animate-bounce"
        >
          <span className="text-xs tracking-widest text-neutral-500 mb-2">DISCOVER</span>
          <ChevronDown className="text-neutral-500 w-4 h-4" />
        </motion.div>
      </section>

      {/* --- DETAILS SECTION --- */}
      {/* 🚀 SETTINGS PASS KAR RAHE HAIN */}
      <EventDetails settings={settings} />

      {/* --- RSVP CTA SECTION --- */}
      <section className="w-full py-24 flex flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl font-light mb-8">Kindly verify your identity to RSVP</h2>
          
          <Link href="/verify">
            <button className="group relative px-8 py-4 bg-white text-neutral-950 font-medium rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">
                Unlock Invitation
              </span>
              <div className="absolute inset-0 bg-neutral-200 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </button>
          </Link>
        </motion.div>
      </section>
    </main>
  );
}