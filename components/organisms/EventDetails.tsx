"use client";

import { MapPin, Calendar, Music } from "lucide-react";
import GlassCard from "@/components/atoms/GlassCard";

export default function EventDetails({ settings }: { settings?: any }) {
  return (
    <section className="w-full max-w-4xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <GlassCard delay={0.2}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-full text-neutral-200"><MapPin /></div>
          <div>
            <h3 className="text-xl font-semibold mb-1">The Venue</h3>
            <p className="text-neutral-400 leading-relaxed whitespace-pre-line">
              {settings?.eventVenue || "Loading venue details..."}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.3}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-full text-neutral-200"><Calendar /></div>
          <div>
            <h3 className="text-xl font-semibold mb-1">Date & Time</h3>
            <p className="text-neutral-400 leading-relaxed whitespace-pre-line">
              {settings?.eventDate || "Event Date"}<br />
              {settings?.eventTime || "Event Time"}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.4} className="md:col-span-2 text-center flex flex-col items-center">
        <div className="p-3 bg-white/10 rounded-full mb-4 text-neutral-200"><Music /></div>
        <h3 className="text-xl font-semibold mb-2">The Vibe</h3>
        <p className="text-neutral-400 max-w-lg mx-auto whitespace-pre-line">
          {settings?.eventVibe || "Loading vibe details..."}
        </p>
      </GlassCard>

    </section>
  );
}