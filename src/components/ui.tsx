"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { STATUSES, type Status } from "@/lib/types";
import { useI18n, type TKey } from "@/lib/i18n";

/* ---------------------------------------------------------------- layout */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "good" | "warn" | "private";
}) {
  const tones = {
    plain: "text-stone-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    private: "text-stone-900",
  } as const;

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium tracking-wide text-stone-500">{label}</span>
        {tone === "private" && <LockIcon />}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 text-stone-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* ---------------------------------------------------------------- buttons */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
}: ButtonProps) {
  const variants = {
    primary: "bg-ink text-cream-100 hover:bg-stone-800",
    secondary: "border border-cream-300 bg-white text-stone-800 hover:bg-cream-50",
    ghost: "text-stone-600 hover:bg-cream-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- fields */

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    // min-w-0 lets the field shrink inside a grid; without it, inputs with a
    // wide intrinsic size (date pickers on iOS) push out of their container.
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-stone-700">
        {label}
        {optional && (
          <span className="text-xs font-normal text-stone-400">({t("common.optional")})</span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-[16px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/**
 * `symbol` is only for the cost field, which may be taken in euros or
 * riyals. Everything else the business quotes — price, deposit, budget —
 * is dollars and leaves it alone.
 */
export function Money({
  symbol = "$",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { symbol?: string }) {
  const { dir } = useI18n();
  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-stone-400 ${
          dir === "rtl" ? "right-3.5" : "left-3.5"
        }`}
      >
        {symbol}
      </span>
      <input
        {...props}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        dir="ltr"
        // A focused number input reads the wheel as up/down. Typing 140 and
        // then scrolling to reach Save quietly saved 139.98 — and since the
        // spinner arrows are hidden (globals.css), nothing suggested the
        // field was a stepper. Dropping focus lets the page scroll instead.
        onWheel={(e) => e.currentTarget.blur()}
        className={`${inputClass} ${dir === "rtl" ? "pr-8 text-right" : "pl-7"} ${
          props.className ?? ""
        }`}
      />
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${inputClass} resize-y leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}

export function StatusSelect({
  value,
  onChange,
}: {
  value: Status;
  onChange: (s: Status) => void;
}) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status.${s}` as TKey)}
        </option>
      ))}
    </Select>
  );
}

/* ---------------------------------------------------------------- badges */

const STATUS_TONE: Record<Status, string> = {
  requested: "bg-stone-100 text-stone-700 ring-stone-200",
  sourcing: "bg-amber-50 text-amber-800 ring-amber-200",
  found: "bg-sky-50 text-sky-800 ring-sky-200",
  bought: "bg-violet-50 text-violet-800 ring-violet-200",
  shipped: "bg-teal-50 text-teal-800 ring-teal-200",
  out_for_delivery: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  closed: "bg-stone-700 text-stone-100 ring-stone-700",
  canceled: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[status]}`}
    >
      {t(`status.${status}` as TKey)}
    </span>
  );
}

/* ----------------------------------------------------------------- states */

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.9 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-cream-300 px-4 py-10 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return <div className="px-1 py-10 text-center text-sm text-stone-400">{t("common.loading")}</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      {message}
    </div>
  );
}
