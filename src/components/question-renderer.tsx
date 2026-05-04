"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, SkipForward } from "lucide-react";

import {
  type GrillQuestion,
  type UserAnswer,
  type UserAnswerSource,
} from "@/lib/schemas/grill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuestionRendererProps {
  question: GrillQuestion;
  /** Called when user submits an answer. */
  onSubmit: (answer: UserAnswer) => void;
  disabled?: boolean;
  className?: string;
}

const KIND_LABEL: Record<string, string> = {
  ARGUMENT: "论点",
  EVIDENCE: "证据",
  REBUTTAL: "反驳",
  REVISION: "修正",
};

export function QuestionRenderer({
  question,
  onSubmit,
  disabled,
  className,
}: QuestionRendererProps) {
  // Re-mount via `key={branch_id}` to reset draft state per question — this
  // avoids `setState` inside `useEffect` (forbidden by react-hooks/set-state-in-effect).
  return (
    <AnimatePresence mode="wait">
      <QuestionCard
        key={question.branch_id}
        question={question}
        onSubmit={onSubmit}
        disabled={disabled}
        className={className}
      />
    </AnimatePresence>
  );
}

function QuestionCard({
  question,
  onSubmit,
  disabled,
  className,
}: QuestionRendererProps) {
  const [freeText, setFreeText] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);

  function emit(source: UserAnswerSource, text: string) {
    if (disabled) return;
    onSubmit({ source, text, ts: Date.now() });
  }

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "glass-card-elevated p-6 sm:p-8 flex flex-col gap-5",
        className,
      )}
    >
        <header className="flex items-center gap-2">
          <Badge variant="secondary" className="font-sans text-xs">
            {KIND_LABEL[question.branch_kind] ?? question.branch_kind}
          </Badge>
          <span className="text-xs text-[var(--color-fg-muted)] font-sans">
            {question.branch_label}
          </span>
        </header>

        <h2
          role="status"
          aria-live="polite"
          className="font-serif text-2xl sm:text-3xl text-[var(--color-fg)] leading-snug"
        >
          {question.question}
        </h2>

        {question.reasoning && (
          <p className="text-sm text-[var(--color-fg-muted)] font-sans leading-relaxed">
            <Sparkles className="inline-block mr-1 size-3 align-[-2px] text-[var(--color-accent)]" />
            {question.reasoning}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <RecommendedCard
            text={question.recommended_answer}
            disabled={disabled}
            onPick={() => emit("RECOMMENDED", question.recommended_answer)}
          />
          {question.alternatives.map((alt, i) => (
            <AlternativeCard
              key={i}
              index={i}
              text={alt}
              disabled={disabled}
              onPick={() =>
                emit(
                  i === 0 ? "ALTERNATIVE_1" : "ALTERNATIVE_2",
                  alt,
                )
              }
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {!showFreeText && (
            <button
              type="button"
              className="self-start text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline-offset-4 hover:underline font-sans disabled:opacity-50"
              onClick={() => setShowFreeText(true)}
              disabled={disabled}
            >
              都不太对，我自己写补充
            </button>
          )}

          {showFreeText && (
            <div className="flex flex-col gap-2">
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="自己写一段补充答案…"
                rows={4}
                className="font-serif"
                disabled={disabled}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFreeText(false)}
                  disabled={disabled}
                >
                  收起
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[var(--radius-button)]"
                  onClick={() =>
                    freeText.trim() && emit("FREE_TEXT", freeText.trim())
                  }
                  disabled={disabled || !freeText.trim()}
                >
                  提交补充 <ArrowRight className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="self-end text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] font-sans disabled:opacity-50 inline-flex items-center gap-1"
            onClick={() => emit("SKIP", "（用户跳过此节点）")}
            disabled={disabled}
          >
            <SkipForward className="size-3" /> 跳过这一题
          </button>
        </div>
      </motion.section>
  );
}

function RecommendedCard({
  text,
  disabled,
  onPick,
}: {
  text: string;
  disabled?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "group text-left rounded-[var(--radius-button)] border p-4 transition-all bg-[var(--color-accent-bg)] border-[var(--color-accent)]/30 hover:border-[var(--color-accent)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-[var(--color-accent)] text-white font-sans text-[10px]">
          推荐答案
        </Badge>
        <span className="text-xs text-[var(--color-fg-muted)] font-sans">
          一键采纳推进
        </span>
      </div>
      <p className="font-serif text-base leading-relaxed text-[var(--color-fg)]">
        {text}
      </p>
    </button>
  );
}

function AlternativeCard({
  index,
  text,
  disabled,
  onPick,
}: {
  index: number;
  text: string;
  disabled?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "group text-left rounded-[var(--radius-button)] border p-4 transition-all border-[var(--color-border-warm)] bg-white/40 hover:bg-white/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fg-muted)]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="font-sans text-[10px]">
          备选 {index + 1}
        </Badge>
      </div>
      <p className="font-serif text-base leading-relaxed text-[var(--color-fg)]">
        {text}
      </p>
    </button>
  );
}
