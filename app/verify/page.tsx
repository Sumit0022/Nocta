"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import GlassCard from "@/components/atoms/GlassCard";
import { ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";

// 🚀 FIREBASE IMPORTS
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// YAHAN SE 'declare global' HATA DIYA HAI TAARI COMPILER CONFUSE NA HO

export default function VerifyPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  
  // Firebase ka confirmation object save karne ke liye state
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/guest/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Kuch gadbad ho gayi.");
      } else {
        console.log("Guest Data Received:", data);
        setSuccessData(data); 
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ RECAPTCHA SETUP FUNCTION (Ab 'as any' use karke TypeScript bypass kiya hai)
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', 
        'callback': (response: any) => {
          // reCAPTCHA solved
        }
      });
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      let phone = successData?.data?.mobileNumber || successData?.guest?.mobileNumber;

      if (!phone) {
        setError("Database mein apka phone number nahi mila.");
        setLoading(false);
        return;
      }

      if (!phone.toString().startsWith("+")) {
        phone = "+91" + phone;
      }

      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;

      // 🚀 ASLI FIREBASE OTP SEND
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      
      setConfirmationResult(result); 
      setOtpSent(true);

    } catch (err: any) {
      console.error("OTP Error:", err);
      setError("OTP bhejne mein error aayi. Please refresh & try again.");
      
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOtpError("");

    try {
      await confirmationResult.confirm(otpInput);

      const currentStatus = successData?.rsvpStatus || successData?.data?.rsvpStatus;
      console.log("Verifying Routing for Status:", currentStatus);

      if (currentStatus === "Confirmed") {
        router.push(`/dashboard?firstName=${firstName}&lastName=${lastName}`); 
      } 
      else if (currentStatus === "Need Verification") {
        router.push('/status');
      } 
      else {
        router.push(`/payment?firstName=${firstName}&lastName=${lastName}`); 
      }
    } catch (error) {
      console.error("Verification failed", error);
      setOtpError("Galat OTP! Kripya sahi code dalein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950 -z-10" />

      {/* ⚠️ YE ZAROORI HAI: Invisible reCAPTCHA ke liye container */}
      <div id="recaptcha-container"></div>

      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light mb-2">Guest Verification</h1>
        </div>

        {!successData ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" placeholder="First Name" />
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" placeholder="Last Name" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button type="submit" disabled={loading} className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium flex justify-center items-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
            </button>
          </form>
        ) : !otpSent ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8"/></div>
            <h2 className="text-xl font-medium">Welcome, {firstName}!</h2>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium flex justify-center items-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4"><KeyRound className="w-8 h-8"/></div>
            <h2 className="text-xl font-medium">Enter OTP</h2>
            <input type="text" required maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none font-mono" placeholder="••••••" />
            {otpError && <p className="text-red-400 text-sm text-center">{otpError}</p>}
            
            <button type="submit" disabled={loading} className="w-full bg-white text-neutral-950 py-3 rounded-lg font-medium flex justify-center items-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
            </button>
          </form>
        )}
      </GlassCard>
    </main>
  );
}