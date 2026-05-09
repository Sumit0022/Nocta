"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { Lock, User, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin");
      } else {
        setError(data.error || "Login Failed");
      }
    } catch (err) {
      setError("Network error! Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-6 relative text-white">
      <div className="absolute inset-0 bg-neutral-950 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 via-transparent to-transparent -z-10" />
      
      <GlassCard className="w-full max-w-md p-10 border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-light tracking-tight">Admin Access</h1>
          <p className="text-neutral-500 text-sm mt-2 font-light">Enter credentials to unlock Command Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
            <input required type="text" placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-white/30 text-white transition-all" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
            <input required type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-white/30 text-white transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center bg-red-500/10 py-3 rounded-lg border border-red-500/20">
              {error}
            </motion.div>
          )}

          <button disabled={loading} className="w-full bg-white text-neutral-950 py-4 rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50 shadow-lg">
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
          </button>
        </form>
      </GlassCard>
    </main>
  );
}