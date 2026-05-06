import { Inter } from "next/font/google";
import { useRef, useCallback, useState, useEffect, useMemo } from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// ─── Design tokens (from Figma "Equal Edge Mobile App") ──────────────────────
const BLUE        = "#558BF7";
const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.08)";

// ─── Motion tokens — JS mirror of motion-system.css custom properties ────────
// Inline styles can't resolve var() in transition shorthands, so we keep a
// typed constant object here. Update both this and the :root overrides in
// globals.css whenever values change.
const MS = {
  // Durations
  dMicro:    "100ms",
  dFast:     "150ms",
  dElement:  "250ms",
  dExpand:      "280ms",   // project override (default 300ms)
  dExpandClose: "210ms",   // dExpand × 0.75 — asymmetric snappy close
  dScreen:   "300ms",
  dProgress: "600ms",
  dSlow:     "800ms",
  dCheck:    "200ms",
  // Easings
  eOut:    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  eInOut:  "cubic-bezier(0.45, 0.00, 0.55, 1.00)",
  eSpring: "cubic-bezier(0.34, 1.20, 0.64, 1.00)",
} as const;

// Day that is "today" — stays highlighted regardless of which day is active
const CURRENT_DAY = 2; // Monday

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div
      id="status-bar"
      className="flex items-center justify-between px-7"
      style={{ height: 54, background: "#F5F5F5" }}
    >
      <span className="font-bold text-black" style={{ fontSize: 17 }}>9:41</span>
      <div className="flex items-center gap-1.5">
        {/* Signal bars */}
        <svg width="19" height="12" viewBox="0 0 19 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="black" />
          <rect x="4" y="5" width="3" height="7" rx="1" fill="black" />
          <rect x="8" y="3" width="3" height="9" rx="1" fill="black" />
          <rect x="12" y="0" width="3" height="12" rx="1" fill="black" />
          <rect x="16" y="0" width="3" height="12" rx="1" fill="black" opacity="0.3" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="black" />
          <path d="M2.93 6.43a7.5 7.5 0 0 1 10.14 0" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M0.5 3.93a11 11 0 0 1 15 0" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {/* Battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="black" strokeOpacity="0.35" />
          <rect x="2" y="2" width="19" height="9" rx="2" fill="black" />
          <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="black" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

type CalendarView = "day" | "week" | "3day" | "month";

const CALENDAR_VIEWS: { id: CalendarView; label: string; icon: React.ReactNode }[] = [
  {
    id: "day",
    label: "Day",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17.75 3C19.5449 3 21 4.45507 21 6.25V17.75C21 19.5449 19.5449 21 17.75 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H17.75C18.7165 19.5 19.5 18.7165 19.5 17.75V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5ZM16.25 11C16.6642 11 17 11.3358 17 11.75V16.25C17 16.6642 16.6642 17 16.25 17H7.75C7.33579 17 7 16.6642 7 16.25V11.75C7 11.3358 7.33579 11 7.75 11H16.25ZM15.5 12.5H8.5V15.5H15.5V12.5ZM7.75 7.25H16.25C16.6642 7.25 17 7.58579 17 8C17 8.3797 16.7178 8.69349 16.3518 8.74315L16.25 8.75H7.75C7.33579 8.75 7 8.41421 7 8C7 7.6203 7.28215 7.30651 7.64823 7.25685L7.75 7.25H16.25H7.75Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "3day",
    label: "3 day",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17.75 3C19.5449 3 21 4.45507 21 6.25V17.75C21 19.5449 19.5449 21 17.75 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H17.75C18.7165 19.5 19.5 18.7165 19.5 17.75V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5ZM7.75 7C8.1297 7 8.44349 7.28215 8.49315 7.64823L8.5 7.75V16.25C8.5 16.6642 8.16421 17 7.75 17C7.3703 17 7.05651 16.7178 7.00685 16.3518L7 16.25V7.75C7 7.33579 7.33579 7 7.75 7ZM16.25 7C16.6297 7 16.9435 7.28215 16.9932 7.64823L17 7.75V16.25C17 16.6642 16.6642 17 16.25 17C15.8703 17 15.5565 16.7178 15.5068 16.3518L15.5 16.25V7.75C15.5 7.33579 15.8358 7 16.25 7ZM12 7C12.3797 7 12.6935 7.28215 12.7432 7.64823L12.75 7.75V16.25C12.75 16.6642 12.4142 17 12 17C11.6203 17 11.3065 16.7178 11.2568 16.3518L11.25 16.25V7.75C11.25 7.33579 11.5858 7 12 7Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "week",
    label: "Week",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(3 3)">
          <path d="M14.75 0C16.5449 0 18 1.45507 18 3.25V14.75C18 16.5449 16.5449 18 14.75 18H3.25C1.45507 18 0 16.5449 0 14.75V3.25C0 1.45507 1.45507 0 3.25 0H14.75ZM14.75 1.5H3.25C2.2835 1.5 1.5 2.2835 1.5 3.25V14.75C1.5 15.7165 2.2835 16.5 3.25 16.5H14.75C15.7165 16.5 16.5 15.7165 16.5 14.75V3.25C16.5 2.2835 15.7165 1.5 14.75 1.5ZM4.75 10.5C5.44036 10.5 6 11.0596 6 11.75C6 12.4404 5.44036 13 4.75 13C4.05964 13 3.5 12.4404 3.5 11.75C3.5 11.0596 4.05964 10.5 4.75 10.5ZM9 10.5C9.69036 10.5 10.25 11.0596 10.25 11.75C10.25 12.4404 9.69036 13 9 13C8.30964 13 7.75 12.4404 7.75 11.75C7.75 11.0596 8.30964 10.5 9 10.5ZM4.75 5.5C5.44036 5.5 6 6.05964 6 6.75C6 7.44036 5.44036 8 4.75 8C4.05964 8 3.5 7.44036 3.5 6.75C3.5 6.05964 4.05964 5.5 4.75 5.5ZM9 5.5C9.69036 5.5 10.25 6.05964 10.25 6.75C10.25 7.44036 9.69036 8 9 8C8.30964 8 7.75 7.44036 7.75 6.75C7.75 6.05964 8.30964 5.5 9 5.5ZM13.25 5.5C13.9404 5.5 14.5 6.05964 14.5 6.75C14.5 7.44036 13.9404 8 13.25 8C12.5596 8 12 7.44036 12 6.75C12 6.05964 12.5596 5.5 13.25 5.5Z" fill="currentColor"/>
        </g>
      </svg>
    ),
  },
  {
    id: "month",
    label: "Month",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17.75 3C19.5449 3 21 4.45507 21 6.25V17.75C21 19.5449 19.5449 21 17.75 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H17.75C18.7165 19.5 19.5 18.7165 19.5 17.75V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5ZM7.75 13.5C8.44036 13.5 9 14.0596 9 14.75C9 15.4404 8.44036 16 7.75 16C7.05964 16 6.5 15.4404 6.5 14.75C6.5 14.0596 7.05964 13.5 7.75 13.5ZM12 13.5C12.6904 13.5 13.25 14.0596 13.25 14.75C13.25 15.4404 12.6904 16 12 16C11.3096 16 10.75 15.4404 10.75 14.75C10.75 14.0596 11.3096 13.5 12 13.5ZM7.75 8.5C8.44036 8.5 9 9.05964 9 9.75C9 10.4404 8.44036 11 7.75 11C7.05964 11 6.5 10.4404 6.5 9.75C6.5 9.05964 7.05964 8.5 7.75 8.5ZM12 8.5C12.6904 8.5 13.25 9.05964 13.25 9.75C13.25 10.4404 12.6904 11 12 11C11.3096 11 10.75 10.4404 10.75 9.75C10.75 9.05964 11.3096 8.5 12 8.5ZM16.25 8.5C16.9404 8.5 17.5 9.05964 17.5 9.75C17.5 10.4404 16.9404 11 16.25 11C15.5596 11 15 10.4404 15 9.75C15 9.05964 15.5596 8.5 16.25 8.5Z" fill="currentColor" />
      </svg>
    ),
  },
];

function Header({
  view,
  onViewChange,
  showTodayBtn = false,
  onTodayJump,
  monthName = "April",
  year = "2026",
}: {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  showTodayBtn?: boolean;
  onTodayJump?: () => void;
  monthName?: string;
  year?: string;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = CALENDAR_VIEWS.find((v) => v.id === view)!;

  // Close dropdown when tapping outside
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [dropOpen]);

  return (
    <div
      id="header"
      className="flex items-start justify-between px-4"
      style={{ paddingTop: 12, paddingBottom: 12, background: "#fff" }}
    >
      {/* Month / Year */}
      <div>
        <div className="font-bold text-black" style={{ fontSize: 26, lineHeight: "1.1" }}>{monthName}</div>
        <div className="font-normal text-black/50" style={{ fontSize: 13, marginTop: 1 }}>{year}</div>
      </div>

      {/* Right side: Today jump + view picker */}
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        {/* Jump-to-today icon button — always shown in 3-day view */}
        {showTodayBtn && (
          <div
            onClick={onTodayJump}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "#F2F2F2",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", userSelect: "none",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 10.2H4M7.11111 21C5.61764 21 6.02646 21 5.45603 20.7057C4.95426 20.4469 4.54631 20.0338 4.29065 19.5258C4 18.9482 4 18.1921 4 16.68V9.12C4 7.60786 4 6.85179 4.29065 6.27423C4.54631 5.76619 4.95426 5.35314 5.45603 5.09428C6.02646 4.8 6.77319 4.8 8.26667 4.8H15.7333C17.2268 4.8 17.9735 4.8 18.544 5.09428C19.0457 5.35314 19.4537 5.76619 19.7094 6.27423C20 6.85179 20 7.60786 20 9.12V16.68C20 18.1921 20 18.9482 19.7094 19.5258C19.4537 20.0338 19.0457 20.4469 18.544 20.7057C17.9735 21 18.3824 21 16.8889 21M15.5556 3V6.6M8.44444 3V6.6" stroke="#242424" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 18.4286L12 21M12 21L14 18.4286M12 21V15" stroke="#242424" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* View picker */}
        <div ref={containerRef} style={{ position: "relative" }}>
          {/* Trigger button */}
          <div
            onClick={() => setDropOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3"
            style={{
              background: "#F2F2F2", height: 34, borderRadius: 10,
              cursor: "pointer", userSelect: "none",
              color: "#242424",
            }}
          >
            {active.icon}
            <span className="font-medium text-black" style={{ fontSize: 13 }}>{active.label}</span>
          </div>

          {/* Dropdown */}
          <div
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)",
              padding: "6px",
              display: "flex", flexDirection: "column", gap: 2,
              minWidth: 150,
              zIndex: 50,
              pointerEvents: dropOpen ? "auto" : "none",
              opacity: dropOpen ? 1 : 0,
              transform: dropOpen ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
              transformOrigin: "top right",
              transition: `opacity ${MS.dElement} ${MS.eOut}, transform ${MS.dElement} ${MS.eOut}`,
            }}
          >
            {CALENDAR_VIEWS.filter((v) => v.id !== "week").map((v) => {
              const isSelected = v.id === view;
              return (
                <div
                  key={v.id}
                  onClick={() => { onViewChange(v.id); setDropOpen(false); }}
                  className="flex items-center gap-2.5"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 9,
                    background: isSelected ? "#F2F2F2" : "transparent",
                    cursor: "pointer",
                    userSelect: "none",
                    color: "#242424",
                    transition: `background ${MS.dFast} ${MS.eOut}`,
                  }}
                >
                  {v.icon}
                  <span className="font-medium" style={{ fontSize: 14 }}>{v.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rounded-rect progress ring. Default size matches the WeekStrip cell (44×52, rx=12).
// Pass W/H/RX to draw around any rounded rectangle (e.g. full-width 3-day column header).
function DayRing({ progress, W = 44, H = 52, RX = 12 }: { progress: number; W?: number; H?: number; RX?: number }) {
  const SW = 2.5;
  const pad = 3; // room for the stroke without being clipped
  const p = pad; // alias for path math

  // Clockwise rounded-rect path starting at top-center
  const d = [
    `M ${p + W / 2} ${p}`,
    `L ${p + W - RX} ${p}`,
    `A ${RX} ${RX} 0 0 1 ${p + W} ${p + RX}`,
    `L ${p + W} ${p + H - RX}`,
    `A ${RX} ${RX} 0 0 1 ${p + W - RX} ${p + H}`,
    `L ${p + RX} ${p + H}`,
    `A ${RX} ${RX} 0 0 1 ${p} ${p + H - RX}`,
    `L ${p} ${p + RX}`,
    `A ${RX} ${RX} 0 0 1 ${p + RX} ${p}`,
    `L ${p + W / 2} ${p}`,
  ].join(" ");

  // Straight segments + 4 quarter-circle arcs
  const perimeter = 2 * (W - 2 * RX) + 2 * (H - 2 * RX) + 2 * Math.PI * RX;

  // Always animate from 0 on first mount so the ring fills in rather than
  // snapping to its target value. Subsequent live updates animate immediately.
  const firstMount = useRef(true);
  const [displayProg, setDisplayProg] = useState(0);
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      const t = setTimeout(() => setDisplayProg(progress), 60);
      return () => clearTimeout(t);
    }
    setDisplayProg(progress);
  }, [progress]);

  const clamped = Math.min(Math.max(displayProg, 0), 1);
  const offset  = perimeter * (1 - clamped);

  return (
    <svg
      width={W + pad * 2} height={H + pad * 2}
      viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`}
      style={{ position: "absolute", top: -pad, left: -pad, pointerEvents: "none" }}
    >
      {/* Faint full track — fades with the arc so unmounting isn't needed */}
      <path
        d={d} fill="none" stroke={BLUE} strokeWidth={SW}
        style={{
          strokeOpacity: displayProg > 0 ? 0.18 : 0,
          transition: `stroke-opacity ${MS.dProgress} ${MS.eOut}`,
        }}
      />
      {/* Progress arc */}
      <path
        d={d}
        fill="none"
        stroke={BLUE}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray={perimeter}
        strokeDashoffset={offset}
        style={{ transition: `stroke-dashoffset ${MS.dProgress} ${MS.eOut}` }}
      />
    </svg>
  );
}

// April 2026: Wed=1, Thu=2, Fri=3, Sat=4, Sun=5, Mon=6, Tue=7
const WEEK_DAYS = [
  { label: "S", fullLabel: "Sun", num: "5", id: 1 },
  { label: "M", fullLabel: "Mon", num: "6", id: 2 },
  { label: "T", fullLabel: "Tue", num: "7", id: 3 },
  { label: "W", fullLabel: "Wed", num: "1", id: 4 },
  { label: "T", fullLabel: "Thu", num: "2", id: 5 },
  { label: "F", fullLabel: "Fri", num: "3", id: 6 },
  { label: "S", fullLabel: "Sat", num: "4", id: 7 },
];

function WeekStrip({
  activeDay = CURRENT_DAY,
  currentDay = CURRENT_DAY,
  dayProgressMap = {},
  onDayChange,
}: {
  activeDay?: number;
  currentDay?: number;
  dayProgressMap?: Record<number, number>;
  onDayChange?: (day: number) => void;
}) {
  return (
    <div
      id="week-strip"
      className="flex items-center justify-between bg-white border-b border-black/5"
      style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8 }}
    >
      {WEEK_DAYS.map((d) => {
        const isActive  = d.id === activeDay;
        const isToday   = d.id === currentDay;
        const prog      = dayProgressMap[d.id] ?? 0;
        // Blue text only for today; the active (viewed) day just gets the grey background
        const textColor = isToday ? BLUE : "#000";
        const numColor  = isToday ? BLUE : "#585858";
        return (
          <div
            key={d.id}
            onClick={() => onDayChange?.(d.id)}
            className="flex flex-col items-center justify-center"
            style={{
              width: 44,
              height: 52,
              borderRadius: 12,
              background: isActive ? "#F4F4F4" : "transparent",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <DayRing progress={prog} />
            <span className="font-medium" style={{ fontSize: 12, color: textColor, lineHeight: "1.2" }}>
              {d.label}
            </span>
            <span className="font-medium" style={{ fontSize: 13, color: numColor, marginTop: 2 }}>
              {d.num}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({
  id,
  title,
  badge,
  expanded = true,
  onToggle,
}: {
  id: string;
  title: string;
  badge?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      id={id}
      className="flex items-center justify-between px-4"
      style={{ height: 44, cursor: "pointer", userSelect: "none" }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-black" style={{ fontSize: 15 }}>{title}</span>
        {badge}
      </div>
      <svg
        width="20" height="20" viewBox="0 0 20 20" fill="none"
        style={{ transition: `transform ${MS.dExpand} ${MS.eOut}`, transform: expanded ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        <path d="M5 13l5-5 5 5" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DueTodayBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: BLUE }} />
      <span className="font-medium" style={{ fontSize: 12, color: BLUE }}>Due Today ({count})</span>
    </div>
  );
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{
        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        border: checked ? "none" : "1.5px solid #ccc",
        background: checked ? BLUE : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transition: `background ${MS.dCheck} ${MS.eOut}, border ${MS.dCheck} ${MS.eOut}`,
      }}
    >
      {checked && (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1 5l4 4L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

type ForceSignal = { v: number; allDone: boolean };

function TaskCard({
  id,
  title,
  accentColor,
  tasks = [],
  initialDoneMap,
  initialChecked = false,
  onProgressChange,
  forceSignal,
}: {
  id: string;
  title: string;
  accentColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
  initialChecked?: boolean;
  onProgressChange?: (id: string, done: number, total: number) => void;
  forceSignal?: ForceSignal;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [doneMap,       setDoneMap]       = useState<Record<number, boolean>>(() => initialDoneMap ?? {});
  const [simpleChecked, setSimpleChecked] = useState(initialChecked); // used when no tasks

  const total     = tasks.length;
  const doneCount = Object.values(doneMap).filter(Boolean).length;
  const allDone   = total > 0 && doneCount === total;

  // Apply external all-done / all-undone signal from 3-day view (version-gated to avoid loops)
  const prevForceV = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!forceSignal || forceSignal.v === prevForceV.current) return;
    prevForceV.current = forceSignal.v;
    if (forceSignal.allDone) {
      if (total === 0) { setSimpleChecked(true); }
      else { const all: Record<number, boolean> = {}; tasks.forEach((_, i) => { all[i] = true; }); setDoneMap(all); }
    } else {
      setSimpleChecked(false);
      setDoneMap({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignal?.v]);

  // Report progress to parent whenever completion state changes
  useEffect(() => {
    if (total === 0) {
      onProgressChange?.(id, simpleChecked ? 1 : 0, 1);
    } else {
      onProgressChange?.(id, doneCount, total);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, simpleChecked, total]);

  // For no-task cards, fall back to a simple toggle that fills the bar
  const isChecked        = total === 0 ? simpleChecked : allDone;
  const effectiveProgress = total === 0
    ? (simpleChecked ? 1 : 0)
    : (total > 0 ? doneCount / total : 0);

  const remainingMins = tasks.reduce((sum, t, i) =>
    !doneMap[i] && t.minutes ? sum + t.minutes : sum, 0);

  const handleMainCheck = () => {
    if (total === 0) {
      setSimpleChecked((v) => !v);
      return;
    }
    if (allDone) {
      setDoneMap({});
    } else {
      const all: Record<number, boolean> = {};
      tasks.forEach((_, i) => { all[i] = true; });
      setDoneMap(all);
    }
  };

  const toggleSubtask = (i: number) =>
    setDoneMap((prev) => ({ ...prev, [i]: !prev[i] }));

  const trackH = total > 0 ? 46 : 36;
  const fillH  = Math.round(trackH * Math.min(Math.max(effectiveProgress, 0), 1));

  return (
    <div
      id={id}
      className="mx-4 bg-white"
      style={{ boxShadow: CARD_SHADOW, borderRadius: 14, overflow: "hidden" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center"
        style={{ height: total > 0 ? 77 : 60, position: "relative", paddingRight: 16 }}
      >
        {/* Progress track */}
        <div
          style={{
            position: "absolute", left: 12,
            top: "50%", transform: "translateY(-50%)",
            width: 4, height: trackH,
            borderRadius: 2,
            background: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              height: `${fillH}px`,
              borderRadius: 2,
              background: accentColor,
              transition: `height ${MS.dProgress} ${MS.eOut}`,
            }}
          />
        </div>

        {/* Text block */}
        <div style={{ marginLeft: 24, flex: 1 }}>
          <div className="font-bold text-black" style={{ fontSize: 15 }}>{title}</div>
          {total > 0 && (
            <div
              className="flex items-center gap-1 mt-1"
              style={{ cursor: "pointer", userSelect: "none", width: "fit-content" }}
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="font-normal text-black/50" style={{ fontSize: 12 }}>
                Task list ({total})
              </span>
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ transition: `transform ${MS.dExpand} ${MS.eOut}`, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M2 4l3 3 3-3" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <Checkbox checked={isChecked} onToggle={handleMainCheck} />
      </div>

      {/* ── Expanded subtask list ── */}
      {total > 0 && (
        <div
          style={{
            maxHeight: expanded ? `${tasks.length * 120 + 60}px` : "0px",
            overflow: "hidden",
            transition: expanded
              ? `max-height ${MS.dExpand} ${MS.eOut}`
              : `max-height ${MS.dExpandClose} ${MS.eInOut}`,
          }}
        >
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 16px" }} />

          {tasks.map((task, i) => (
            <div
              key={i}
              className="flex items-center"
              style={{ padding: "10px 16px", gap: 12, minHeight: 48 }}
            >
              {/* Circle subtask checkbox */}
              <div
                onClick={() => toggleSubtask(i)}
                style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  cursor: "pointer",
                  border: doneMap[i] ? "none" : "2px solid rgba(0,0,0,0.18)",
                  background: doneMap[i] ? BLUE : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: `background ${MS.dCheck} ${MS.eOut}`,
                }}
              >
                {doneMap[i] && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Task label */}
              <span className="flex-1 font-normal text-black" style={{ fontSize: 13, lineHeight: "1.3" }}>
                {task.label}
              </span>

              {/* Time estimate */}
              <div className="flex flex-col items-center" style={{ minWidth: 24 }}>
                {task.minutes !== null ? (
                  <>
                    <span className="font-bold text-black" style={{ fontSize: 13, lineHeight: 1 }}>
                      {task.minutes}
                    </span>
                    <span style={{ fontSize: 10, color: "#999", lineHeight: 1.3 }}>min</span>
                  </>
                ) : (
                  <span className="font-bold" style={{ fontSize: 13, color: "#999" }}>–</span>
                )}
              </div>
            </div>
          ))}

          {/* Remaining time footer */}
          <div
            style={{
              margin: "4px 16px 12px",
              background: "#F0F4FF",
              borderRadius: 8,
              padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 12, color: "#555" }}>Remaining Time Estimation:</span>
            <span className="font-semibold" style={{ fontSize: 12, color: "#333" }}>
              {formatRemaining(remainingMins)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CircularProgress({
  progress,   // 0–1
  color,
  size = 40,
}: {
  progress: number;
  color: string;
  size?: number;
}) {
  const strokeW  = 3;
  const r        = (size - strokeW * 2) / 2;        // radius
  const circ     = 2 * Math.PI * r;                 // full circumference
  const offset   = circ * (1 - Math.min(Math.max(progress, 0), 1));
  const cx = size / 2;
  const cy = size / 2;

  const innerR = r - strokeW - 1; // radius of the solid inner circle

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0, transform: "rotate(-90deg)" }}
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeOpacity={0.25}
        strokeWidth={strokeW}
      />
      {/* Inner filled circle */}
      <circle
        cx={cx} cy={cy} r={innerR}
        fill={color}
        opacity={0.5}
      />
      {/* Progress arc — clockwise from top */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: `stroke-dashoffset ${MS.dProgress} ${MS.eOut}` }}
      />
    </svg>
  );
}

type SubTask = { label: string; minutes: number | null };

function formatRemaining(minutes: number): string {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}:00 hr` : `${h}:${String(m).padStart(2, "0")} hr`;
}

function TimedCard({
  id,
  title,
  timeRange,
  avatarColor,
  tasks = [],
  initialDoneMap,
  initialExpanded = false,
  noHorizontalMargin = false,
  onProgressChange,
  forceSignal,
}: {
  id: string;
  title: string;
  timeRange: string;
  avatarColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
  initialExpanded?: boolean;
  noHorizontalMargin?: boolean;
  onProgressChange?: (id: string, done: number, total: number) => void;
  forceSignal?: ForceSignal;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [doneMap,  setDoneMap]  = useState<Record<number, boolean>>(() => initialDoneMap ?? {});

  const total     = tasks.length;
  const doneCount = Object.values(doneMap).filter(Boolean).length;
  const allDone   = total > 0 && doneCount === total;

  // Apply external all-done / all-undone signal from 3-day view (version-gated to avoid loops)
  const prevForceV = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!forceSignal || forceSignal.v === prevForceV.current) return;
    prevForceV.current = forceSignal.v;
    if (forceSignal.allDone) {
      const all: Record<number, boolean> = {};
      tasks.forEach((_, i) => { all[i] = true; });
      setDoneMap(all);
    } else {
      setDoneMap({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignal?.v]);

  // Report progress to parent whenever completion state changes
  useEffect(() => {
    onProgressChange?.(id, doneCount, total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, total]);

  const effectiveProgress = total > 0 ? doneCount / total : 0;
  const remainingMins     = tasks.reduce((sum, t, i) =>
    !doneMap[i] && t.minutes ? sum + t.minutes : sum, 0);

  // Main checkbox: check all / uncheck all
  const handleMainCheck = () => {
    if (allDone) {
      setDoneMap({});
    } else {
      const all: Record<number, boolean> = {};
      tasks.forEach((_, i) => { all[i] = true; });
      setDoneMap(all);
    }
  };

  // Subtask: toggle individual, auto-syncs main via allDone
  const toggleSubtask = (i: number) =>
    setDoneMap((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div
      id={id}
      className={`${noHorizontalMargin ? "" : "mx-4 "}bg-white`}
      style={{ boxShadow: CARD_SHADOW, borderRadius: 14, overflow: "hidden" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3" style={{ height: 85, padding: "0 16px" }}>
        <CircularProgress progress={effectiveProgress} color={avatarColor} />

        <div className="flex-1">
          <div className="font-bold text-black" style={{ fontSize: 15 }}>{title}</div>
          <div className="font-normal" style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{timeRange}</div>

          {/* Tappable task-list row */}
          <div
            className="flex items-center gap-1 mt-1"
            style={{ cursor: "pointer", userSelect: "none", width: "fit-content" }}
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="font-normal" style={{ fontSize: 12, color: "#999" }}>
              Task list ({total})
            </span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ transition: `transform ${MS.dExpand} ${MS.eOut}`, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M2 4l3 3 3-3" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <Checkbox checked={allDone} onToggle={handleMainCheck} />
      </div>

      {/* ── Expanded subtask list ── */}
      <div
        style={{
          maxHeight: expanded ? `${tasks.length * 120 + 60}px` : "0px",
          overflow: "hidden",
          transition: expanded
            ? `max-height ${MS.dExpand} ${MS.eOut}`
            : `max-height ${MS.dExpandClose} ${MS.eInOut}`,
        }}
      >
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 16px" }} />

        {tasks.map((task, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ padding: "10px 16px", gap: 12, minHeight: 48 }}
          >
            {/* Circle subtask checkbox */}
            <div
              onClick={() => toggleSubtask(i)}
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                cursor: "pointer",
                border: doneMap[i] ? "none" : "2px solid rgba(0,0,0,0.18)",
                background: doneMap[i] ? BLUE : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: `background ${MS.dCheck} ${MS.eOut}`,
              }}
            >
              {doneMap[i] && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Task label */}
            <span className="flex-1 font-normal text-black" style={{ fontSize: 13, lineHeight: "1.3" }}>
              {task.label}
            </span>

            {/* Time estimate */}
            <div className="flex flex-col items-center" style={{ minWidth: 24 }}>
              {task.minutes !== null ? (
                <>
                  <span className="font-bold text-black" style={{ fontSize: 13, lineHeight: 1 }}>
                    {task.minutes}
                  </span>
                  <span style={{ fontSize: 10, color: "#999", lineHeight: 1.3 }}>min</span>
                </>
              ) : (
                <span className="font-bold" style={{ fontSize: 13, color: "#999" }}>–</span>
              )}
            </div>
          </div>
        ))}

        {/* Remaining time footer */}
        <div
          style={{
            margin: "4px 16px 12px",
            background: "#F0F4FF",
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#555" }}>Remaining Time Estimation:</span>
          <span className="font-semibold" style={{ fontSize: 12, color: "#333" }}>
            {formatRemaining(remainingMins)}
          </span>
        </div>
      </div>
    </div>
  );
}

function GapBar({ id, label }: { id: string; label: string }) {
  return (
    <div
      id={id}
      className="mx-4 flex items-center justify-center"
      style={{
        height: 28,
        borderRadius: 6,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 8px)",
        backgroundColor: "#F5F5F5",
      }}
    >
      <span className="font-normal text-black/40" style={{ fontSize: 11 }}>{label}</span>
    </div>
  );
}

function FABButton() {
  return (
    <div
      id="fab-button"
      className="ms-btn absolute flex items-center justify-center"
      style={{
        right: 16,
        bottom: 83 + 18,
        width: 60,
        height: 60,
        borderRadius: 20,
        background: BLUE,
        boxShadow: `0 4px 16px ${BLUE}66`,
        zIndex: 20,
        cursor: "pointer",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M13 5v16M5 13h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function TabBar() {
  return (
    <div
      id="tab-bar"
      className="absolute bottom-0 left-0 right-0 flex border-t border-black/8 bg-white"
      style={{ height: 83 }}
    >
      {/* Schedule (active) */}
      <div id="tab-schedule" className="flex-1 flex flex-col items-center justify-center gap-1 pb-4">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="2" y="3" width="22" height="20" rx="4" stroke={BLUE} strokeWidth="2" />
          <rect x="2" y="3" width="22" height="8" rx="4" fill={BLUE} />
          <rect x="7" y="0.5" width="2.5" height="5" rx="1.25" fill={BLUE} />
          <rect x="16.5" y="0.5" width="2.5" height="5" rx="1.25" fill={BLUE} />
          <rect x="7" y="14" width="3" height="3" rx="1" fill={BLUE} />
          <rect x="11.5" y="14" width="3" height="3" rx="1" fill={BLUE} />
          <rect x="16" y="14" width="3" height="3" rx="1" fill={BLUE} />
        </svg>
        <span className="font-bold" style={{ fontSize: 11, color: BLUE }}>Schedule</span>
      </div>
      {/* Profile (inactive) */}
      <div id="tab-profile" className="flex-1 flex flex-col items-center justify-center gap-1 pb-4">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="9" r="5" stroke="#888" strokeWidth="2" />
          <path d="M3 23c0-4 4.5-7 10-7s10 3 10 7" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="font-normal" style={{ fontSize: 11, color: "#888" }}>Profile</span>
      </div>
    </div>
  );
}

// ─── iPhone 17 Pro Max Shell ──────────────────────────────────────────────────

function IPhoneShell({ children }: { children: React.ReactNode }) {
  const SCREEN_W = 393;
  const SCREEN_H = 852;
  const BEZEL = 14;
  const SHELL_W = SCREEN_W + BEZEL * 2;
  const SHELL_H = SCREEN_H + BEZEL * 2;

  return (
    <div
      style={{
        width: SHELL_W,
        height: SHELL_H,
        borderRadius: 56,
        background: "linear-gradient(145deg, #2a2a2c, #1a1a1c)",
        boxShadow:
          "0 0 0 1px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.4)",
        padding: BEZEL,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Side buttons — volume (left) */}
      <div style={{ position: "absolute", left: -3, top: 130, width: 3, height: 36, borderRadius: "2px 0 0 2px", background: "#3a3a3c" }} />
      <div style={{ position: "absolute", left: -3, top: 178, width: 3, height: 62, borderRadius: "2px 0 0 2px", background: "#3a3a3c" }} />
      <div style={{ position: "absolute", left: -3, top: 252, width: 3, height: 62, borderRadius: "2px 0 0 2px", background: "#3a3a3c" }} />
      {/* Power button (right) */}
      <div style={{ position: "absolute", right: -3, top: 188, width: 3, height: 90, borderRadius: "0 2px 2px 0", background: "#3a3a3c" }} />

      {/* Screen */}
      <div
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: 44,
          overflow: "hidden",
          position: "relative",
          background: "#fff",
        }}
      >
        {/* Dynamic Island */}
        <div
          id="dynamic-island"
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 34,
            borderRadius: 20,
            background: "#000",
            zIndex: 100,
          }}
        />
        {children}
      </div>
    </div>
  );
}

// ─── Per-day task data ────────────────────────────────────────────────────────

type TaskEntry = {
  kind: "task";
  id: string; title: string; accentColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
  initialChecked?: boolean;
};
type TimedEntry = {
  kind: "timed";
  id: string; title: string; timeRange: string;
  avatarColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
};
type GapEntry = { kind: "gap"; id: string; label: string };
type PlannedEntry = TimedEntry | GapEntry;

const DAY_CONTENT: Record<number, { anytime: TaskEntry[]; planned: PlannedEntry[] }> = {
  // ── Sunday ──────────────────────────────────────────────────────────────────
  // Pre-seeded ~75% (11/15 done)
  1: {
    anytime: [
      {
        kind: "task", id: "sun-journal", title: "Journal morning thoughts", accentColor: "#A78BFA",
        tasks: [
          { label: "Write 3 things you're grateful for", minutes: 5  },
          { label: "Reflect on yesterday's wins",        minutes: 5  },
          { label: "Set an intention for the week",      minutes: 5  },
        ],
        initialDoneMap: { 0: true, 1: true }, // 2 / 3
      },
      {
        kind: "task", id: "sun-walk", title: "Evening walk", accentColor: "#34D399",
        tasks: [], initialChecked: true,      // 1 / 1
      },
      {
        kind: "task", id: "sun-reading", title: "Catch up on reading", accentColor: "#F59E0B",
        tasks: [
          { label: "Read assigned chapter",   minutes: 20 },
          { label: "Take brief notes",        minutes: 10 },
          { label: "Look up unfamiliar terms",minutes: 5  },
          { label: "Review chapter summary",  minutes: 5  },
        ],
        initialDoneMap: { 0: true, 1: true, 2: true }, // 3 / 4
      },
    ],
    planned: [
      {
        kind: "timed", id: "sun-yoga", title: "Morning yoga",
        timeRange: "8:00AM → 8:45 AM", avatarColor: "#F472B6",
        tasks: [
          { label: "Warm-up stretches",           minutes: 5  },
          { label: "Sun salutation flow",          minutes: 15 },
          { label: "Core and balance work",        minutes: 15 },
          { label: "Cool-down and breathing",      minutes: 10 },
        ],
        initialDoneMap: { 0: true, 1: true, 2: true }, // 3 / 4
      },
      {
        kind: "timed", id: "sun-grocery", title: "Grocery run",
        timeRange: "11:00AM → 12:00 PM", avatarColor: "#4ADE80",
        tasks: [
          { label: "Write shopping list",          minutes: 5  },
          { label: "Check pantry for stock",       minutes: 5  },
          { label: "Drive to store and shop",      minutes: 40 },
        ],
        initialDoneMap: { 0: true, 1: true }, // 2 / 3
      },
    ],
  },

  // ── Monday (current day) ─────────────────────────────────────────────────────
  2: {
    anytime: [
      {
        kind: "task", id: "card-biology-study", title: "Biology study", accentColor: "#7BC875",
        tasks: [
          { label: "Review chapter notes",             minutes: 15 },
          { label: "Read assigned textbook pages",     minutes: 20 },
          { label: "Watch lecture recap video",        minutes: 10 },
          { label: "Solve practice problems",          minutes: 15 },
          { label: "Review diagrams and figures",      minutes: 10 },
          { label: "Write key term definitions",       minutes: 10 },
          { label: "Complete practice quiz",           minutes: 15 },
          { label: "Review quiz answers",              minutes: 5  },
        ],
      },
      {
        kind: "task", id: "card-math-prep", title: "Math prep", accentColor: "#D1AB30",
        tasks: [
          { label: "Review class notes",               minutes: 10 },
          { label: "Read textbook section",            minutes: 15 },
          { label: "Watch tutorial video",             minutes: 10 },
          { label: "Solve example problems",           minutes: 20 },
          { label: "Check answers and correct errors", minutes: 10 },
          { label: "Complete assigned exercises",      minutes: 25 },
          { label: "Review formulas and theorems",     minutes: 10 },
          { label: "Practice mental math",             minutes: 5  },
          { label: "Prepare questions for tutor",      minutes: 5  },
          { label: "Summarize key concepts",           minutes: 5  },
          { label: "Test yourself with flashcards",    minutes: 10 },
        ],
      },
      {
        kind: "task", id: "card-reading", title: "15 min reading", accentColor: "#A6A6A6",
        tasks: [],
      },
    ],
    planned: [
      {
        kind: "timed", id: "card-go-for-a-run", title: "Go for a run",
        timeRange: "8:00AM → 9:00 AM", avatarColor: "#7BC875",
        tasks: [
          { label: "Put on running shoes and gear",                    minutes: 4  },
          { label: "Check route conditions and set a distance goal",   minutes: 5  },
          { label: "Start with an easy trail jog",                     minutes: 20 },
          { label: "Rehydrate with a few sips of water",               minutes: 5  },
          { label: "Push effort on bleachers",                         minutes: 16 },
          { label: "Maintain steady breathing and form",               minutes: null },
          { label: "Finish with a short recovery walk",                minutes: 10 },
        ],
      },
      { kind: "gap", id: "gap-1hr", label: "1:00hr gap" },
      {
        kind: "timed", id: "card-biology-class", title: "Biology class",
        timeRange: "10:00AM → 11:00 AM", avatarColor: "#558BF7",
        tasks: [
          { label: "Review last lecture notes",          minutes: 10   },
          { label: "Complete assigned reading",          minutes: 20   },
          { label: "Prepare questions for professor",    minutes: 5    },
          { label: "Participate in class discussion",    minutes: null },
          { label: "Write a brief post-class summary",   minutes: 10   },
          { label: "Schedule office hours if needed",    minutes: 5    },
          { label: "Update study calendar",              minutes: 5    },
          { label: "Start homework outline",             minutes: 5    },
        ],
      },
      { kind: "gap", id: "gap-30min", label: "30min gap" },
      {
        kind: "timed", id: "card-clean-dorm", title: "Clean dorm room",
        timeRange: "11:30AM → 12:00 PM", avatarColor: "#A6A6A6",
        tasks: [
          { label: "Clear desk and put away books",  minutes: 5    },
          { label: "Make the bed",                   minutes: 3    },
          { label: "Vacuum or sweep the floor",      minutes: 7    },
          { label: "Take out the trash",             minutes: 2    },
          { label: "Wipe down surfaces",             minutes: 5    },
          { label: "Organize closet",                minutes: 8    },
          { label: "Do laundry",                     minutes: null },
          { label: "Restock supplies",               minutes: 5    },
        ],
      },
    ],
  },

  // ── Tuesday ──────────────────────────────────────────────────────────────────
  3: {
    anytime: [
      {
        kind: "task", id: "tue-chem-study", title: "Chemistry study", accentColor: "#60C6E8",
        tasks: [
          { label: "Review lecture slides",              minutes: 15 },
          { label: "Read textbook chapter",              minutes: 20 },
          { label: "Re-do sample problems",              minutes: 20 },
          { label: "Highlight key equations",            minutes: 10 },
          { label: "Write summary card",                 minutes: 10 },
        ],
      },
      {
        kind: "task", id: "tue-essay", title: "Draft essay outline", accentColor: "#F87171",
        tasks: [
          { label: "Re-read the prompt",                 minutes: 5  },
          { label: "Brainstorm main arguments",          minutes: 15 },
          { label: "Research supporting evidence",       minutes: 25 },
          { label: "Build section outline",              minutes: 15 },
          { label: "Write thesis statement",             minutes: 10 },
        ],
      },
    ],
    planned: [
      {
        kind: "timed", id: "tue-chem-lab", title: "Chemistry lab",
        timeRange: "9:00AM → 11:00 AM", avatarColor: "#60C6E8",
        tasks: [
          { label: "Review lab safety protocols",        minutes: 5  },
          { label: "Set up equipment",                   minutes: 10 },
          { label: "Run experiment procedure",           minutes: 50 },
          { label: "Record observations",                minutes: 15 },
          { label: "Clean and return equipment",         minutes: 10 },
          { label: "Start lab report",                   minutes: 20 },
        ],
      },
      { kind: "gap", id: "tue-gap-2hr", label: "2:00hr gap" },
      {
        kind: "timed", id: "tue-study-group", title: "Study group",
        timeRange: "1:00PM → 2:30 PM", avatarColor: "#A78BFA",
        tasks: [
          { label: "Prepare discussion questions",       minutes: 10 },
          { label: "Review each member's notes",         minutes: 20 },
          { label: "Work through practice problems",     minutes: 40 },
          { label: "Assign follow-up tasks",             minutes: 10 },
        ],
      },
    ],
  },

  // ── Wednesday ────────────────────────────────────────────────────────────────
  4: {
    anytime: [
      {
        kind: "task", id: "wed-history", title: "History reading", accentColor: "#C084FC",
        tasks: [
          { label: "Read chapter 7",                     minutes: 30 },
          { label: "Annotate key passages",              minutes: 15 },
          { label: "Write a one-page summary",           minutes: 20 },
          { label: "Connect to class lecture",           minutes: 10 },
        ],
      },
      {
        kind: "task", id: "wed-laundry", title: "Do laundry", accentColor: "#94A3B8",
        tasks: [],
      },
    ],
    planned: [
      {
        kind: "timed", id: "wed-gym", title: "Gym workout",
        timeRange: "7:00AM → 8:00 AM", avatarColor: "#F97316",
        tasks: [
          { label: "5 min warm-up on treadmill",         minutes: 5  },
          { label: "Upper body compound lifts",          minutes: 25 },
          { label: "Core circuit",                       minutes: 15 },
          { label: "Cool-down stretch",                  minutes: 10 },
        ],
      },
      { kind: "gap", id: "wed-gap-3hr", label: "3:00hr gap" },
      {
        kind: "timed", id: "wed-stats-class", title: "Statistics class",
        timeRange: "11:00AM → 12:00 PM", avatarColor: "#558BF7",
        tasks: [
          { label: "Review homework before class",       minutes: 10 },
          { label: "Take detailed lecture notes",        minutes: 45 },
          { label: "Note any confusing topics",          minutes: 5  },
        ],
      },
    ],
  },

  // ── Thursday ─────────────────────────────────────────────────────────────────
  5: {
    anytime: [
      {
        kind: "task", id: "thu-physics", title: "Physics problem set", accentColor: "#38BDF8",
        tasks: [
          { label: "Read problem set instructions",      minutes: 5  },
          { label: "Attempt problems 1–5",               minutes: 30 },
          { label: "Review relevant formulas",           minutes: 10 },
          { label: "Attempt problems 6–10",              minutes: 30 },
          { label: "Check answers with solutions manual",minutes: 15 },
          { label: "Write up final solutions neatly",    minutes: 20 },
        ],
      },
      {
        kind: "task", id: "thu-email", title: "Email professor", accentColor: "#FB923C",
        tasks: [],
      },
    ],
    planned: [
      {
        kind: "timed", id: "thu-physics-lecture", title: "Physics lecture",
        timeRange: "10:00AM → 11:30 AM", avatarColor: "#38BDF8",
        tasks: [
          { label: "Review last class notes",            minutes: 10 },
          { label: "Listen and take notes",              minutes: 70 },
          { label: "Ask clarifying questions",           minutes: 10 },
        ],
      },
      { kind: "gap", id: "thu-gap-30min", label: "30min gap" },
      {
        kind: "timed", id: "thu-office-hours", title: "Office hours",
        timeRange: "12:00PM → 12:30 PM", avatarColor: "#A78BFA",
        tasks: [
          { label: "Prepare specific questions",         minutes: 5  },
          { label: "Discuss problem set issues",         minutes: 20 },
          { label: "Note professor's guidance",          minutes: 5  },
        ],
      },
    ],
  },

  // ── Friday ───────────────────────────────────────────────────────────────────
  6: {
    anytime: [
      {
        kind: "task", id: "fri-review", title: "Review week notes", accentColor: "#4ADE80",
        tasks: [
          { label: "Compile notes from each class",      minutes: 15 },
          { label: "Highlight unresolved questions",     minutes: 10 },
          { label: "Create a weekly summary page",       minutes: 20 },
          { label: "Flag topics to revisit over weekend",minutes: 5  },
        ],
      },
      {
        kind: "task", id: "fri-weekend-plan", title: "Weekend planning", accentColor: "#FACC15",
        tasks: [
          { label: "List weekend priorities",            minutes: 5  },
          { label: "Block study time on calendar",       minutes: 5  },
          { label: "Plan social or rest activity",       minutes: 5  },
        ],
      },
    ],
    planned: [
      {
        kind: "timed", id: "fri-stats-lab", title: "Stats lab",
        timeRange: "9:00AM → 10:00 AM", avatarColor: "#558BF7",
        tasks: [
          { label: "Open dataset in R/Python",           minutes: 5  },
          { label: "Run assigned analyses",              minutes: 30 },
          { label: "Interpret output",                   minutes: 15 },
          { label: "Write brief lab summary",            minutes: 10 },
        ],
      },
      { kind: "gap", id: "fri-gap-2hr", label: "2:00hr gap" },
      {
        kind: "timed", id: "fri-club", title: "Campus club meeting",
        timeRange: "12:00PM → 1:00 PM", avatarColor: "#F472B6",
        tasks: [
          { label: "Review meeting agenda",              minutes: 5  },
          { label: "Attend and take notes",              minutes: 45 },
          { label: "Follow up on action items",          minutes: 10 },
        ],
      },
    ],
  },

  // ── Saturday ─────────────────────────────────────────────────────────────────
  7: {
    anytime: [
      {
        kind: "task", id: "sat-clean", title: "Deep clean room", accentColor: "#94A3B8",
        tasks: [
          { label: "Declutter desk and shelves",         minutes: 15 },
          { label: "Wipe down all surfaces",             minutes: 10 },
          { label: "Vacuum and mop floor",               minutes: 15 },
          { label: "Organise wardrobe",                  minutes: 20 },
          { label: "Take out trash and recycling",       minutes: 5  },
        ],
      },
      {
        kind: "task", id: "sat-mealprep", title: "Meal prep", accentColor: "#34D399",
        tasks: [
          { label: "Plan meals for the week",            minutes: 10 },
          { label: "Write grocery list",                 minutes: 5  },
          { label: "Cook grains and proteins",           minutes: 40 },
          { label: "Chop and store vegetables",          minutes: 20 },
          { label: "Portion into containers",            minutes: 10 },
        ],
      },
    ],
    planned: [
      {
        kind: "timed", id: "sat-run", title: "Morning run",
        timeRange: "7:00AM → 8:00 AM", avatarColor: "#7BC875",
        tasks: [
          { label: "Dynamic warm-up",                    minutes: 5  },
          { label: "Easy 5 km run",                      minutes: 30 },
          { label: "Sprint intervals",                   minutes: 10 },
          { label: "Cool-down walk and stretch",         minutes: 10 },
        ],
      },
      { kind: "gap", id: "sat-gap-4hr", label: "4:00hr gap" },
      {
        kind: "timed", id: "sat-library", title: "Library study session",
        timeRange: "12:00PM → 3:00 PM", avatarColor: "#D1AB30",
        tasks: [
          { label: "Arrive and set up workspace",        minutes: 5  },
          { label: "Work through priority assignments",  minutes: 90 },
          { label: "Take a 10-min break",                minutes: 10 },
          { label: "Continue with secondary tasks",      minutes: 50 },
          { label: "Pack up and review tomorrow's plan", minutes: 5  },
        ],
      },
    ],
  },
};

// ─── Day Content ─────────────────────────────────────────────────────────────
// Rendered for every day simultaneously (display:none when inactive) so card
// state is never lost when switching days.

function DayContent({
  dayId,
  isVisible,
  progressMap,
  onProgressChange,
  forceSignals = {},
}: {
  dayId: number;
  isVisible: boolean;
  progressMap: Record<string, { done: number; total: number }>;
  onProgressChange: (id: string, done: number, total: number) => void;
  forceSignals?: Record<string, ForceSignal>;
}) {
  const anytimeRef = useRef<HTMLDivElement>(null);
  const plannedRef = useRef<HTMLDivElement>(null);
  const [anytimeExpanded, setAnytimeExpanded] = useState(true);
  const [plannedExpanded, setPlannedExpanded] = useState(true);

  const anytimeMaxH = anytimeExpanded
    ? `${(anytimeRef.current?.scrollHeight ?? 600) + 400}px` : "0px";
  const plannedMaxH = plannedExpanded
    ? `${(plannedRef.current?.scrollHeight ?? 800) + 400}px` : "0px";

  const day = DAY_CONTENT[dayId];

  // Due Today: anytime cards not yet fully completed
  const anytimeIds = new Set(day?.anytime.map((c) => c.id) ?? []);
  const completedCards = Object.entries(progressMap).filter(
    ([id, { done, total }]) => anytimeIds.has(id) && total > 0 && done === total
  ).length;
  const dueToday = anytimeIds.size - completedCards;

  return (
    <div style={{ display: isVisible ? "block" : "none", paddingBottom: 100 }}>
      {/* ── Anytime Section ── */}
      <SectionHeader
        id={`anytime-header-${dayId}`}
        title="Anytime"
        badge={<DueTodayBadge count={dueToday} />}
        expanded={anytimeExpanded}
        onToggle={() => setAnytimeExpanded((v) => !v)}
      />
      <div
        style={{
          maxHeight: anytimeMaxH, overflow: "hidden",
          transition: anytimeExpanded
            ? `max-height ${MS.dExpand} ${MS.eOut}`
            : `max-height ${MS.dExpandClose} ${MS.eInOut}`,
        }}
      >
        <div ref={anytimeRef} className="flex flex-col gap-2" style={{ paddingBottom: 8 }}>
          {day?.anytime.map((c) => (
            <TaskCard
              key={c.id} id={c.id} title={c.title} accentColor={c.accentColor}
              tasks={c.tasks} initialDoneMap={c.initialDoneMap}
              initialChecked={c.initialChecked}
              onProgressChange={onProgressChange}
              forceSignal={forceSignals[c.id]}
            />
          ))}
        </div>
      </div>

      {/* ── Planned Section ── */}
      <SectionHeader
        id={`planned-header-${dayId}`}
        title="Planned"
        expanded={plannedExpanded}
        onToggle={() => setPlannedExpanded((v) => !v)}
      />
      <div
        style={{
          maxHeight: plannedMaxH, overflow: "hidden",
          transition: plannedExpanded
            ? `max-height ${MS.dExpand} ${MS.eOut}`
            : `max-height ${MS.dExpandClose} ${MS.eInOut}`,
        }}
      >
        <div ref={plannedRef} className="flex flex-col gap-2" style={{ paddingBottom: 8 }}>
          {day?.planned.map((c) =>
            c.kind === "gap" ? (
              <GapBar key={c.id} id={c.id} label={c.label} />
            ) : (
              <TimedCard
                key={c.id} id={c.id} title={c.title}
                timeRange={c.timeRange} avatarColor={c.avatarColor}
                tasks={c.tasks} initialDoneMap={c.initialDoneMap}
                onProgressChange={onProgressChange}
                forceSignal={forceSignals[c.id]}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact cards (3-day view) ───────────────────────────────────────────────

function CompactTaskCard({
  title,
  accentColor,
  done,
  total,
  onToggle,
}: {
  title: string;
  accentColor: string;
  done: number;
  total: number;
  onToggle?: () => void;
}) {
  const progress  = total > 0 ? done / total : done;
  const isChecked = total > 0 && done === total;
  const fillPct   = `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%`;

  return (
    <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 8, overflow: "hidden" }}>
      <div
        className="flex items-center"
        style={{ minHeight: 52, position: "relative", paddingLeft: 20, paddingRight: 12, paddingTop: 8, paddingBottom: 8 }}
      >
        {/* Progress bar — spans from top padding to bottom padding */}
        <div
          style={{
            position: "absolute", left: 8, top: 8, bottom: 8,
            width: 4, borderRadius: 2,
            background: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: fillPct, borderRadius: 2, background: accentColor,
              transition: `height ${MS.dProgress} ${MS.eOut}`,
            }}
          />
        </div>
        <span className="font-bold text-black flex-1" style={{ fontSize: 14, lineHeight: "1.3" }}>
          {title}
        </span>
        {/* Tappable circle checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginLeft: 8,
            border: isChecked ? "none" : "2px solid rgba(0,0,0,0.18)",
            background: isChecked ? BLUE : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: `background ${MS.dCheck} ${MS.eOut}`,
          }}
        >
          {isChecked && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactTimedCard({
  title,
  timeRange,
  avatarColor,
  done,
  total,
  onToggle,
}: {
  title: string;
  timeRange: string;
  avatarColor: string;
  done: number;
  total: number;
  onToggle?: () => void;
}) {
  const progress  = total > 0 ? done / total : 0;
  const isChecked = total > 0 && done === total;
  const fillPct   = `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%`;

  return (
    <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 8, overflow: "hidden" }}>
      <div
        className="flex items-center"
        style={{ minHeight: 60, position: "relative", paddingLeft: 20, paddingRight: 12, paddingTop: 8, paddingBottom: 8 }}
      >
        {/* Linear progress bar — spans from top padding to bottom padding */}
        <div
          style={{
            position: "absolute", left: 8, top: 8, bottom: 8,
            width: 4, borderRadius: 2,
            background: `color-mix(in srgb, ${avatarColor} 25%, transparent)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: fillPct, borderRadius: 2, background: avatarColor,
              transition: `height ${MS.dProgress} ${MS.eOut}`,
            }}
          />
        </div>
        {/* Title + time */}
        <div className="flex-1 min-w-0" style={{ marginRight: 8 }}>
          <div className="font-bold text-black" style={{ fontSize: 14, lineHeight: "1.3" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{timeRange}</div>
        </div>
        {/* Tappable circle checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: isChecked ? "none" : "2px solid rgba(0,0,0,0.18)",
            background: isChecked ? BLUE : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: `background ${MS.dCheck} ${MS.eOut}`,
          }}
        >
          {isChecked && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day column (used inside 3-day view) ──────────────────────────────────────

function DayColumn({
  dayId,
  currentDay,
  cardProgressMap,
  onProgressChange,
  onForceSignal,
  showDivider,
}: {
  dayId: number;
  currentDay: number;
  cardProgressMap: Record<string, { done: number; total: number }>;
  onProgressChange: (id: string, done: number, total: number) => void;
  onForceSignal: (id: string, allDone: boolean) => void;
  showDivider: boolean;
}) {
  const day = DAY_CONTENT[dayId];
  const dayInfo = WEEK_DAYS.find((d) => d.id === dayId)!;
  const isToday = dayId === currentDay;

  // Measure the header card's actual pixel width so DayRing can trace it
  const headerCardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(80);
  useEffect(() => {
    const el = headerCardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setCardWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const anytime = day?.anytime ?? [];
  const planned = day?.planned ?? []; // ALL entries including GapEntry

  const visibleAnytime = anytime.slice(0, 3);
  const extraAnytime = Math.max(0, anytime.length - 3);

  // Blue dot: any anytime card incomplete
  const anytimeIds = new Set(anytime.map((t) => t.id));
  const completedCount = Object.entries(cardProgressMap).filter(
    ([id, { done, total }]) => anytimeIds.has(id) && total > 0 && done === total
  ).length;
  const hasIncomplete = anytime.length > 0 && completedCount < anytime.length;

  // Toggle a card: if all done → uncheck all; if not → check all.
  // Also fires onForceSignal so the Day view's TaskCard/TimedCard syncs state.
  const makeToggle = (id: string, defaultTotal: number) => () => {
    const e = cardProgressMap[id];
    const total = e?.total ?? defaultTotal;
    const done  = e?.done  ?? 0;
    const willBeAllDone = done !== total;
    onProgressChange(id, willBeAllDone ? total : 0, total);
    onForceSignal(id, willBeAllDone);
  };

  // Ring: sum all tracked cards
  const { rDone, rTotal } = Object.values(cardProgressMap).reduce(
    (acc, e) => ({ rDone: acc.rDone + e.done, rTotal: acc.rTotal + e.total }),
    { rDone: 0, rTotal: 0 }
  );
  const ringProgress = rTotal > 0 ? rDone / rTotal : 0;

  return (
    <div
      style={{
        flex: 1, minWidth: 0,
        borderRight: showDivider ? "1px solid rgba(0,0,0,0.08)" : "none",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Day header — full column width card */}
      <div style={{ padding: "8px 5px 4px" }}>
        <div
          ref={headerCardRef}
          style={{
            position: "relative",
            borderRadius: 12,
            background: isToday ? `color-mix(in srgb, ${BLUE} 8%, #F4F4F4)` : "#F4F4F4",
            height: 62,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            // overflow: visible so ring stroke can bleed 3 px outside the card
          }}
        >
          {/* Ring traces the full card border */}
          <DayRing progress={ringProgress} W={cardWidth} H={62} RX={12} />
          {/* Day label + number */}
          <span className="font-semibold" style={{ fontSize: 13, color: isToday ? BLUE : "#000", lineHeight: "1.15" }}>
            {dayInfo.fullLabel}
          </span>
          <span className="font-bold" style={{ fontSize: 15, color: isToday ? BLUE : "#3a3a3a", marginTop: 1 }}>
            {dayInfo.num}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 5px", paddingBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>

        {/* ── Anytime white card ── */}
        <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 10, padding: "8px 7px" }}>
          {/* Label row */}
          <div className="flex items-center gap-1" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888" }}>Anytime</span>
            {hasIncomplete && (
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: BLUE, flexShrink: 0 }} />
            )}
          </div>
          {/* Cards */}
          <div className="flex flex-col gap-1.5">
            {visibleAnytime.map((c) => {
              const e = cardProgressMap[c.id];
              const defaultTotal = c.tasks && c.tasks.length > 0 ? c.tasks.length : 1;
              return (
                <CompactTaskCard
                  key={c.id}
                  title={c.title}
                  accentColor={c.accentColor}
                  done={e?.done ?? 0}
                  total={e?.total ?? defaultTotal}
                  onToggle={makeToggle(c.id, defaultTotal)}
                />
              );
            })}
            {extraAnytime > 0 && (
              <div style={{ fontSize: 10, color: BLUE, fontWeight: 500, paddingLeft: 2, paddingTop: 2 }}>
                View more (+{extraAnytime})
              </div>
            )}
          </div>
        </div>

        {/* ── Scheduled white card ── */}
        {planned.length > 0 && (
          <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 10, padding: "8px 7px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#888", marginBottom: 6 }}>
              Scheduled
            </div>
            <div className="flex flex-col gap-1.5">
              {planned.map((c) => {
                if (c.kind === "gap") {
                  // Inline compact gap bar (no mx-4 margins)
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-center"
                      style={{
                        height: 18, borderRadius: 4,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)",
                        backgroundColor: "#F5F5F5",
                      }}
                    >
                      <span style={{ fontSize: 8.5, color: "#aaa" }}>{c.label}</span>
                    </div>
                  );
                }
                const e = cardProgressMap[c.id];
                const defaultTotal = c.tasks && c.tasks.length > 0 ? c.tasks.length : 1;
                return (
                  <CompactTimedCard
                    key={c.id}
                    title={c.title}
                    timeRange={c.timeRange}
                    avatarColor={c.avatarColor}
                    done={e?.done ?? 0}
                    total={e?.total ?? defaultTotal}
                    onToggle={makeToggle(c.id, defaultTotal)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 3-Day view ───────────────────────────────────────────────────────────────

const TD_ANIM_MS = 260; // slide animation duration

function ThreeDayView({
  start,
  onStartChange,
  currentDay,
  progressMaps,
  progressHandlers,
  onForceSignal,
  bottomPadding = 100,
}: {
  start: number; // page-aligned: 1, 4, or 7
  onStartChange: (s: number) => void;
  currentDay: number;
  progressMaps: Record<number, Record<string, { done: number; total: number }>>;
  progressHandlers: Record<number, (id: string, done: number, total: number) => void>;
  onForceSignal: (dayId: number, cardId: string, allDone: boolean) => void;
  bottomPadding?: number;
}) {
  // Tracks what's currently rendered vs. what's animating out
  const [visibleStart, setVisibleStart] = useState(start);
  const [exitStart,    setExitStart]    = useState<number | null>(null);
  const [slideDir,     setSlideDir]     = useState<"left" | "right" | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React to `start` changes from the parent (swipe or Today-jump)
  useEffect(() => {
    if (start === visibleStart) return;
    const dir = start > visibleStart ? "left" : "right";

    if (animTimer.current) clearTimeout(animTimer.current);

    setExitStart(visibleStart);
    setSlideDir(dir);
    setVisibleStart(start);

    animTimer.current = setTimeout(() => {
      setExitStart(null);
      setSlideDir(null);
    }, TD_ANIM_MS + 20); // slight buffer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // Swipe detection — navigate in steps of 3 (full page)
  const swipe = useRef({ startX: 0, startY: 0, active: false });
  const MAX_PAGE_START = 7; // last valid page start (day 7)

  const getDays = (s: number) =>
    [s, s + 1, s + 2].filter((d) => d >= 1 && d <= 7);

  const slideInAnim  = slideDir === "left"  ? "tdSlideInRight"  : "tdSlideInLeft";
  const slideOutAnim = slideDir === "left"  ? "tdSlideOutLeft"  : "tdSlideOutRight";

  return (
    <div
      style={{ position: "relative", overflow: "hidden", paddingBottom: bottomPadding }}
      onPointerDown={(e) => { swipe.current = { startX: e.clientX, startY: e.clientY, active: true }; }}
      onPointerUp={(e) => {
        if (!swipe.current.active) return;
        swipe.current.active = false;
        const dx = e.clientX - swipe.current.startX;
        const dy = e.clientY - swipe.current.startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            // Swipe left → next page
            const next = start + 3;
            if (next <= MAX_PAGE_START) onStartChange(next);
          } else {
            // Swipe right → previous page
            const prev = start - 3;
            if (prev >= 1) onStartChange(prev);
          }
        }
      }}
      onPointerCancel={() => { swipe.current.active = false; }}
    >
      {/* Exiting panel — absolutely placed, slides out via keyframe */}
      {exitStart !== null && slideDir && (
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex",
            animation: `${slideOutAnim} ${TD_ANIM_MS}ms ${MS.eOut} both`,
          }}
        >
          {getDays(exitStart).map((dayId, i, arr) => (
            <DayColumn
              key={dayId} dayId={dayId} currentDay={currentDay}
              cardProgressMap={progressMaps[dayId] ?? {}}
              onProgressChange={progressHandlers[dayId]}
              onForceSignal={(cardId, allDone) => onForceSignal(dayId, cardId, allDone)}
              showDivider={i < arr.length - 1}
            />
          ))}
        </div>
      )}

      {/* Entering panel — remounts on each navigation, slides in via keyframe */}
      <div
        key={visibleStart}
        style={{
          display: "flex",
          animation: slideDir
            ? `${slideInAnim} ${TD_ANIM_MS}ms ${MS.eOut} both`
            : undefined,
        }}
      >
        {getDays(visibleStart).map((dayId, i, arr) => (
          <DayColumn
            key={dayId} dayId={dayId} currentDay={currentDay}
            cardProgressMap={progressMaps[dayId] ?? {}}
            onProgressChange={progressHandlers[dayId]}
            onForceSignal={(cardId, allDone) => onForceSignal(dayId, cardId, allDone)}
            showDivider={i < arr.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

const BASE_YEAR  = 2026;
const BASE_MONTH = 3; // April (JS month, 0-indexed)
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const FULL_DAY_NAMES = [
  "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday",
];

function getMonthInfo(offset: number) {
  let m = BASE_MONTH + offset;
  let y = BASE_YEAR;
  while (m < 0)  { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  const firstDay    = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return {
    year: y, month: m,
    daysInMonth,
    startDow:  firstDay.getDay(), // 0 = Sunday
    monthName: MONTH_NAMES[m],
    yearStr:   String(y),
  };
}

// April 1, 2026 = Wednesday (JS getDay() = 3).
// Our week IDs: 1=Sun … 7=Sat. Mapping April dates 1-7 to week day IDs:
//   Apr 1(Wed)→4, 2(Thu)→5, 3(Fri)→6, 4(Sat)→7, 5(Sun)→1, 6(Mon)→2, 7(Tue)→3
const APRIL_START_DOW = 3; // Wednesday
const APRIL_DATE_TO_DAYID: Record<number, number> = {
  1: 4, 2: 5, 3: 6, 4: 7, 5: 1, 6: 2, 7: 3,
};
// CURRENT_DAY=2 (Monday) corresponds to April 6 in our prototype month
const MONTH_TODAY_DATE = 6;

function MonthCellRing({ progress, size = 26 }: { progress: number; size?: number }) {
  const sw = 2;
  const r  = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset  = circ * (1 - clamped);
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%) rotate(-90deg)",
        pointerEvents: "none",
      }}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BLUE} strokeWidth={sw}
        strokeOpacity={progress > 0 ? 0.18 : 0}
        style={{ transition: `stroke-opacity ${MS.dProgress} ${MS.eOut}` }}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BLUE} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: `stroke-dashoffset ${MS.dProgress} ${MS.eOut}` }}
      />
    </svg>
  );
}

// One month's calendar grid — extracted so MonthView can animate between months
function MonthGrid({
  offset,
  progressMaps,
  onDayTap,
}: {
  offset: number;
  progressMaps: Record<number, Record<string, { done: number; total: number }>>;
  onDayTap: (date: number, dayId: number | null) => void;
}) {
  const { daysInMonth, startDow } = getMonthInfo(offset);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["S","M","T","W","T","F","S"];

  const getDotColors = (date: number): string[] => {
    const dayId = offset === 0 ? APRIL_DATE_TO_DAYID[date] : undefined;
    if (!dayId) return [];
    const day = DAY_CONTENT[dayId];
    if (!day) return [];
    const colors: string[] = [];
    for (const t of day.anytime) colors.push(t.accentColor);
    for (const t of day.planned) if (t.kind === "timed") colors.push(t.avatarColor);
    return colors;
  };

  const getRingProgress = (date: number): number => {
    const dayId = offset === 0 ? APRIL_DATE_TO_DAYID[date] : undefined;
    if (!dayId) return 0;
    const map  = progressMaps[dayId] ?? {};
    const vals = Object.values(map);
    if (vals.length === 0) return 0;
    const { done, total } = vals.reduce(
      (acc, e) => ({ done: acc.done + e.done, total: acc.total + e.total }),
      { done: 0, total: 0 }
    );
    return total > 0 ? done / total : 0;
  };

  return (
    <div style={{ padding: "0 8px" }}>
      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 4 }}>
        {DOW_LABELS.map((lbl, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#c0c0c0", paddingBottom: 2 }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 48px))", gap: 8, justifyContent: "space-between" }}>
            {week.map((date, di) => {
              if (date === null) {
                return <div key={di} style={{ height: 72 }} />;
              }

              const isToday  = offset === 0 && date === MONTH_TODAY_DATE;
              const dayId    = offset === 0 ? (APRIL_DATE_TO_DAYID[date] ?? null) : null;
              const hasTasks = dayId !== null;
              const ringProg = getRingProgress(date);

              // Show up to 4 dots; if there are more, show 4 dots + "+N" (5 elements total)
              const allDots = getDotColors(date);
              type DotEl = { kind: "dot"; color: string } | { kind: "more"; n: number };
              const dotElems: DotEl[] =
                allDots.length <= 4
                  ? allDots.map((c) => ({ kind: "dot", color: c }))
                  : [
                      ...allDots.slice(0, 4).map((c): DotEl => ({ kind: "dot", color: c })),
                      { kind: "more", n: allDots.length - 4 },
                    ];
              const dotRows: DotEl[][] = [];
              for (let i = 0; i < dotElems.length; i += 3) dotRows.push(dotElems.slice(i, i + 3));

              return (
                <div
                  key={di}
                  onClick={() => hasTasks && onDayTap(date, dayId)}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: CARD_SHADOW,
                    height: 72,
                    display: "flex", flexDirection: "column",
                    alignItems: "center",
                    padding: "7px 3px 8px",
                    cursor: hasTasks ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {/* Dot rows — 8×8, max 3 per row, centered, +N counts as a dot slot */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", minHeight: 20, marginBottom: 3 }}>
                    {dotRows.map((row, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        {row.map((el, ei) =>
                          el.kind === "dot" ? (
                            <div key={ei} style={{ width: 8, height: 8, borderRadius: "50%", background: el.color, flexShrink: 0 }} />
                          ) : (
                            <span key={ei} style={{ fontSize: 8, color: "#aaa", fontWeight: 600, lineHeight: "8px" }}>+{el.n}</span>
                          )
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Date number + progress ring */}
                  <div style={{ position: "relative", width: 26, height: 26, marginTop: "auto" }}>
                    <MonthCellRing progress={ringProg} size={26} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, lineHeight: 1, fontWeight: isToday ? 700 : 500, color: isToday ? BLUE : "#1a1a1a" }}>
                        {date}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  monthOffset,
  onMonthChange,
  progressMaps,
  onDayTap,
}: {
  monthOffset: number;
  onMonthChange: (offset: number) => void;
  progressMaps: Record<number, Record<string, { done: number; total: number }>>;
  onDayTap: (date: number, dayId: number | null) => void;
}) {
  const [visibleOffset, setVisibleOffset] = useState(monthOffset);
  const [exitOffset,    setExitOffset]    = useState<number | null>(null);
  const [slideDir,      setSlideDir]      = useState<"left" | "right" | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (monthOffset === visibleOffset) return;
    const dir = monthOffset > visibleOffset ? "left" : "right";
    if (animTimer.current) clearTimeout(animTimer.current);
    setExitOffset(visibleOffset);
    setSlideDir(dir);
    setVisibleOffset(monthOffset);
    animTimer.current = setTimeout(() => {
      setExitOffset(null);
      setSlideDir(null);
    }, TD_ANIM_MS + 20);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  const swipe = useRef({ startX: 0, startY: 0, active: false });
  const slideInAnim  = slideDir === "left" ? "tdSlideInRight" : "tdSlideInLeft";
  const slideOutAnim = slideDir === "left" ? "tdSlideOutLeft" : "tdSlideOutRight";

  return (
    <div
      style={{ position: "relative", overflow: "hidden", paddingBottom: 100 }}
      onPointerDown={(e) => { swipe.current = { startX: e.clientX, startY: e.clientY, active: true }; }}
      onPointerUp={(e) => {
        if (!swipe.current.active) return;
        swipe.current.active = false;
        const dx = e.clientX - swipe.current.startX;
        const dy = e.clientY - swipe.current.startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          onMonthChange(dx < 0 ? monthOffset + 1 : monthOffset - 1);
        }
      }}
      onPointerCancel={() => { swipe.current.active = false; }}
    >
      {/* Exiting panel */}
      {exitOffset !== null && slideDir && (
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0,
            animation: `${slideOutAnim} ${TD_ANIM_MS}ms ${MS.eOut} both`,
          }}
        >
          <MonthGrid offset={exitOffset} progressMaps={progressMaps} onDayTap={onDayTap} />
        </div>
      )}

      {/* Entering panel */}
      <div
        key={visibleOffset}
        style={{ animation: slideDir ? `${slideInAnim} ${TD_ANIM_MS}ms ${MS.eOut} both` : undefined }}
      >
        <MonthGrid offset={visibleOffset} progressMaps={progressMaps} onDayTap={onDayTap} />
      </div>
    </div>
  );
}

// ─── Month day bottom sheet ──────────────────────────────────────────────────

function SheetTaskCard({
  title,
  accentColor,
  taskCount,
  subtitle,
  done,
  total,
  onToggle,
}: {
  title: string;
  accentColor: string;
  taskCount: number;
  subtitle?: string;
  done: number;
  total: number;
  onToggle: () => void;
}) {
  const isChecked = total > 0 && done === total;
  const progress  = total > 0 ? done / total : done;

  return (
    <div className="bg-white" style={{ borderRadius: 12, boxShadow: CARD_SHADOW, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", minHeight: 60, padding: "12px 12px 12px 0" }}>
        {/* Colored left accent bar */}
        <div style={{ width: 4, alignSelf: "stretch", background: accentColor, borderRadius: 2, margin: "0 12px", flexShrink: 0 }} />
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-bold" style={{ fontSize: 14, color: "#1a1a1a", lineHeight: "1.3" }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{subtitle}</div>
          ) : taskCount > 0 ? (
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 2 }}>Task list ({taskCount})</div>
          ) : null}
        </div>
        {/* Checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginLeft: 8,
            border: isChecked ? "none" : "1.5px solid #d0d0d0",
            background: isChecked ? BLUE : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: `background ${MS.dCheck} ${MS.eOut}`,
          }}
        >
          {isChecked && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1 5l4 4L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

    </div>
  );
}

function DayBottomSheet({
  dayId,
  date,
  monthOffset,
  progressMap,
  onProgressChange,
  onForceSignal,
  onExpand,
  onClose,
}: {
  dayId: number;
  date: number;
  monthOffset: number;
  progressMap: Record<string, { done: number; total: number }>;
  onProgressChange: (id: string, done: number, total: number) => void;
  onForceSignal: (id: string, allDone: boolean) => void;
  onExpand: () => void;
  onClose: () => void;
}) {
  const day          = DAY_CONTENT[dayId];
  const { monthName, yearStr } = getMonthInfo(monthOffset);
  const fullDayName  = FULL_DAY_NAMES[dayId - 1] ?? "";
  const dateStr      = `${monthName} ${date}, ${yearStr}`;

  const makeToggle = (id: string, defaultTotal: number) => () => {
    const e    = progressMap[id];
    const total = e?.total ?? defaultTotal;
    const done  = e?.done  ?? 0;
    const willBeAllDone = done !== total;
    onProgressChange(id, willBeAllDone ? total : 0, total);
    onForceSignal(id, willBeAllDone);
  };

  return (
    <>
      {/* Scrim — tap to close */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 40 }}
        onClick={onClose}
      />

      {/* Sheet — floats with 10 px gap on left, right and bottom */}
      <div
        style={{
          position: "absolute", bottom: 10, left: 10, right: 10,
          maxHeight: "70%",
          background: "#fff",
          borderRadius: 18,
          zIndex: 41,
          display: "flex", flexDirection: "column",
          boxShadow: "0 -6px 32px rgba(0,0,0,0.14)",
          animation: `sheetSlideUp ${MS.dExpand} ${MS.eOut} both`,
        }}
      >
        {/* Handle pill */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />
        </div>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 16px 10px" }}>
          <div>
            <div className="font-bold" style={{ fontSize: 17, color: "#1a1a1a" }}>{fullDayName}</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>{dateStr}</div>
          </div>
          {/* Expand → full Day view */}
          <div
            onClick={onExpand}
            style={{
              width: 36, height: 36, borderRadius: 10, background: "#F5F5F5",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M14 10L21 3M21 3H15M21 3V9M10 14L3 21M3 21H9M3 21L3 15" stroke="#727272" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 16px 4px" }} />

        {/* Scrollable task content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 83px" }}>
          {/* Anytime */}
          {day?.anytime && day.anytime.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ padding: "0 16px 6px", fontSize: 11, fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Anytime
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 12px" }}>
                {day.anytime.map((c) => {
                  const e = progressMap[c.id];
                  const defaultTotal = c.tasks && c.tasks.length > 0 ? c.tasks.length : 1;
                  return (
                    <SheetTaskCard
                      key={c.id} title={c.title} accentColor={c.accentColor}
                      taskCount={c.tasks?.length ?? 0}
                      done={e?.done ?? 0} total={e?.total ?? defaultTotal}
                      onToggle={makeToggle(c.id, defaultTotal)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Planned */}
          {day?.planned && day.planned.some((c) => c.kind === "timed") && (
            <div>
              <div style={{ padding: "0 16px 6px", fontSize: 11, fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Planned
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 12px" }}>
                {day.planned.map((c) => {
                  if (c.kind === "gap") return null;
                  const e = progressMap[c.id];
                  const defaultTotal = c.tasks && c.tasks.length > 0 ? c.tasks.length : 1;
                  return (
                    <SheetTaskCard
                      key={c.id} title={c.title} accentColor={c.avatarColor}
                      taskCount={c.tasks?.length ?? 0} subtitle={c.timeRange}
                      done={e?.done ?? 0} total={e?.total ?? defaultTotal}
                      onToggle={makeToggle(c.id, defaultTotal)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({
  width = 393,
  height = 852,
}: {
  width?: number | string;
  height?: number | string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calendar view state (lifted from Header)
  const [view, setView] = useState<CalendarView>("day");

  // 3-day window: first day id in the window (1–5)
  const [threeDayStart, setThreeDayStart] = useState<number>(1);

  // Month view: offset from base month (April 2026 = 0)
  const [monthOffset, setMonthOffset] = useState(0);

  // Bottom sheet: which day is tapped in Month view (null = closed)
  const [monthSheet, setMonthSheet] = useState<{ date: number; dayId: number } | null>(null);

  // Today icon button: only when CURRENT_DAY is outside the visible 3-day window
  const showTodayBtn =
    view === "3day" &&
    (CURRENT_DAY < threeDayStart || CURRENT_DAY > threeDayStart + 2);

  const switchView = useCallback((v: CalendarView) => {
    setView(v);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  // Active day — default Monday
  const [activeDay, setActiveDay] = useState<number>(2);

  // Per-day progress maps — never cleared, so card state survives day switches.
  // Keyed by day id → card id → { done, total }.
  const [progressMaps, setProgressMaps] = useState<
    Record<number, Record<string, { done: number; total: number }>>
  >({});

  // Cross-view sync signals: toggling in 3-day view forces Day view cards to match.
  // Version-gated so TaskCard/TimedCard only react to genuine new signals.
  const [forceSignals, setForceSignals] = useState<
    Record<number, Record<string, ForceSignal>>
  >({});
  const forceVersions = useRef<Record<number, Record<string, number>>>({});

  const handleForceSignal = useCallback((dayId: number, cardId: string, allDone: boolean) => {
    setForceSignals((prev) => {
      const daySignals = prev[dayId] ?? {};
      const dayVersions = (forceVersions.current[dayId] = forceVersions.current[dayId] ?? {});
      const nextV = (dayVersions[cardId] ?? 0) + 1;
      dayVersions[cardId] = nextV;
      return {
        ...prev,
        [dayId]: { ...daySignals, [cardId]: { v: nextV, allDone } },
      };
    });
  }, []);

  // Stable per-day handlers created once; each captures its own dayId.
  const progressHandlers = useMemo(() => {
    const out: Record<number, (id: string, done: number, total: number) => void> = {};
    for (const dayId of Object.keys(DAY_CONTENT).map(Number)) {
      out[dayId] = (id, done, total) => {
        setProgressMaps((prev) => {
          const dayMap = prev[dayId] ?? {};
          const entry = dayMap[id];
          if (entry && entry.done === done && entry.total === total) return prev;
          return { ...prev, [dayId]: { ...dayMap, [id]: { done, total } } };
        });
      };
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive a progress value (0–1) for each day from its map
  const fullProgressMap = useMemo(() => {
    const result: Record<number, number> = {};
    for (const [dayIdStr, dayMap] of Object.entries(progressMaps)) {
      const { totalDone, totalAll } = Object.values(dayMap).reduce(
        (acc, { done, total }) => ({ totalDone: acc.totalDone + done, totalAll: acc.totalAll + total }),
        { totalDone: 0, totalAll: 0 }
      );
      if (totalAll > 0) result[Number(dayIdStr)] = totalDone / totalAll;
    }
    return result;
  }, [progressMaps]);

  const switchDay = useCallback((day: number) => {
    if (day === activeDay) return;
    setActiveDay(day);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeDay]);

  // Drag state stored in a ref so it never causes re-renders
  const drag = useRef({ active: false, startY: 0, startScroll: 0 });

  const getClientY = (e: MouseEvent | TouchEvent) =>
    "touches" in e ? e.touches[0].clientY : e.clientY;

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startY: getClientY(e.nativeEvent),
      startScroll: el.scrollTop,
    };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drag.current.active || !scrollRef.current) return;
    const dy = getClientY(e.nativeEvent) - drag.current.startY;
    scrollRef.current.scrollTop = drag.current.startScroll - dy;
  }, []);

  const onDragEnd = useCallback(() => {
    drag.current.active = false;
    if (!scrollRef.current) return;
    scrollRef.current.style.cursor = "grab";
    scrollRef.current.style.userSelect = "";
  }, []);

  return (
    <div id="dashboard-screen" style={{ width, height, position: "relative", fontFamily: "var(--font-inter)", overflow: "hidden" }}>
      <style>{`
        #scroll-content::-webkit-scrollbar { display: none; }
        @keyframes tdSlideInRight  { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes tdSlideInLeft   { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes tdSlideOutLeft  { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes tdSlideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes sheetSlideUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {/* ── Fixed header ── */}
      <div
        id="fixed-header"
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          zIndex: 9, background: "#fff",
        }}
      >
        <Header
          view={view}
          onViewChange={switchView}
          showTodayBtn={showTodayBtn}
          onTodayJump={() => {
            // Page 0 (start=1) contains CURRENT_DAY=2
            setThreeDayStart(1);
          }}
          monthName={view === "month" ? getMonthInfo(monthOffset).monthName : "April"}
          year={view === "month" ? getMonthInfo(monthOffset).yearStr : "2026"}
        />
        {/* WeekStrip only shown in Day view */}
        {view === "day" && (
          <WeekStrip
            activeDay={activeDay}
            currentDay={CURRENT_DAY}
            dayProgressMap={fullProgressMap}
            onDayChange={switchDay}
          />
        )}
      </div>

      {/* Scrollable content */}
      <div
        id="scroll-content"
        ref={scrollRef}
        className="no-scrollbar"
        onMouseDown={view === "day" ? onDragStart : undefined}
        onMouseMove={view === "day" ? onDragMove : undefined}
        onMouseUp={view === "day" ? onDragEnd : undefined}
        onMouseLeave={view === "day" ? onDragEnd : undefined}
        onTouchStart={view === "day" ? onDragStart : undefined}
        onTouchMove={view === "day" ? onDragMove : undefined}
        onTouchEnd={view === "day" ? onDragEnd : undefined}
        style={{
          position: "absolute",
          top: view === "day" ? 135 : 68,
          bottom: 83,
          left: 0,
          right: 0,
          overflowY: "auto",
          overflowX: "hidden",
          cursor: view === "day" ? "grab" : "default",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        } as React.CSSProperties}
      >
        {/* Day view: all 7 days mounted simultaneously, hidden with display:none */}
        {view === "day" && Object.keys(DAY_CONTENT).map(Number).map((dayId) => (
          <DayContent
            key={dayId}
            dayId={dayId}
            isVisible={dayId === activeDay}
            progressMap={progressMaps[dayId] ?? {}}
            onProgressChange={progressHandlers[dayId]}
            forceSignals={forceSignals[dayId] ?? {}}
          />
        ))}

        {/* 3-Day view */}
        {view === "3day" && (
          <ThreeDayView
            start={threeDayStart}
            onStartChange={setThreeDayStart}
            currentDay={CURRENT_DAY}
            progressMaps={progressMaps}
            progressHandlers={progressHandlers}
            onForceSignal={handleForceSignal}
          />
        )}

        {/* Month view */}
        {view === "month" && (
          <MonthView
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            progressMaps={progressMaps}
            onDayTap={(date, dayId) => {
              if (dayId !== null) setMonthSheet({ date, dayId });
            }}
          />
        )}
      </div>

      {/* Day bottom sheet (Month view → day tap) */}
      {monthSheet && (
        <DayBottomSheet
          dayId={monthSheet.dayId}
          date={monthSheet.date}
          monthOffset={monthOffset}
          progressMap={progressMaps[monthSheet.dayId] ?? {}}
          onProgressChange={progressHandlers[monthSheet.dayId]}
          onForceSignal={(cardId, allDone) => handleForceSignal(monthSheet.dayId, cardId, allDone)}
          onExpand={() => {
            setMonthSheet(null);
            setActiveDay(monthSheet.dayId);
            switchView("day");
          }}
          onClose={() => setMonthSheet(null)}
        />
      )}

      <FABButton />
      <TabBar />
    </div>
  );
}

// ─── Viewport presets ─────────────────────────────────────────────────────────

const PRESETS = {
  iphone17:   { label: "iPhone 17 Pro Max", w: 440,  h: 956  },
  android:    { label: "Android Large",     w: 412,  h: 917  },
  responsive: { label: "Responsive",        w: null, h: null },
} as const;
type PresetKey = keyof typeof PRESETS;
type Platform  = "mobile" | "desktop";

// ─── Desktop header ───────────────────────────────────────────────────────────

function DesktopHeader({
  activeDay,
  view,
  onViewChange,
  onPrevDay,
  onNextDay,
  onTodayJump,
  dateLabel,
}: {
  activeDay: number;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onTodayJump: () => void;
  dateLabel?: string;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e: PointerEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    window.addEventListener("pointerdown", h);
    return () => window.removeEventListener("pointerdown", h);
  }, [dropOpen]);

  const dayInfo     = WEEK_DAYS.find((d) => d.id === activeDay);
  const fullDayName = FULL_DAY_NAMES[activeDay - 1] ?? "";
  const active      = CALENDAR_VIEWS.find((v) => v.id === view)!;

  return (
    <div style={{
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center",
      paddingLeft: 24, paddingRight: 24, gap: 10,
      background: "#fff",
    }}>

      {/* Prev / Next day */}
      {[
        { label: "prev", onClick: onPrevDay, path: "M9 3L4 8l5 5" },
        { label: "next", onClick: onNextDay, path: "M4 3l5 5-5 5" },
      ].map(({ label, onClick, path }) => (
        <div
          key={label}
          onClick={onClick}
          style={{
            width: 34, height: 34, borderRadius: 10, background: "#F2F2F2",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", userSelect: "none", flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={path} stroke="#444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ))}

      {/* Date — keyed so it fades in on every day change */}
      <span
        key={dateLabel ?? activeDay}
        className="font-bold dt-header-fade"
        style={{ fontSize: 22, color: "#1a1a1a", whiteSpace: "nowrap" }}
      >
        {dateLabel ?? `${fullDayName} ${dayInfo?.num} , April 2026`}
      </span>

      {/* Jump-to-today — collapses width + fades when on current day */}
      <div style={{
        overflow: "hidden", flexShrink: 0,
        maxWidth: activeDay !== CURRENT_DAY ? 150 : 0,
        opacity: activeDay !== CURRENT_DAY ? 1 : 0,
        pointerEvents: activeDay !== CURRENT_DAY ? "auto" : "none",
        transition: "max-width 200ms ease, opacity 200ms ease",
      }}>
        <div
          onClick={onTodayJump}
          className="flex items-center gap-1.5 px-3"
          style={{
            background: "#F2F2F2", height: 34, borderRadius: 10,
            cursor: "pointer", userSelect: "none", color: "#242424",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 7.65H3M5.33333 15.75C4.21323 15.75 4.51984 15.75 4.09202 15.5293C3.71569 15.3351 3.40973 15.0254 3.21799 14.6443C3 14.2112 3 13.6441 3 12.51V6.84C3 5.70589 3 5.13884 3.21799 4.70567C3.40973 4.32464 3.71569 4.01486 4.09202 3.82071C4.51984 3.6 5.0799 3.6 6.2 3.6H11.8C12.9201 3.6 13.4802 3.6 13.908 3.82071C14.2843 4.01486 14.5903 4.32464 14.782 4.70567C15 5.13884 15 5.70589 15 6.84V12.51C15 13.6441 15 14.2112 14.782 14.6443C14.5903 15.0254 14.2843 15.3351 13.908 15.5293C13.4802 15.75 13.7868 15.75 12.6667 15.75M11.6667 2.25V4.95M6.33333 2.25V4.95" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 13.8214L9 15.75M9 15.75L10.5 13.8214M9 15.75V11.25" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium" style={{ fontSize: 13 }}>Today</span>
        </div>
      </div>

      {/* View picker */}
      <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
        <div
          onClick={() => setDropOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3"
          style={{
            background: "#F2F2F2", height: 34, borderRadius: 10,
            cursor: "pointer", userSelect: "none", color: "#242424",
          }}
        >
          {active.icon}
          <span className="font-medium" style={{ fontSize: 13 }}>{active.label}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5l3 3 3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Dropdown */}
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "#fff", borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)",
          padding: "6px",
          display: "flex", flexDirection: "column", gap: 2,
          minWidth: 150, zIndex: 50,
          pointerEvents: dropOpen ? "auto" : "none",
          opacity: dropOpen ? 1 : 0,
          transform: dropOpen ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
          transformOrigin: "top left",
          transition: `opacity ${MS.dElement} ${MS.eOut}, transform ${MS.dElement} ${MS.eOut}`,
        }}>
          {CALENDAR_VIEWS.map((cv) => {
            const isSel = cv.id === view;
            return (
              <div
                key={cv.id}
                onClick={() => { onViewChange(cv.id); setDropOpen(false); }}
                className="flex items-center gap-2.5"
                style={{
                  padding: "8px 10px", borderRadius: 9,
                  cursor: "pointer", userSelect: "none",
                  background: isSel ? "#F2F2F2" : "transparent",
                  color: "#242424",
                  transition: `background ${MS.dFast} ${MS.eOut}`,
                }}
              >
                {cv.icon}
                <span className="font-medium" style={{ fontSize: 14 }}>{cv.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Learn */}
      <div
        className="flex items-center gap-2"
        style={{ cursor: "pointer", padding: "0 10px", height: 34, borderRadius: 10, userSelect: "none" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 18V17.893C10 17.098 9.504 16.405 8.883 15.909C8.07246 15.2626 7.48289 14.3802 7.1959 13.384C6.90891 12.3878 6.93868 11.327 7.28109 10.3485C7.62351 9.36991 8.26164 8.52199 9.10716 7.92207C9.95268 7.32215 10.9638 6.99988 12.0005 6.99988C13.0372 6.99988 14.0483 7.32215 14.8938 7.92207C15.7394 8.52199 16.3775 9.36991 16.7199 10.3485C17.0623 11.327 17.0921 12.3878 16.8051 13.384C16.5181 14.3802 15.9285 15.2626 15.118 15.909C14.496 16.406 14 17.098 14 17.893V18M10 18V20C10 20.2652 10.1054 20.5196 10.2929 20.7071C10.4804 20.8946 10.7348 21 11 21H13C13.2652 21 13.5196 20.8946 13.7071 20.7071C13.8946 20.5196 14 20.2652 14 20V18M10 18H14M20 12H21M4 12H3M12 4V3M17.657 6.343L18.364 5.636M6.344 6.343L5.636 5.636M12 15V13" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-medium" style={{ fontSize: 14, color: "#1a1a1a" }}>Learn</span>
      </div>

      {/* Settings */}
      <div style={{ cursor: "pointer", display: "flex", padding: 6, borderRadius: 10 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.7273 14.7273C18.6063 15.0015 18.5702 15.3056 18.6236 15.6005C18.6771 15.8954 18.8177 16.1676 19.0273 16.3818L19.0818 16.4364C19.2509 16.6052 19.385 16.8057 19.4765 17.0265C19.568 17.2472 19.6151 17.4838 19.6151 17.7227C19.6151 17.9617 19.568 18.1983 19.4765 18.419C19.385 18.6397 19.2509 18.8402 19.0818 19.0091C18.913 19.1781 18.7124 19.3122 18.4917 19.4037C18.271 19.4952 18.0344 19.5423 17.7955 19.5423C17.5565 19.5423 17.3199 19.4952 17.0992 19.4037C16.8785 19.3122 16.678 19.1781 16.5091 19.0091L16.4545 18.9545C16.2403 18.745 15.9682 18.6044 15.6733 18.5509C15.3784 18.4974 15.0742 18.5335 14.8 18.6545C14.5311 18.7698 14.3018 18.9611 14.1403 19.205C13.9788 19.4489 13.8921 19.7347 13.8909 20.0273V20.1818C13.8909 20.664 13.6994 21.1265 13.3584 21.4675C13.0174 21.8084 12.5549 22 12.0727 22C11.5905 22 11.1281 21.8084 10.7871 21.4675C10.4461 21.1265 10.2545 20.664 10.2545 20.1818V20.1C10.2475 19.7991 10.1501 19.5073 9.97501 19.2625C9.79991 19.0176 9.55521 18.8312 9.27273 18.7273C8.99853 18.6063 8.69437 18.5702 8.39947 18.6236C8.10456 18.6771 7.83244 18.8177 7.61818 19.0273L7.56364 19.0818C7.39478 19.2509 7.19425 19.385 6.97353 19.4765C6.7528 19.568 6.51621 19.6151 6.27727 19.6151C6.03834 19.6151 5.80174 19.568 5.58102 19.4765C5.36029 19.385 5.15977 19.2509 4.99091 19.0818C4.82186 18.913 4.68775 18.7124 4.59626 18.4917C4.50476 18.271 4.45766 18.0344 4.45766 17.7955C4.45766 17.5565 4.50476 17.3199 4.59626 17.0992C4.68775 16.8785 4.82186 16.678 4.99091 16.5091L5.04545 16.4545C5.25503 16.2403 5.39562 15.9682 5.4491 15.6733C5.50257 15.3784 5.46647 15.0742 5.34545 14.8C5.23022 14.5311 5.03887 14.3018 4.79497 14.1403C4.55107 13.9788 4.26526 13.8921 3.97273 13.8909H3.81818C3.33597 13.8909 2.87351 13.6994 2.53253 13.3584C2.19156 13.0174 2 12.5549 2 12.0727C2 11.5905 2.19156 11.1281 2.53253 10.7871C2.87351 10.4461 3.33597 10.2545 3.81818 10.2545H3.9C4.2009 10.2475 4.49273 10.1501 4.73754 9.97501C4.98236 9.79991 5.16883 9.55521 5.27273 9.27273C5.39374 8.99853 5.42984 8.69437 5.37637 8.39947C5.3229 8.10456 5.18231 7.83244 4.97273 7.61818L4.91818 7.56364C4.74913 7.39478 4.61503 7.19425 4.52353 6.97353C4.43203 6.7528 4.38493 6.51621 4.38493 6.27727C4.38493 6.03834 4.43203 5.80174 4.52353 5.58102C4.61503 5.36029 4.74913 5.15977 4.91818 4.99091C5.08704 4.82186 5.28757 4.68775 5.50829 4.59626C5.72901 4.50476 5.96561 4.45766 6.20455 4.45766C6.44348 4.45766 6.68008 4.50476 6.9008 4.59626C7.12152 4.68775 7.32205 4.82186 7.49091 4.99091L7.54545 5.04545C7.75971 5.25503 8.03183 5.39562 8.32674 5.4491C8.62164 5.50257 8.9258 5.46647 9.2 5.34545H9.27273C9.54161 5.23022 9.77093 5.03887 9.93245 4.79497C10.094 4.55107 10.1807 4.26526 10.1818 3.97273V3.81818C10.1818 3.33597 10.3734 2.87351 10.7144 2.53253C11.0553 2.19156 11.5178 2 12 2C12.4822 2 12.9447 2.19156 13.2856 2.53253C13.6266 2.87351 13.8182 3.33597 13.8182 3.81818V3.9C13.8193 4.19253 13.906 4.47834 14.0676 4.72224C14.2291 4.96614 14.4584 5.15749 14.7273 5.27273C15.0015 5.39374 15.3056 5.42984 15.6005 5.37637C15.8954 5.3229 16.1676 5.18231 16.3818 4.97273L16.4364 4.91818C16.6052 4.74913 16.8057 4.61503 17.0265 4.52353C17.2472 4.43203 17.4838 4.38493 17.7227 4.38493C17.9617 4.38493 18.1983 4.43203 18.419 4.52353C18.6397 4.61503 18.8402 4.74913 19.0091 4.91818C19.1781 5.08704 19.3122 5.28757 19.4037 5.50829C19.4952 5.72901 19.5423 5.96561 19.5423 6.20455C19.5423 6.44348 19.4952 6.68008 19.4037 6.9008C19.3122 7.12152 19.1781 7.32205 19.0091 7.49091L18.9545 7.54545C18.745 7.75971 18.6044 8.03183 18.5509 8.32674C18.4974 8.62164 18.5335 8.9258 18.6545 9.2V9.27273C18.7698 9.54161 18.9611 9.77093 19.205 9.93245C19.4489 10.094 19.7347 10.1807 20.0273 10.1818H20.1818C20.664 10.1818 21.1265 10.3734 21.4675 10.7144C21.8084 11.0553 22 11.5178 22 12C22 12.4822 21.8084 12.9447 21.4675 13.2856C21.1265 13.6266 20.664 13.8182 20.1818 13.8182H20.1C19.8075 13.8193 19.5217 13.906 19.2778 14.0676C19.0339 14.2291 18.8425 14.4584 18.7273 14.7273Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

    </div>
  );
}

// ─── Desktop calendar helpers ─────────────────────────────────────────────────

function parseTimeStr(t: string): number {
  const cleaned = t.replace(/\s+/g, "");
  const isPM    = /pm$/i.test(cleaned);
  const isAM    = /am$/i.test(cleaned);
  const core    = cleaned.replace(/[apm]+$/i, "");
  const [hStr, mStr] = core.split(":");
  let h  = parseInt(hStr, 10);
  const m = parseInt(mStr ?? "0", 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function parseTimeRange(tr: string): { startMin: number; endMin: number } {
  const parts = tr.split("→").map((s) => s.trim());
  return { startMin: parseTimeStr(parts[0]!), endMin: parseTimeStr(parts[1] ?? parts[0]!) };
}

type TimeItem = {
  entry: TimedEntry;
  startMin: number; endMin: number;
  colIndex: number; colCount: number;
};

function buildTimeLayout(entries: TimedEntry[]): TimeItem[] {
  if (!entries.length) return [];
  const items: TimeItem[] = entries
    .map((e) => ({ entry: e, ...parseTimeRange(e.timeRange), colIndex: 0, colCount: 1 }))
    .sort((a, b) => a.startMin - b.startMin);

  // Sweep: group overlapping intervals
  const groups: TimeItem[][] = [];
  let current: TimeItem[] = [];
  let groupMax = -Infinity;
  for (const item of items) {
    if (current.length > 0 && item.startMin >= groupMax) {
      groups.push(current);
      current = [];
      groupMax = -Infinity;
    }
    current.push(item);
    groupMax = Math.max(groupMax, item.endMin);
  }
  if (current.length) groups.push(current);

  return groups.flatMap((group) =>
    group.map((item, idx) => ({ ...item, colIndex: idx, colCount: group.length }))
  );
}

// ─── Desktop timeline card ────────────────────────────────────────────────────

const DESKTOP_TL_START = 7;   // 7 AM
const DESKTOP_TL_END   = 20;  // 8 PM
const DESKTOP_PX_PER_H = 100; // px per hour
const DESKTOP_LABEL_W  = 80;  // px width of time-label column

function DesktopTimelineCard({
  entry, startMin, endMin, colIndex, colCount,
  done, total, onSelect, onCheckbox,
}: {
  entry: TimedEntry;
  startMin: number; endMin: number;
  colIndex: number; colCount: number;
  done: number; total: number;
  onSelect: (id: string) => void;
  onCheckbox: () => void;
}) {
  const top      = ((startMin - DESKTOP_TL_START * 60) / 60) * DESKTOP_PX_PER_H;
  const height   = Math.max(((endMin - startMin) / 60) * DESKTOP_PX_PER_H, 44);
  const widthPct = 100 / colCount;
  const leftPct  = colIndex * widthPct;
  const CARD_GAP = 16; // mirror TaskCard's mx-4

  const isAllDone = total > 0 && done === total;
  const fillPct   = total > 0 ? done / total : 0;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(entry.id); }}
      style={{
        position: "absolute",
        top,
        left: `calc(${leftPct}% + ${CARD_GAP}px)`,
        width: `calc(${widthPct}% - ${CARD_GAP * 2}px)`,
        height,
        background: "#fff",
        borderRadius: 12,
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        userSelect: "none",
      }}
    >
      {/* Content area — position:relative so progress track anchors here */}
      <div style={{ flex: 1, height: "100%", position: "relative", display: "flex", alignItems: "center", paddingRight: 4, minWidth: 0 }}>
        {/* Vertical progress track — fills card height */}
        <div style={{
          position: "absolute", left: 12,
          top: 10, bottom: 10,
          width: 4, borderRadius: 2,
          background: `color-mix(in srgb, ${entry.avatarColor} 25%, transparent)`,
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: `${Math.round(fillPct * 100)}%`,
            borderRadius: 2,
            background: entry.avatarColor,
            transition: `height ${MS.dProgress} ${MS.eOut}`,
          }} />
        </div>
        {/* Text */}
        <div style={{ marginLeft: 24, minWidth: 0 }}>
          <div className="font-bold" style={{ fontSize: 15, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.title}
          </div>
          {total > 0 && (
            <div className="flex items-center gap-1" style={{ marginTop: 2 }}>
              <span style={{ fontSize: 11, color: "#888" }}>Task list ({total})</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4l3 3 3-3" stroke="#bbb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
      {/* Functional checkbox */}
      <div style={{ display: "flex", alignItems: "center", paddingRight: 14, flexShrink: 0 }}>
        <Checkbox checked={isAllDone} onToggle={onCheckbox} />
      </div>
    </div>
  );
}

// ─── Desktop calendar content ─────────────────────────────────────────────────

function DesktopCalendarContent({
  activeDay, nowMin, onSelectEntry,
  timedProgress, onTimelineCheckbox,
}: {
  activeDay: number;
  nowMin: number;
  onSelectEntry: (id: string | null) => void;
  timedProgress: Record<string, { done: number; total: number }>;
  onTimelineCheckbox: (id: string) => void;
}) {
  const day = DAY_CONTENT[activeDay];

  // Progress tracking for "Due Today" badge
  const [progressMap, setProgressMap] = useState<Record<string, { done: number; total: number }>>({});
  const onProgressChange = useCallback((id: string, done: number, total: number) => {
    setProgressMap((prev) => ({ ...prev, [id]: { done, total } }));
  }, []);
  const anytimeIds     = new Set((day?.anytime ?? []).map((c) => c.id));
  const completedCount = Object.entries(progressMap).filter(
    ([id, { done, total }]) => anytimeIds.has(id) && total > 0 && done === total
  ).length;
  const dueToday = anytimeIds.size - completedCount;

  const timedEntries = useMemo(
    () => (day?.planned ?? []).filter((e): e is TimedEntry => e.kind === "timed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDay]
  );
  const timeLayout = useMemo(() => buildTimeLayout(timedEntries), [timedEntries]);

  const hours  = Array.from(
    { length: DESKTOP_TL_END - DESKTOP_TL_START },
    (_, i) => DESKTOP_TL_START + i
  );
  const totalH = hours.length * DESKTOP_PX_PER_H;

  return (
    /* Outer shell — margin gap around the rounded frame */
    <div style={{ flex: 1, overflow: "hidden", background: "#fff", padding: "0 12px 12px 12px" }}>
      {/* Rounded frame */}
      <div style={{
        height: "100%",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}>

        {/* ── Single scrollable container (anytime + timeline) ── */}
        <div
          id="desktop-calendar-scroll"
          onClick={() => onSelectEntry(null)}
          style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" } as React.CSSProperties}
        >

          {/* Anytime section */}
          <div style={{ padding: "12px 0 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10, paddingLeft: DESKTOP_LABEL_W + 4 }}>
              <span className="font-medium" style={{ fontSize: 14, color: "#666" }}>Anytime</span>
              <DueTodayBadge count={dueToday} />
            </div>
            <div className="flex flex-col gap-2" style={{ paddingLeft: DESKTOP_LABEL_W }}>
              {day?.anytime.map((c) => (
                <TaskCard
                  key={c.id} id={c.id} title={c.title} accentColor={c.accentColor}
                  tasks={c.tasks ?? []} initialDoneMap={c.initialDoneMap}
                  initialChecked={c.initialChecked}
                  onProgressChange={onProgressChange}
                />
              ))}
            </div>
          </div>

          {/* Timeline — natural block height, no inner scroll */}
          <div style={{ position: "relative", height: totalH }}>

            {/* Label column background */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: DESKTOP_LABEL_W, background: "#FAFAFA", zIndex: 0 }} />

            {/* Hour grid lines + labels */}
            {hours.flatMap((hour) => {
              const y     = (hour - DESKTOP_TL_START) * DESKTOP_PX_PER_H;
              const label = hour < 12
                ? `${hour} AM`
                : hour === 12 ? "12 PM" : `${hour - 12} PM`;
              return [
                <div
                  key={`line-${hour}`}
                  style={{ position: "absolute", top: y, left: DESKTOP_LABEL_W, right: 0, height: 1, background: "rgba(0,0,0,0.07)", zIndex: 1 }}
                />,
                <div
                  key={`half-${hour}`}
                  style={{ position: "absolute", top: y + DESKTOP_PX_PER_H / 2, left: DESKTOP_LABEL_W, right: 0, height: 1, background: "rgba(0,0,0,0.04)", zIndex: 1 }}
                />,
                <div
                  key={`lbl-${hour}`}
                  style={{ position: "absolute", top: y + 5, left: 0, width: DESKTOP_LABEL_W - 8, textAlign: "right", fontSize: 11, color: "#aaa", fontWeight: 500, userSelect: "none", zIndex: 1 }}
                >
                  {label}
                </div>,
              ];
            })}

            {/* Current-time tracker */}
            {(() => {
              const lo = DESKTOP_TL_START * 60, hi = DESKTOP_TL_END * 60;
              if (nowMin < lo || nowMin > hi) return null;
              const nowY = ((nowMin - lo) / 60) * DESKTOP_PX_PER_H;
              return [
                <div key="tl-line" style={{ position: "absolute", top: nowY, left: DESKTOP_LABEL_W, right: 0, height: 1, background: "#727272", zIndex: 3 }} />,
                <div key="tl-dot"  style={{ position: "absolute", top: nowY - 5, left: DESKTOP_LABEL_W - 5, width: 10, height: 10, borderRadius: "50%", background: "#727272", zIndex: 3 }} />,
              ];
            })()}

            {/* Task cards */}
            <div style={{ position: "absolute", top: 0, left: DESKTOP_LABEL_W, right: 0, bottom: 0, zIndex: 2 }}>
              {timeLayout.map(({ entry, startMin, endMin, colIndex, colCount }) => {
                const p     = timedProgress[entry.id];
                const total = entry.tasks?.length ?? 0;
                const done  = p?.done ?? 0;
                return (
                  <DesktopTimelineCard
                    key={entry.id}
                    entry={entry}
                    startMin={startMin}
                    endMin={endMin}
                    colIndex={colIndex}
                    colCount={colCount}
                    done={done}
                    total={total}
                    onSelect={onSelectEntry}
                    onCheckbox={() => onTimelineCheckbox(entry.id)}
                  />
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Desktop screen ───────────────────────────────────────────────────────────

function DesktopScreen() {
  const [activeDay,     setActiveDay]     = useState<number>(CURRENT_DAY);
  const [view,          setView]          = useState<CalendarView>("day");
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [transitionDir, setTransitionDir] = useState<"left" | "right">("left");

  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Shared subtask progress (sidebar TimedCard → timeline card) ───────────
  const [timedProgress, setTimedProgress] =
    useState<Record<string, { done: number; total: number }>>({});
  const [forceSignals, setForceSignals] =
    useState<Record<string, ForceSignal>>({});

  // Reset shared state + selection when the day changes
  useEffect(() => {
    setTimedProgress({});
    setForceSignals({});
    setSelectedId(null);
  }, [activeDay]);

  const onTimedProgressChange = useCallback((id: string, done: number, total: number) => {
    setTimedProgress((prev) => ({ ...prev, [id]: { done, total } }));
  }, []);

  const onTimelineCheckbox = useCallback((id: string) => {
    const cur     = timedProgress[id];
    const allDone = cur ? cur.done === cur.total && cur.total > 0 : false;
    setForceSignals((prev) => ({
      ...prev,
      [id]: { v: (prev[id]?.v ?? 0) + 1, allDone: !allDone },
    }));
  }, [timedProgress]);

  const DAY_IDS = Object.keys(DAY_CONTENT).map(Number).sort((a, b) => a - b);
  const navigateDay = (delta: number) => {
    setTransitionDir(delta > 0 ? "left" : "right");
    const idx    = DAY_IDS.indexOf(activeDay);
    const newIdx = Math.max(0, Math.min(DAY_IDS.length - 1, idx + delta));
    setActiveDay(DAY_IDS[newIdx]);
  };

  // ── 3-day view state ──────────────────────────────────────────────────────
  const [threeDayStart, setThreeDayStart] = useState<number>(() =>
    CURRENT_DAY <= 3 ? 1 : CURRENT_DAY <= 6 ? 4 : 7
  );
  const [dtProgressMaps, setDtProgressMaps] = useState<
    Record<number, Record<string, { done: number; total: number }>>
  >({});
  const dtProgressHandlers = useMemo(() => {
    const out: Record<number, (id: string, done: number, total: number) => void> = {};
    [1, 2, 3, 4, 5, 6, 7].forEach((dayId) => {
      out[dayId] = (id, done, total) =>
        setDtProgressMaps((prev) => ({
          ...prev,
          [dayId]: { ...(prev[dayId] ?? {}), [id]: { done, total } },
        }));
    });
    return out;
  }, []);

  // Date label shown in header for 3-day view
  const dt3Days  = [threeDayStart, threeDayStart + 1, threeDayStart + 2].filter((d) => d >= 1 && d <= 7);
  const dt3First = WEEK_DAYS.find((d) => d.id === dt3Days[0]);
  const dt3Last  = WEEK_DAYS.find((d) => d.id === dt3Days[dt3Days.length - 1]);
  const dt3Label = view === "3day"
    ? `${dt3First?.fullLabel} ${dt3First?.num} – ${dt3Last?.fullLabel} ${dt3Last?.num}`
    : undefined;

  // ── Day-view sidebar entries ───────────────────────────────────────────────
  const allTimedEntries = (DAY_CONTENT[activeDay]?.planned ?? [])
    .filter((e): e is TimedEntry => e.kind === "timed");

  const sidebarEntries = selectedId !== null
    ? allTimedEntries.filter((e) => e.id === selectedId)
    : allTimedEntries.filter((e) => {
        const { startMin: s, endMin: en } = parseTimeRange(e.timeRange);
        return nowMin >= s && nowMin < en;
      });

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "row",
      fontFamily: "var(--font-inter)",
      overflow: "hidden",
    }}>
      <style>{`
        #desktop-sidebar::-webkit-scrollbar          { display: none; }
        #desktop-calendar-scroll::-webkit-scrollbar  { display: none; }
        @keyframes dtSlideInRight {
          from { transform: translateX(28px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes dtSlideInLeft {
          from { transform: translateX(-28px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        .dt-slide-left  { animation: dtSlideInRight 220ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .dt-slide-right { animation: dtSlideInLeft  220ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
        @keyframes dtHeaderFade {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .dt-header-fade { animation: dtHeaderFade 180ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
      `}</style>

      {/* ── Sidebar — hidden in 3-day view ── */}
      {view !== "3day" && (
        <div
          id="desktop-sidebar"
          onClick={() => setSelectedId(null)}
          style={{
            width: "20%", flexShrink: 0,
            background: "#fff",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 8px 24px",
            scrollbarWidth: "none",
          } as React.CSSProperties}
        >
          <div key={activeDay} className={`dt-slide-${transitionDir}`}>
            {sidebarEntries.map((entry) => (
              <div key={entry.id} style={{ marginBottom: 8 }}>
                <TimedCard
                  id={entry.id}
                  title={entry.title}
                  timeRange={entry.timeRange}
                  avatarColor={entry.avatarColor}
                  tasks={entry.tasks}
                  initialExpanded={true}
                  noHorizontalMargin={true}
                  onProgressChange={onTimedProgressChange}
                  forceSignal={forceSignals[entry.id]}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{
        width: view === "3day" ? "100%" : "80%", height: "100%",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}>
        <DesktopHeader
          activeDay={activeDay}
          view={view}
          onViewChange={setView}
          dateLabel={dt3Label}
          onPrevDay={() => {
            if (view === "3day") setThreeDayStart((s) => Math.max(1, s - 3));
            else navigateDay(-1);
          }}
          onNextDay={() => {
            if (view === "3day") setThreeDayStart((s) => Math.min(7, s + 3));
            else navigateDay(1);
          }}
          onTodayJump={() => {
            if (view === "3day") setThreeDayStart(CURRENT_DAY <= 3 ? 1 : CURRENT_DAY <= 6 ? 4 : 7);
            else {
              setTransitionDir(activeDay > CURRENT_DAY ? "right" : "left");
              setActiveDay(CURRENT_DAY);
            }
          }}
        />

        {view === "3day" ? (
          /* 3-day view fills the content area and scrolls internally */
          <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
            <ThreeDayView
              start={threeDayStart}
              onStartChange={setThreeDayStart}
              currentDay={CURRENT_DAY}
              progressMaps={dtProgressMaps}
              progressHandlers={dtProgressHandlers}
              onForceSignal={() => {}}
              bottomPadding={0}
            />
          </div>
        ) : (
          /* Day view with slide animation */
          <div
            key={activeDay}
            className={`dt-slide-${transitionDir}`}
            style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <DesktopCalendarContent
              activeDay={activeDay}
              nowMin={nowMin}
              onSelectEntry={setSelectedId}
              timedProgress={timedProgress}
              onTimelineCheckbox={onTimelineCheckbox}
            />
          </div>
        )}

        {/* FAB */}
        <div
          style={{
            position: "absolute", bottom: 24, right: 24, zIndex: 10,
            width: 52, height: 52, borderRadius: 14,
            background: "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", userSelect: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [preset,      setPreset]      = useState<PresetKey>("iphone17");
  const [scale,       setScale]       = useState(1);
  const [menuOpen,    setMenuOpen]    = useState(true);
  const [platform,    setPlatform]    = useState<Platform>("mobile");

  // Reset scale to 1 when switching to desktop (no auto-fit needed)
  useEffect(() => {
    if (platform === "desktop") setScale(1);
  }, [platform]);

  // ── Dev menu drag-to-reposition ────────────────────────────────────────────
  const MENU_ORIGIN = { top: 16, left: 16 };
  const [menuPos,  setMenuPos]  = useState(MENU_ORIGIN);
  const menuPosRef = useRef(MENU_ORIGIN);

  // Stores drag and double-tap state without triggering re-renders
  const menuDrag = useRef({
    active:          false,
    startX:          0,
    startY:          0,
    startLeft:       16,
    startTop:        16,
    moved:           false,
    longPressTimer:  null as ReturnType<typeof setTimeout> | null,
  });
  const lastTap = useRef(0);

  // Global pointermove / pointerup so drag keeps working when pointer leaves the button
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!menuDrag.current.active) return;
      const dx = e.clientX - menuDrag.current.startX;
      const dy = e.clientY - menuDrag.current.startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth  - 40, menuDrag.current.startLeft + dx));
      const newTop  = Math.max(0, Math.min(window.innerHeight - 40, menuDrag.current.startTop  + dy));
      menuDrag.current.moved = true;
      menuPosRef.current = { top: newTop, left: newLeft };
      setMenuPos({ top: newTop, left: newLeft });
    };
    const onUp = () => {
      if (!menuDrag.current.active) return;
      menuDrag.current.active = false;
      if (menuDrag.current.longPressTimer) {
        clearTimeout(menuDrag.current.longPressTimer);
        menuDrag.current.longPressTimer = null;
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, []);

  const onMenuPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const now = Date.now();

    // ── Double-tap: restore to origin ────────────────────────────────────────
    if (now - lastTap.current < 350) {
      lastTap.current = 0;
      menuPosRef.current = MENU_ORIGIN;
      setMenuPos(MENU_ORIGIN);
      return;
    }
    lastTap.current = now;

    // ── Start long-press timer (300ms → activate drag) ────────────────────────
    const startX = e.clientX;
    const startY = e.clientY;
    menuDrag.current.moved = false;

    const timer = setTimeout(() => {
      menuDrag.current.active    = true;
      menuDrag.current.startX    = startX;
      menuDrag.current.startY    = startY;
      menuDrag.current.startLeft = menuPosRef.current.left;
      menuDrag.current.startTop  = menuPosRef.current.top;
      menuDrag.current.longPressTimer = null;
      setMenuOpen(false);          // auto-close panel when drag begins
    }, 300);

    menuDrag.current.longPressTimer = timer;
  }, []);

  const onMenuClick = useCallback(() => {
    // Suppress toggle when the pointer was used for dragging
    if (menuDrag.current.moved) {
      menuDrag.current.moved = false;
      return;
    }
    // Cancel if pointer-down already started a long-press timer (tap released early)
    if (menuDrag.current.longPressTimer) {
      clearTimeout(menuDrag.current.longPressTimer);
      menuDrag.current.longPressTimer = null;
    }
    setMenuOpen(v => !v);
  }, []);

  const isDesktop    = platform === "desktop";
  const isResponsive = !isDesktop && preset === "responsive";
  const { w, h }     = isDesktop ? { w: null, h: null } : PRESETS[preset];

  // Auto-fit scale to viewport whenever preset or window size changes (mobile fixed only)
  useEffect(() => {
    if (isDesktop || isResponsive) return;
    const fit = () => {
      const s = Math.min(1, (window.innerHeight - 48) / h!);
      setScale(parseFloat(s.toFixed(2)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [preset, isDesktop, isResponsive, h]);

  // Visual dimensions after scaling
  const visualW = (isDesktop || isResponsive) ? "100vw" : w! * scale;
  const visualH = (isDesktop || isResponsive) ? "100vh" : h! * scale;

  return (
    <div
      className={`${inter.variable}`}
      style={{
        minHeight: "100vh", width: "100%",
        background: "#E8E8ED",
        fontFamily: "var(--font-inter)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: (isDesktop || isResponsive) ? "hidden" : undefined,
      }}
    >
      {/* ── Viewport frame ── */}
      <div style={{ width: visualW, height: visualH, flexShrink: 0, position: "relative" }}>
        <div
          style={{
            transform: (isDesktop || isResponsive) ? (scale !== 1 ? `scale(${scale})` : undefined) : `scale(${scale})`,
            transformOrigin: "top left",
            width:  (isDesktop || isResponsive) ? "100%" : w!,
            height: (isDesktop || isResponsive) ? "100%" : h!,
            background: "#fff",
            overflow: "hidden",
            boxShadow: (isDesktop || isResponsive) ? "none" : "0 8px 40px rgba(0,0,0,0.18)",
            borderRadius: (isDesktop || isResponsive) ? 0 : 8,
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {isDesktop ? (
            <DesktopScreen />
          ) : (
            <DashboardScreen
              width={isResponsive ? "100%" : w!}
              height={isResponsive ? "100%" : h!}
            />
          )}
        </div>
      </div>

      {/* ── Dev menu ── */}
      <div
        style={{
          position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 2000,
          display: "flex", flexDirection: "column", gap: 8,
          alignItems: "flex-start",
        }}
      >
        {/* Toggle button — always visible; tap-and-hold to drag, double-tap to reset */}
        <button
          onPointerDown={onMenuPointerDown}
          onClick={onMenuClick}
          title={menuOpen ? "Hide menu (hold to drag, double-tap to reset)" : "Show menu (hold to drag, double-tap to reset)"}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: menuOpen ? "rgba(30,30,32,0.90)" : "rgba(30,30,32,0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            transition: `background ${MS.dFast} ${MS.eOut}`,
            // Prevent text-selection callout and scroll interference during drag
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4"/>
            <path d="M1 6h14" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4"/>
            <path d="M5 9.5h6M5 11.5h4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Menu panel */}
        {menuOpen && (
          <div
            style={{
              background: "rgba(22,22,24,0.88)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 10,
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              minWidth: 210,
            }}
          >
            {/* Platform toggle */}
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Platform
            </span>
            <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.07)", borderRadius: 9, padding: 3 }}>
              {(["mobile", "desktop"] as Platform[]).map((p) => {
                const isActive = platform === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    style={{
                      flex: 1, height: 28, borderRadius: 7, border: "none",
                      background: isActive ? BLUE : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                      fontSize: 12, fontWeight: isActive ? 600 : 400,
                      cursor: "pointer", fontFamily: "var(--font-inter)",
                      transition: `background ${MS.dFast} ${MS.eOut}, color ${MS.dFast} ${MS.eOut}`,
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* Viewport section — mobile only */}
            {!isDesktop && (
              <>
                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 -2px" }} />

                {/* Section label */}
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Viewport
                </span>

                {/* Preset options */}
                {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
                  const p = PRESETS[key];
                  const active = preset === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setPreset(key)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 10, cursor: "pointer", borderRadius: 8,
                        padding: "7px 10px",
                        background: active ? "rgba(85,139,247,0.22)" : "transparent",
                        transition: `background ${MS.dFast} ${MS.eOut}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                          border: active ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                          background: active ? BLUE : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <span style={{ fontSize: 13, color: active ? "#fff" : "rgba(255,255,255,0.65)", fontWeight: active ? 500 : 400 }}>
                          {p.label}
                        </span>
                      </div>
                      {p.w && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                          {p.w}×{p.h}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 -2px" }} />

            {/* Scale slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: (!isDesktop && isResponsive) ? 0.35 : 1, transition: `opacity ${MS.dFast} ${MS.eOut}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Scale
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="3" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
                </svg>
                <input
                  type="range" min={0.3} max={1} step={0.01} value={scale}
                  disabled={!isDesktop && isResponsive}
                  onChange={(e) => setScale(Number(e.target.value))}
                  style={{ flex: 1, accentColor: BLUE, cursor: (!isDesktop && isResponsive) ? "not-allowed" : "pointer" }}
                />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="0.5" y="1.5" width="11" height="9" rx="1.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
