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

type CalendarView = "day" | "3day" | "month";

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
}: {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  showTodayBtn?: boolean;
  onTodayJump?: () => void;
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
        <div className="font-bold text-black" style={{ fontSize: 26, lineHeight: "1.1" }}>April</div>
        <div className="font-normal text-black/50" style={{ fontSize: 13, marginTop: 1 }}>2026</div>
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
            {CALENDAR_VIEWS.map((v) => {
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

// Rounded-rect progress ring drawn around the active day cell (44×52, rx=12).
// Uses an explicit <path> so strokeDasharray traces the outline exactly,
// starting from the top-center and going clockwise.
function DayRing({ progress }: { progress: number }) {
  const W = 44, H = 52, RX = 12, SW = 2.5;
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

const WEEK_DAYS = [
  { label: "S", num: "1", id: 1 },
  { label: "M", num: "2", id: 2 },
  { label: "T", num: "3", id: 3 },
  { label: "W", num: "4", id: 4 },
  { label: "T", num: "5", id: 5 },
  { label: "F", num: "6", id: 6 },
  { label: "S", num: "7", id: 7 },
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

function TaskCard({
  id,
  title,
  accentColor,
  tasks = [],
  initialDoneMap,
  initialChecked = false,
  onProgressChange,
}: {
  id: string;
  title: string;
  accentColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
  initialChecked?: boolean;
  onProgressChange?: (id: string, done: number, total: number) => void;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [doneMap,       setDoneMap]       = useState<Record<number, boolean>>(() => initialDoneMap ?? {});
  const [simpleChecked, setSimpleChecked] = useState(initialChecked); // used when no tasks

  const total     = tasks.length;
  const doneCount = Object.values(doneMap).filter(Boolean).length;
  const allDone   = total > 0 && doneCount === total;

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
            maxHeight: expanded ? `${tasks.length * 56 + 52}px` : "0px",
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
  onProgressChange,
}: {
  id: string;
  title: string;
  timeRange: string;
  avatarColor: string;
  tasks?: SubTask[];
  initialDoneMap?: Record<number, boolean>;
  onProgressChange?: (id: string, done: number, total: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [doneMap,  setDoneMap]  = useState<Record<number, boolean>>(() => initialDoneMap ?? {});

  const total     = tasks.length;
  const doneCount = Object.values(doneMap).filter(Boolean).length;
  const allDone   = total > 0 && doneCount === total;

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
      className="mx-4 bg-white"
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
          maxHeight: expanded ? `${tasks.length * 56 + 52}px` : "0px",
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
}: {
  dayId: number;
  isVisible: boolean;
  progressMap: Record<string, { done: number; total: number }>;
  onProgressChange: (id: string, done: number, total: number) => void;
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
}: {
  title: string;
  accentColor: string;
  done: number;
  total: number;
}) {
  const progress = total > 0 ? done / total : done; // handles simple checked (done=1,total=1)
  const isChecked = total > 0 && done === total;
  const trackH = 24;
  const fillH = Math.round(trackH * Math.min(Math.max(progress, 0), 1));

  return (
    <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 8, overflow: "hidden" }}>
      <div
        className="flex items-center"
        style={{ minHeight: 38, position: "relative", paddingLeft: 17, paddingRight: 8, paddingTop: 5, paddingBottom: 5 }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
            width: 3, height: trackH, borderRadius: 2,
            background: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: `${fillH}px`, borderRadius: 2, background: accentColor,
              transition: `height ${MS.dProgress} ${MS.eOut}`,
            }}
          />
        </div>
        <span className="font-medium text-black flex-1" style={{ fontSize: 10.5, lineHeight: "1.35" }}>
          {title}
        </span>
        {/* Circle checkbox — same style as Day view subtask circles */}
        <div
          style={{
            width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginLeft: 4,
            border: isChecked ? "none" : "2px solid rgba(0,0,0,0.18)",
            background: isChecked ? BLUE : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isChecked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
}: {
  title: string;
  timeRange: string;
  avatarColor: string;
  done: number;
  total: number;
}) {
  const progress = total > 0 ? done / total : 0;
  const isChecked = total > 0 && done === total;
  const trackH = 24;
  const fillH = Math.round(trackH * Math.min(Math.max(progress, 0), 1));

  return (
    <div className="bg-white" style={{ boxShadow: CARD_SHADOW, borderRadius: 8, overflow: "hidden" }}>
      <div
        className="flex items-center"
        style={{ minHeight: 44, position: "relative", paddingLeft: 17, paddingRight: 8, paddingTop: 5, paddingBottom: 5 }}
      >
        {/* Linear progress bar — same pattern as CompactTaskCard */}
        <div
          style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
            width: 3, height: trackH, borderRadius: 2,
            background: `color-mix(in srgb, ${avatarColor} 25%, transparent)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: `${fillH}px`, borderRadius: 2, background: avatarColor,
              transition: `height ${MS.dProgress} ${MS.eOut}`,
            }}
          />
        </div>
        {/* Title + time */}
        <div className="flex-1 min-w-0" style={{ marginRight: 6 }}>
          <div className="font-medium text-black truncate" style={{ fontSize: 10.5, lineHeight: "1.3" }}>{title}</div>
          <div style={{ fontSize: 9.5, color: "#999", marginTop: 1 }}>{timeRange}</div>
        </div>
        {/* Circle checkbox */}
        <div
          style={{
            width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
            border: isChecked ? "none" : "2px solid rgba(0,0,0,0.18)",
            background: isChecked ? BLUE : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isChecked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  showDivider,
}: {
  dayId: number;
  currentDay: number;
  cardProgressMap: Record<string, { done: number; total: number }>;
  showDivider: boolean;
}) {
  const day = DAY_CONTENT[dayId];
  const dayInfo = WEEK_DAYS.find((d) => d.id === dayId)!;
  const isToday = dayId === currentDay;

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
      {/* Day header */}
      <div className="flex flex-col items-center" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <div style={{ position: "relative", width: 44, height: 52 }}>
          <DayRing progress={ringProgress} />
          <div className="flex flex-col items-center justify-center" style={{ width: "100%", height: "100%" }}>
            <span className="font-medium" style={{ fontSize: 12, color: isToday ? BLUE : "#000", lineHeight: "1.2" }}>
              {dayInfo.label}
            </span>
            <span className="font-medium" style={{ fontSize: 13, color: isToday ? BLUE : "#585858", marginTop: 2 }}>
              {dayInfo.num}
            </span>
          </div>
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
}: {
  start: number; // page-aligned: 1, 4, or 7
  onStartChange: (s: number) => void;
  currentDay: number;
  progressMaps: Record<number, Record<string, { done: number; total: number }>>;
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
      style={{ position: "relative", overflow: "hidden", paddingBottom: 100 }}
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
            showDivider={i < arr.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

// April 2026: 30 days, April 1 = Wednesday (dow 3, 0 = Sunday)
const APRIL_START_DOW = 3;
const APRIL_DAYS = 30;
// In our prototype: CURRENT_DAY(2) = Monday = April 2
const MONTH_TODAY_DATE = 2;

function MonthCellRing({ progress, size = 28 }: { progress: number; size?: number }) {
  const sw = 2;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circ * (1 - clamped);

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%) rotate(-90deg)",
        pointerEvents: "none",
      }}
    >
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={BLUE} strokeWidth={sw}
        strokeOpacity={progress > 0 ? 0.18 : 0}
        style={{ transition: `stroke-opacity ${MS.dProgress} ${MS.eOut}` }}
      />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={BLUE} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: `stroke-dashoffset ${MS.dProgress} ${MS.eOut}` }}
      />
    </svg>
  );
}

function MonthView({
  progressMaps,
  onDayTap,
}: {
  progressMaps: Record<number, Record<string, { done: number; total: number }>>;
  onDayTap: (date: number) => void;
}) {
  // Build flat cell array
  const cells: (number | null)[] = [];
  for (let i = 0; i < APRIL_START_DOW; i++) cells.push(null);
  for (let d = 1; d <= APRIL_DAYS; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  // Collect dot colors for a given date (dates 1–7 map directly to our day IDs)
  const getDotColors = (date: number): string[] => {
    if (date < 1 || date > 7) return [];
    const day = DAY_CONTENT[date];
    if (!day) return [];
    const colors: string[] = [];
    for (const t of day.anytime) colors.push(t.accentColor);
    for (const t of day.planned) if (t.kind === "timed") colors.push(t.avatarColor);
    return colors;
  };

  const getRingProgress = (date: number): number => {
    if (date < 1 || date > 7) return 0;
    const map = progressMaps[date] ?? {};
    const vals = Object.values(map);
    if (vals.length === 0) return 0;
    const { done, total } = vals.reduce(
      (acc, e) => ({ done: acc.done + e.done, total: acc.total + e.total }),
      { done: 0, total: 0 }
    );
    return total > 0 ? done / total : 0;
  };

  return (
    <div style={{ padding: "8px 8px 100px" }}>
      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {DOW_LABELS.map((lbl, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#bbb", paddingBottom: 6 }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {week.map((date, di) => {
              if (date === null) {
                return <div key={di} style={{ minHeight: 54 }} />;
              }

              const isToday = date === MONTH_TODAY_DATE;
              const allDots = getDotColors(date);
              const visibleDots = allDots.slice(0, 4);
              const extraDots = Math.max(0, allDots.length - 4);
              const ringProg = getRingProgress(date);

              return (
                <div
                  key={di}
                  onClick={() => onDayTap(date)}
                  style={{
                    minHeight: 54,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    paddingTop: 5, paddingBottom: 5,
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isToday ? "rgba(85,139,247,0.06)" : "transparent",
                  }}
                >
                  {/* Date number + ring */}
                  <div style={{ position: "relative", width: 28, height: 28, marginBottom: 4 }}>
                    <MonthCellRing progress={ringProg} size={28} />
                    {isToday && (
                      <div style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 22, height: 22, borderRadius: "50%", background: BLUE,
                      }} />
                    )}
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : "#1a1a1a",
                        lineHeight: 1,
                      }}>
                        {date}
                      </span>
                    </div>
                  </div>

                  {/* Task dots */}
                  {visibleDots.length > 0 && (
                    <div style={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                      {visibleDots.map((color, i) => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      ))}
                      {extraDots > 0 && (
                        <span style={{ fontSize: 8, color: "#bbb", lineHeight: 1 }}>+{extraDots}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
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
          />
        ))}

        {/* 3-Day view */}
        {view === "3day" && (
          <ThreeDayView
            start={threeDayStart}
            onStartChange={setThreeDayStart}
            currentDay={CURRENT_DAY}
            progressMaps={progressMaps}
          />
        )}

        {/* Month view */}
        {view === "month" && (
          <MonthView
            progressMaps={progressMaps}
            onDayTap={(_date) => {
              // TODO: show day popover
            }}
          />
        )}
      </div>

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [preset,      setPreset]      = useState<PresetKey>("iphone17");
  const [scale,       setScale]       = useState(1);
  const [menuOpen,    setMenuOpen]    = useState(true);

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

  const isResponsive = preset === "responsive";
  const { w, h } = PRESETS[preset];

  // Auto-fit scale to viewport whenever preset or window size changes
  useEffect(() => {
    if (isResponsive) return;
    const fit = () => {
      const s = Math.min(1, (window.innerHeight - 48) / h!);
      setScale(parseFloat(s.toFixed(2)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [preset, isResponsive, h]);

  // Visual dimensions after scaling
  const visualW = isResponsive ? "100vw" : w! * scale;
  const visualH = isResponsive ? "100vh" : h! * scale;

  return (
    <div
      className={`${inter.variable}`}
      style={{
        minHeight: "100vh", width: "100%",
        background: "#E8E8ED",
        fontFamily: "var(--font-inter)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: isResponsive ? "hidden" : undefined,
      }}
    >
      {/* ── Viewport frame ── */}
      <div style={{ width: visualW, height: visualH, flexShrink: 0, position: "relative" }}>
        <div
          style={{
            transform: isResponsive ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
            width:  isResponsive ? "100%" : w!,
            height: isResponsive ? "100%" : h!,
            background: "#fff",
            overflow: "hidden",
            // Subtle shadow so the frame reads against the background
            boxShadow: isResponsive ? "none" : "0 8px 40px rgba(0,0,0,0.18)",
            borderRadius: isResponsive ? 0 : 8,
            // Disable text selection inside the prototype
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <DashboardScreen
            width={isResponsive ? "100%" : w!}
            height={isResponsive ? "100%" : h!}
          />
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
                    {/* Selection dot */}
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

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 -2px" }} />

            {/* Scale slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: isResponsive ? 0.35 : 1, transition: `opacity ${MS.dFast} ${MS.eOut}` }}>
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
                  disabled={isResponsive}
                  onChange={(e) => setScale(Number(e.target.value))}
                  style={{ flex: 1, accentColor: BLUE, cursor: isResponsive ? "not-allowed" : "pointer" }}
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
