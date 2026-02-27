'use client'

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ApiSuccessResponse, UnlockRequest } from "@/lib/api-types";

interface AuthStatusResponse {
  unlocked: boolean;
}

interface UseWriteAccessReturn {
  isUnlocked: boolean;
  isLoading: boolean;
  hasResolvedStatus: boolean;
  error: string | null;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWriteAccess(): UseWriteAccessReturn {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasResolvedStatus, setHasResolvedStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch<AuthStatusResponse>("/api/auth/status", {
        method: "GET",
      });
      setIsUnlocked(response.unlocked);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to check access.";
      setError(message);
      setIsUnlocked(false);
    } finally {
      setHasResolvedStatus(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(async (pin: string) => {
    try {
      setIsLoading(true);
      await apiFetch<ApiSuccessResponse>("/api/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin } satisfies UnlockRequest),
      });
      setIsUnlocked(true);
      setError(null);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("That PIN is incorrect.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to unlock editing.");
      }
      setIsUnlocked(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      setIsLoading(true);
      await apiFetch<ApiSuccessResponse>("/api/auth/lock", { method: "POST" });
      setIsUnlocked(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to lock editing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isUnlocked,
    isLoading,
    hasResolvedStatus,
    error,
    unlock,
    lock,
    refresh,
  };
}
