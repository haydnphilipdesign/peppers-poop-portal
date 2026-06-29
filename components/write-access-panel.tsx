'use client'

import { FormEvent, useState } from "react";
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

      <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="h-11 flex-1 rounded-lg border border-amber-800/20 bg-white px-3 text-base outline-none ring-0 transition focus:border-amber-700 dark:border-amber-700/30 dark:bg-input dark:text-foreground dark:focus:border-amber-500"
          placeholder="Family PIN"
          aria-label="Family PIN"
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="h-11 bg-stone-900 px-4 text-sm text-amber-50 hover:bg-stone-800 dark:bg-amber-200 dark:text-stone-900 dark:hover:bg-amber-100"
          disabled={isLoading || pin.trim().length < 4}
        >
          {isLoading ? "Checking..." : "Unlock"}
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </section>
  );
}
