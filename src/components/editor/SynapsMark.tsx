import { cn } from "@/lib/utils";

export function SynapsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 40"
      className={cn("h-8 w-auto", className)}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="sx-flow" x1="38" y1="20" x2="78" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2ee6c5" />
          <stop offset="1" stopColor="#9b8cff" />
        </linearGradient>
        <linearGradient id="sx-brain" x1="8" y1="8" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5dffc8" />
          <stop offset="1" stopColor="#2ee6c5" />
        </linearGradient>
        <linearGradient id="sx-node" x1="88" y1="6" x2="128" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9b8cff" />
          <stop offset="1" stopColor="#d06bff" />
        </linearGradient>
      </defs>
      <path
        d="M22 7c-6 0-11 4.2-11 10.2 0 2.4 1 4.6 2.6 6.2-1.8 1.4-3 3.6-3 6.1 0 4.3 3.6 7.5 8.4 7.5 1.4 0 2.7-.3 3.8-.8 1.2 1.1 2.8 1.8 4.6 1.8 3.6 0 6.5-2.4 6.5-5.8 0-.7-.1-1.3-.4-1.9 1.7-1.4 2.8-3.5 2.8-5.9 0-2.6-1.4-4.9-3.5-6.3.2-.7.3-1.5.3-2.3C32.1 10.4 27.6 7 22 7Z"
        stroke="url(#sx-brain)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.5c2-.8 4.2-1 6.4-.4M18 21.5c2.4.2 4.6-.2 6.6-1.4M17.5 26.2c2.2.8 4.8.9 7.2.2"
        stroke="url(#sx-brain)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M33 20c8-6 14-7 22-6M33 22c9 4 16 6 24 5"
        stroke="url(#sx-flow)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="94" cy="12" r="3.2" stroke="url(#sx-node)" strokeWidth="1.3" />
      <circle cx="112" cy="8" r="3.2" stroke="url(#sx-node)" strokeWidth="1.3" />
      <circle cx="124" cy="18" r="3.2" stroke="url(#sx-node)" strokeWidth="1.3" />
      <circle cx="108" cy="22" r="3.4" stroke="url(#sx-node)" strokeWidth="1.3" />
      <circle cx="96" cy="30" r="3.2" stroke="url(#sx-node)" strokeWidth="1.3" />
      <circle cx="118" cy="31" r="3.2" stroke="url(#sx-node)" strokeWidth="1.3" />
      <path
        d="M97 14.6 109 10.2M115 10.6 121 15.4M114.8 11.4 110.4 19.2M107 24.6 99 27.8M110.8 25.2 116.4 28.6M121 21 119.4 28"
        stroke="url(#sx-node)"
        strokeWidth="1.05"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M78 19h8"
        stroke="url(#sx-flow)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SynapsWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[17px] font-semibold tracking-[0.04em] text-fg",
        className,
      )}
    >
      Synaps<span className="text-fg-muted">-</span>
      <span className="text-cyan">X</span>
    </span>
  );
}
