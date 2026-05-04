"use client";

import { useEffect, useState } from "react";

import type { ProviderId } from "@/lib/ai";
import type { ProviderHealth } from "@/lib/ai";

interface ProviderHealthResponse {
  providers: ProviderHealth[];
  defaultProvider: ProviderId | null;
  anyConfigured: boolean;
}

interface UseProviderHealth {
  loading: boolean;
  data: ProviderHealthResponse | null;
  error: string | null;
}

export function useProviderHealth(): UseProviderHealth {
  const [state, setState] = useState<UseProviderHealth>({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/providers")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`/api/health/providers ${res.status}`);
        }
        return (await res.json()) as ProviderHealthResponse;
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: err instanceof Error ? err.message : String(err),
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
