"use client";

import { useState, useEffect, useCallback } from "react";

import type { ProviderId } from "@/lib/ai/provider-registry";

/** Key entry as returned from GET /api/keys */
export interface StoredKey {
  id: string;
  provider_id: ProviderId;
  key_hint: string;
  base_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Result from GET /api/keys */
interface KeysResponse {
  keys: StoredKey[];
}

/** Result from POST /api/keys/test */
interface TestResult {
  success: boolean;
  models?: string[];
  error?: string;
}

/** Result from POST /api/keys/save */
interface SaveResult {
  key: {
    id: string;
    providerId: ProviderId;
    keyHint: string;
    baseUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

interface UseProviderKeys {
  keys: StoredKey[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  saveKey: (
    providerId: ProviderId,
    apiKey: string,
    baseUrl?: string,
  ) => Promise<SaveResult | null>;
  testKey: (
    providerId: ProviderId,
    apiKey: string,
    baseUrl?: string,
  ) => Promise<TestResult | null>;
  deleteKey: (id: string) => Promise<boolean>;
  fetchModels: (providerId: ProviderId) => Promise<string[]>;
}

interface FetchState {
  keys: StoredKey[];
  loading: boolean;
  error: string | null;
}

async function loadKeys(): Promise<StoredKey[]> {
  const res = await fetch("/api/keys");
  if (!res.ok) {
    throw new Error(`Failed to fetch keys: ${res.status}`);
  }
  const data: KeysResponse = await res.json();
  return data.keys ?? [];
}

export function useProviderKeys(): UseProviderKeys {
  const [state, setState] = useState<FetchState>({
    keys: [],
    loading: true,
    error: null,
  });
  const [fetchCounter, setFetchCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadKeys()
      .then((result) => {
        if (!cancelled) setState({ keys: result, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            keys: [],
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load keys",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCounter]);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  const saveKey = useCallback(
    async (
      providerId: ProviderId,
      apiKey: string,
      baseUrl?: string,
    ): Promise<SaveResult | null> => {
      try {
        const res = await fetch("/api/keys/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId,
            apiKey,
            baseUrl: baseUrl || undefined,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error?.message ?? `Save failed: ${res.status}`,
          );
        }
        const result: SaveResult = await res.json();
        // Refresh keys after save
        refetch();
        return result;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to save key",
        }));
        return null;
      }
    },
    [refetch],
  );

  const testKey = useCallback(
    async (
      providerId: ProviderId,
      apiKey: string,
      baseUrl?: string,
    ): Promise<TestResult | null> => {
      try {
        const res = await fetch("/api/keys/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId,
            apiKey,
            baseUrl: baseUrl || undefined,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error?.message ?? `Test failed: ${res.status}`,
          );
        }
        return await res.json();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to test key",
        }));
        return null;
      }
    },
    [],
  );

  const deleteKey = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
        if (!res.ok) {
          throw new Error(`Delete failed: ${res.status}`);
        }
        refetch();
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to delete key",
        }));
        return false;
      }
    },
    [refetch],
  );

  const fetchModels = useCallback(
    async (providerId: ProviderId): Promise<string[]> => {
      try {
        const res = await fetch(
          `/api/keys/models?providerId=${encodeURIComponent(providerId)}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.models ?? [];
      } catch {
        return [];
      }
    },
    [],
  );

  return {
    keys: state.keys,
    loading: state.loading,
    error: state.error,
    refetch,
    saveKey,
    testKey,
    deleteKey,
    fetchModels,
  };
}