"use client";

/**
 * Framer-Motion-driven horizontal "thinking streak". Replaces the spinner per
 * the Cosmos-inspired motion brief in PRD § 1.5: a soft terracotta light bar
 * sliding left → right while the AI is composing the next question.
 */
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface StreakLoaderProps {
  label?: string;
  className?: string;
}

export function StreakLoader({
  label = "AI 正在追问…",
  className,
}: StreakLoaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="status"
        aria-live="polite"
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-accent-bg)]"
      >
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent"
          initial={{ x: "-50%" }}
          animate={{ x: "150%" }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
      <p className="text-sm text-[var(--color-fg-muted)] font-sans">{label}</p>
    </div>
  );
}
