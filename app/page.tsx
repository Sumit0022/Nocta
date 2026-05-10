"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Ticket, Disc3, Sparkles, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-amber-500/30">
      
      {/* 🌌 MODERN AMBIENT GLOWS (Sleek, not overpowering) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-600/10 blur-[150px] mix-blend-screen pointer-events-none -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-600/5 blur-[150px] mix-blend-screen pointer-events-none -z-10" />

      {/* 🧭 SLEEK FLOATING NAVBAR */}
      <nav className="w-full absolute top-0 left-0 z-50 flex justify-center pt-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <img 
            src="/moksha-logo.png" 
            alt="Moksha The Social Club" 
            className="h-16 md:h-20 object-contain drop-shadow-2xl"
          />
        </motion.div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center pt-20">
        
        {/* Modern Pill Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="mb-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
        >
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Bareilly&apos;s Premium Social Club
          </span>
        </motion.div>

        {/* Modern Bold Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className="text-5xl sm:text-7xl md:text-[6rem] font-black tracking-tighter leading-[0.9] mb-6"
        >
          WHERE SPIRITS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500">
            UNWIND.
          </span>
        </motion.h1>

        {/* Minimal Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="max-w-xl text-sm md:text-base text-zinc-400 font-medium tracking-wide leading-relaxed mb-10"
        >
          Immerse yourself in electrifying DJ sets, modern gastronomy, and an unparalleled VIP experience. The night is yours to claim.
        </motion.p>

        {/* Modern Interactive Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={() => router.push('/verify')}
            className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold uppercase tracking-[0.1em] text-sm overflow-hidden transition-transform active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Ticket className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Get VIP Access</span>
            <ChevronRight className="w-4 h-4 relative z-10 transform group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a 
            href="https://www.instagram.com/moksha_thesocialclub?igsh=b2RtYTV4YTNwaW1t"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-all active:scale-95 backdrop-blur-md"
          >
            {/* Safe SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
            Follow The Vibe
          </a>
        </motion.div>
      </div>

      {/* 💎 MODERN GLASSMORPHISM CARDS */}
      <div className="w-full max-w-6xl mx-auto px-6 pb-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { icon: Disc3, title: "Sonic Experience", desc: "State-of-the-art acoustics and curated DJ line-ups for the ultimate groove." },
            { icon: Sparkles, title: "Modern Luxury", desc: "Plush interiors, ambient lighting, and an atmosphere built for the elite." },
            { icon: Ticket, title: "Frictionless Entry", desc: "Skip the lines with our dynamic digital ticketing and OTP verification." }
          ].map((feature) => (
            <div 
              key={feature.title} 
              className="group p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors duration-500 backdrop-blur-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 transition-transform duration-500 ease-out">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">{feature.title}</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

    </main>
  );
}