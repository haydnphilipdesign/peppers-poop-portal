'use client'

import { useCallback, useEffect, useRef, useState } from "react";
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
  const generation = useRef(0);
  const mutating = useRef(false);

  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const id = ++generation.current;
    try {
      setIsLoading(true);
      const response = await apiFetch<AuthStatusResponse>("/api/auth/status", {
        method: "GET",
        cache: "no-store",
      });
      if (id !== generation.current) return;
      setIsUnlocked(response.unlocked);
      setError(null);
    } catch (err) {
      if (id !== generation.current) return;
      const message = err instanceof Error ? err.message : "Unable to check access.";
      setError(message);
      setIsUnlocked(false);
    } finally {
      if (id === generation.current) {
        setHasResolvedStatus(true);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const expired = () => {
      generation.current++;
      setIsUnlocked(false);
      setIsLoading(false);
      setError('Editing has locked. Enter the family PIN to continue.');
    };
    window.addEventListener('ppp:write-access-expired', expired);
    const foreground = () => { void refresh(); };
    window.addEventListener('ppp:foreground', foreground);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5 * 60_000);
    const requestGeneration = generation;
    return () => {
      requestGeneration.current++;
      window.clearInterval(timer);
      window.removeEventListener('ppp:write-access-expired', expired);
      window.removeEventListener('ppp:foreground', foreground);
    };
  }, [refresh]);

  const unlock = useCallback(async (pin: string) => {
    mutating.current = true;
    const id = ++generation.current;
    try {
      setIsLoading(true);
      await apiFetch<ApiSuccessResponse>("/api/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin } satisfies UnlockRequest),
      });
      if (id !== generation.current) return false;
      setIsUnlocked(true);
      setError(null);
      return true;
    } catch (err) {
      if (id !== generation.current) return false;
      if (err instanceof ApiError && err.status === 401) {
        setError("That PIN is incorrect.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to unlock editing.");
      }
      setIsUnlocked(false);
      return false;
    } finally {
      mutating.current = false;
      if (id === generation.current) setIsLoading(false);
    }
  }, []);

  const lock = useCallback(async () => {
    mutating.current = true;
    const id = ++generation.current;
    try {
      setIsLoading(true);
      await apiFetch<ApiSuccessResponse>("/api/auth/lock", { method: "POST" });
      if (id !== generation.current) return;
      setIsUnlocked(false);
      setError(null);
    } catch (err) {
      if (id !== generation.current) return;
      setError(err instanceof Error ? err.message : "Unable to lock editing.");
    } finally {
      mutating.current = false;
      if (id === generation.current) setIsLoading(false);
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
