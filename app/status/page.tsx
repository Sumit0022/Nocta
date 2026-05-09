"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/atoms/GlassCard";
import { Clock, ShieldCheck, ArrowLeft } from "lucide-react";

export default function StatusPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-10 text-center relative overflow-hidden">
          {/* Animated Background Glow */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 blur-[80px] rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            
            <h1 className="text-2xl font-medium mb-3">Verification in Progress</h1>
            
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Your payment screenshot has been securely submitted. Our team is currently reviewing it. 
              Your VIP entry will be verified within <strong className="text-white">24 hours</strong>.
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 bg-black/40 py-2 px-4 rounded-full mb-8">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>We will notify you on WhatsApp once approved.</span>
            </div>

            <button 
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </main>
  );
}