'use client'

import { FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";

interface WriteAccessPanelProps {
  onUnlock: (pin: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function WriteAccessPanel({
  onUnlock,
  isLoading,
  error,
}: WriteAccessPanelProps) {
  const [pin, setPin] = useState("");
  const pinId = useId();
  const errorId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onUnlock(pin.trim());
    if (success) {
      setPin("");
    }
  };

  return (
    <section className="rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-50 to-orange-100 p-5 text-stone-900 shadow-sm dark:border-amber-700/40 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-50">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-300/90">
        Editing Locked
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-tight">
        Enter family PIN to enable logging and updates
      </h2>
      <p className="mt-2 text-sm text-stone-700 dark:text-amber-100/70">
        Data stays visible while locked. Editing controls activate after unlock.
      </p>

      <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <label htmlFor={pinId} className="min-w-0 flex-1 space-y-1 text-sm font-medium">
          <span className="block">Family PIN</span>
          <input
            id={pinId}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-lg border border-amber-800/20 bg-white px-3 py-2 text-base transition focus:border-amber-700 dark:border-amber-700/30 dark:bg-input dark:text-foreground dark:focus:border-amber-500"
            placeholder="Family PIN"
            aria-label="Family PIN"
            aria-invalid={error === "That PIN is incorrect."}
            aria-describedby={error ? errorId : undefined}
            disabled={isLoading}
          />
        </label>
        <Button
          type="submit"
          className="min-h-11 bg-stone-900 px-4 text-sm text-amber-50 hover:bg-stone-800 dark:bg-amber-200 dark:text-stone-900 dark:hover:bg-amber-100"
          disabled={isLoading || pin.trim().length < 4}
        >
          {isLoading ? "Checking..." : "Unlock"}
        </Button>
      </form>

      {isLoading ? <p role="status" className="mt-3 text-sm">Checking PIN...</p> : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </section>
  );
}
