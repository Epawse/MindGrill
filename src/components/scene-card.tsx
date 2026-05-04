"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import type { ScenarioId } from "@/lib/schemas/grill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scenarioId: ScenarioId;
  title: string;
  zhTitle: string;
  oneLiner: string;
  description: string;
  gradientClass: string; // e.g. "scene-gradient-thesis"
  href: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

export function SceneCard({
  title,
  zhTitle,
  oneLiner,
  description,
  gradientClass,
  href,
  disabled,
  onDisabledClick,
}: SceneCardProps) {
  const cardBody = (
    <motion.div
      whileHover={disabled ? undefined : { y: -2, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "glass-card-elevated relative h-full p-6 flex flex-col gap-4 cursor-pointer transition-shadow",
        disabled && "cursor-not-allowed opacity-70",
      )}
      onClick={() => {
        if (disabled) onDisabledClick?.();
      }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 rounded-t-[var(--radius-card)]",
          gradientClass,
        )}
      />
      <div className="flex items-baseline gap-2">
        <h3 className="font-serif text-2xl font-semibold text-[var(--color-fg)]">
          {zhTitle}
        </h3>
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] font-sans">
          {title}
        </span>
      </div>
      <p className="text-base text-[var(--color-fg)] font-serif leading-relaxed">
        {oneLiner}
      </p>
      <p className="text-sm text-[var(--color-fg-muted)] font-sans leading-relaxed flex-1">
        {description}
      </p>
      <div className="pt-2">
        <Button
          variant="default"
          size="sm"
          className="rounded-[var(--radius-button)]"
          disabled={disabled}
        >
          开始拷问 <ArrowRight className="ml-1" />
        </Button>
      </div>
    </motion.div>
  );

  if (disabled) return cardBody;
  return (
    <Link href={href} className="block h-full">
      {cardBody}
    </Link>
  );
}
