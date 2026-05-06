"use client";

import { useState, useEffect, useCallback } from "react";

// Global event for cross-component subscription state sync.
// When any component changes subscription state (e.g. redeem code),
// it dispatches this event so all useSubscription instances refetch.
const SUBSCRIPTION_CHANGED_EVENT = "mindgrill:subscription-changed";

export function notifySubscriptionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SUBSCRIPTION_CHANGED_EVENT));
  }
}

export interface PlanInfo {
  id: string;
  name: string;
  monthly_credits: number;
  max_rounds: number;
  model_access: string;
  price_monthly: number;
  price_yearly: number;
  sort_order: number;
}

export interface SubscriptionStatus {
  plan_id: string;
  plan_name: string;
  status: string;
  monthly_credits: number;
  max_rounds: number;
  model_access: string;
  credits_remaining: number;
  bonus_credits_remaining: number;
  is_unlimited: boolean;
  current_period_end: string | null;
}

interface UseSubscriptionReturn {
  plans: PlanInfo[];
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCounter, setFetchCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        const [plansRes, subRes] = await Promise.all([
          fetch("/api/subscription/plans"),
          fetch("/api/subscription/status"),
        ]);

        if (cancelled) return;

        const plansData = await plansRes.json();
        if (plansRes.ok) {
          setPlans(plansData.plans ?? []);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription ?? null);
        } else {
          setSubscription(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subscription data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [fetchCounter]);

  // Listen for global subscription change events from other components
  useEffect(() => {
    function handleSubscriptionChanged() {
      setFetchCounter((c) => c + 1);
    }
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionChanged);
    return () => {
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionChanged);
    };
  }, []);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  return { plans, subscription, loading, error, refetch };
}

export function useRedeemCode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    credits_granted: number;
    bonus_remaining: number;
  } | null>(null);

  const redeem = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "兑换失败");
        return null;
      }

      setResult(data);
      // Notify all useSubscription instances to refetch
      notifySubscriptionChanged();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "兑换失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { redeem, loading, error, result };
}