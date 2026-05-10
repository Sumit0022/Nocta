"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, Ticket, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full relative bg-neutral-950 text-white overflow-hidden selection:bg-amber-500/30 font-sans">
      
      {/* 🌌 BACKGROUND GLOW EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-neutral-950 to-black -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/15 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />

      {/* 🧭 MINIMALIST NAVBAR */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-50 relative">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-3xl font-black tracking-[0.3em] uppercase italic text-white drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            NOCTA
          </h1>
        </motion.div>
        <motion.button 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          onClick={() => router.push('/admin/login')}
          className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 hover:text-amber-400 transition-all font-black border border-transparent hover:border-amber-500/30 px-4 py-2 rounded-full"
        >
          Command Center
        </motion.button>
      </nav>

      {/* 🚀 HERO SECTION */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-32 relative z-10 flex flex-col items-center justify-center min-h-[75vh] text-center">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.2, delayChildren: 0.3 }}
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/5 backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.1)]"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400">The New Era of Nightlife</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-5xl md:text-[5.5rem] font-black uppercase tracking-tighter leading-[0.85] mb-8 drop-shadow-2xl"
          >
            Curating The <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-yellow-600">
              Elite Experience
            </span>
          </motion.h1>

          {/* Subheadline (No apostrophes = No ESLint Errors) */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-neutral-400 md:text-lg max-w-2xl font-medium tracking-wide mb-12 leading-relaxed opacity-80"
          >
            Step into a world of exclusive events, secret locations, and seamless access. Nocta is the premier portal for the most anticipated gatherings in town.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto"
          >
            <button 
              onClick={() => router.push('/verify')}
              className="w-full sm:w-auto px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 text-sm"
            >
              <Ticket className="w-5 h-5" />
              Claim Your VIP Pass
            </button>
          </motion.div>
        </motion.div>

        {/* 💎 FEATURES SECTION (GLASSMORPHISM) */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-5xl"
        >
          {[
            { icon: ShieldCheck, title: "Secure Entry", desc: "Military-grade OTP verification & dynamic QR codes." },
            { icon: Sparkles, title: "Premium Events", desc: "Handpicked, highly-curated multi-city experiences." },
            { icon: Zap, title: "Seamless Flow", desc: "Lightning-fast check-ins and zero queues at the gate." }
          ].map((feat) => (
            <div key={feat.title} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-500 backdrop-blur-xl text-left group hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(251,191,36,0.05)]">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                <feat.icon className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{feat.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed font-medium">{feat.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}