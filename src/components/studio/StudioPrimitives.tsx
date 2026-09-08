import type { ReactNode } from "react";

/**
 * Shared studio primitives so the status-vs-action distinction and the
 * "critical metric" type scale are enforced at component level, not per screen.
 */

/** Big, tabular, non-jittering readout for countdowns, elapsed time and BPM. */
export const CriticalMetric = ({
  value,
  label,
  tone = "default",
  size = "lg",
  live = false,
}: {
  value: string;
  label?: string;
  tone?: "default" | "primary" | "accent" | "destructive";
  size?: "md" | "lg";
  live?: boolean;
}) => {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="text-center">
      <p
        className={`font-display tabular-nums leading-none ${size === "lg" ? "text-5xl" : "text-3xl"} ${toneClass}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
      {label && (
        <p className="mt-1 text-[10px] tracking-widest text-muted-foreground inline-flex items-center gap-1 justify-center">
          {live && <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
          {label}
        </p>
      )}
    </div>
  );
};

/** Non-interactive status readout. Never looks or behaves like a button. */
export const StatusPill = ({
  label,
  state,
  children,
}: {
  label: string;
  state: "on" | "off" | "unavailable";
  children?: ReactNode;
}) => {
  const dot =
    state === "on" ? "bg-primary" : state === "off" ? "bg-muted-foreground" : "bg-border";
  return (
    <span
      role="status"
      aria-label={`${label}: ${state === "on" ? "on" : state === "off" ? "off" : "unavailable"}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-dashed border-border text-[10px] tracking-widest text-muted-foreground select-none"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${state === "on" ? "animate-pulse" : ""}`} />
      {label}
      {children}
    </span>
  );
};

/** The one actionable treatment in a row of status pills. */
export const ActionButton = ({
  onClick,
  children,
  disabled,
  tone = "primary",
}: {
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "primary" | "accent";
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[11px] tracking-widest border transition-transform active:scale-95 disabled:opacity-40 ${
      tone === "accent"
        ? "bg-accent/15 border-accent/50 text-accent"
        : "bg-primary/15 border-primary/50 text-primary"
    }`}
  >
    {children}
  </button>
);

/** 48px touch target with a small glyph — for Mute / Solo toggles. */
export const ToggleTarget = ({
  active,
  label,
  glyph,
  onClick,
  tone = "primary",
}: {
  active: boolean;
  label: string;
  glyph: ReactNode;
  onClick: () => void;
  tone?: "primary" | "accent" | "destructive";
}) => {
  const on =
    tone === "accent"
      ? "bg-accent/20 border-accent text-accent"
      : tone === "destructive"
      ? "bg-destructive/20 border-destructive text-destructive"
      : "bg-primary/20 border-primary text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`h-12 w-12 shrink-0 grid place-items-center rounded-xl border text-xs font-bold transition-colors ${
        active ? on : "bg-background border-border text-muted-foreground"
      }`}
    >
      {glyph}
    </button>
  );
};
