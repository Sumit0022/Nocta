"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassCard({ children, className, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: delay, ease: "easeOut" }}
      className={twMerge(
        // Frosted glass styling: semi-transparent dark background with a blur effect
        "bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl",
        className
      )}
    >
      {children}
    </motion.div>
  );
}