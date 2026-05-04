/**
 * Anonymous grill store.
 *
 * - Holds the in-flight grill session, last AI question, revised draft.
 * - Persists to `localStorage` so a refresh during the grill doesn't lose state.
 * - Auth + Supabase sync arrive in Pass 2.
 */
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  GrillQuestion,
  GrillSession,
  Revision,
  ScenarioId,
  UserAnswer,
} from "@/lib/schemas/grill";

export type GrillStatus =
  | "idle"
  | "starting"
  | "grilling"
  | "thinking"
  | "complete"
  | "error";

interface GrillStoreState {
  scenario: ScenarioId | null;
  session: GrillSession | null;
  lastQuestion: GrillQuestion | null;
  revision: Revision | null;
  revisedDraft: string | null;
  status: GrillStatus;
  errorMessage: string | null;
  updatedAt: number | null;

  // -- actions --
  startSession: (payload: {
    scenario: ScenarioId;
    session: GrillSession;
    question: GrillQuestion;
  }) => void;
  recordQuestion: (q: GrillQuestion) => void;
  recordAnswer: (a: UserAnswer) => void;
  setSession: (s: GrillSession) => void;
  setStatus: (s: GrillStatus, errorMessage?: string | null) => void;
  completeWith: (payload: {
    session: GrillSession;
    revision: Revision;
    revisedDraft: string;
  }) => void;
  reset: () => void;
}

const initial: Omit<
  GrillStoreState,
  | "startSession"
  | "recordQuestion"
  | "recordAnswer"
  | "setSession"
  | "setStatus"
  | "completeWith"
  | "reset"
> = {
  scenario: null,
  session: null,
  lastQuestion: null,
  revision: null,
  revisedDraft: null,
  status: "idle",
  errorMessage: null,
  updatedAt: null,
};

export const useGrillStore = create<GrillStoreState>()(
  persist(
    (set) => ({
      ...initial,
      startSession: ({ scenario, session, question }) =>
        set({
          scenario,
          session,
          lastQuestion: question,
          revision: null,
          revisedDraft: null,
          status: "grilling",
          errorMessage: null,
          updatedAt: Date.now(),
        }),
      recordQuestion: (q) =>
        set({ lastQuestion: q, status: "grilling", updatedAt: Date.now() }),
      recordAnswer: () =>
        set((state) => ({
          // we still rely on server-applied session for the source of truth;
          // store the answer locally just for optimistic UI hints.
          status: "thinking",
          updatedAt: Date.now(),
          session: state.session
            ? {
                ...state.session,
                updatedAt: Date.now(),
              }
            : state.session,
        })),
      setSession: (s) => set({ session: s, updatedAt: Date.now() }),
      setStatus: (status, errorMessage = null) =>
        set({ status, errorMessage, updatedAt: Date.now() }),
      completeWith: ({ session, revision, revisedDraft }) =>
        set({
          session,
          revision,
          revisedDraft,
          lastQuestion: null,
          status: "complete",
          errorMessage: null,
          updatedAt: Date.now(),
        }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "mindgrill-session",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR fallback — Zustand needs a Storage-shaped object even on server.
          const noop: Storage = {
            length: 0,
            clear: () => {},
            getItem: () => null,
            key: () => null,
            removeItem: () => {},
            setItem: () => {},
          };
          return noop;
        }
        return window.localStorage;
      }),
      partialize: (state) => ({
        scenario: state.scenario,
        session: state.session,
        lastQuestion: state.lastQuestion,
        revision: state.revision,
        revisedDraft: state.revisedDraft,
        status: state.status,
        updatedAt: state.updatedAt,
      }),
    },
  ),
);
