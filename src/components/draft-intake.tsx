"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DraftIntakeProps {
  title: string;
  placeholder: string;
  onSubmit: (draft: string) => void;
  disabled?: boolean;
  initialValue?: string;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

const DEFAULT_MIN = 20;
const DEFAULT_MAX = 8000;

export function DraftIntake({
  title,
  placeholder,
  onSubmit,
  disabled,
  initialValue = "",
  minLength = DEFAULT_MIN,
  maxLength = DEFAULT_MAX,
  className,
}: DraftIntakeProps) {
  const [value, setValue] = useState(initialValue);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < minLength;
  const tooLong = trimmed.length > maxLength;
  const canSubmit = !disabled && trimmed.length >= minLength && !tooLong;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn("glass-card p-6 sm:p-8 flex flex-col gap-4", className)}
    >
      <h2 className="font-serif text-2xl font-semibold text-[var(--color-fg)]">
        {title}
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)]">
        粘贴一段你的草稿，AI 将基于这段文字提出 5–8 轮针对性追问。
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className="min-h-[200px] font-serif leading-relaxed text-base"
        aria-label="草稿输入"
        disabled={disabled}
      />
      <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-sans">
        <span>
          {tooShort && (
            <span className="text-[var(--color-accent)]">
              至少 {minLength} 字才能开始（当前 {trimmed.length}）
            </span>
          )}
          {tooLong && (
            <span className="text-[var(--color-accent)]">
              最多 {maxLength} 字（当前 {trimmed.length}）
            </span>
          )}
        </span>
        <span className="tabular-nums">
          {trimmed.length} / {maxLength}
        </span>
      </div>
      <div className="flex justify-end pt-1">
        <Button
          onClick={() => canSubmit && onSubmit(trimmed)}
          disabled={!canSubmit}
          className="rounded-[var(--radius-button)]"
          size="lg"
        >
          交给 AI 拷问 →
        </Button>
      </div>
    </motion.section>
  );
}
