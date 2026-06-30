import type { CSSProperties } from "react";
import { groupOf, posLabel } from "../../../shared/formations.js";
import type { Position } from "../../../shared/types.js";

export interface PitchSlot {
  id: string;
  pos: Position;
  x: number;
  y: number;
  /** Display label (player surname when filled, position label when empty). */
  label: string;
  /** Filled => true. */
  filled: boolean;
  /** Effective rating, shown for filled slots when ratings aren't hidden. */
  rating?: number;
  /** True if a position penalty applies. */
  penalty?: boolean;
  /** Hide ratings (hardcore). When filled, shows hidden position chip. */
  hideRating?: boolean;
  /** Show position tag chip (above the dot). */
  showPos?: boolean;
  /** Highlight this slot as a candidate target. */
  open?: boolean;
  /** Mark this filled slot as the current sub source. */
  selectedSub?: boolean;
}

/**
 * Container context the pitch renders in. Drives sizing and which filled
 * slots look clickable, matching what used to be ancestor-scoped CSS
 * (`.draft-board`, `.half-pitch`, `.cup-draft-pitch`, `.setup-pitch`).
 */
export type PitchVariant = "default" | "setup" | "draft" | "half" | "cupDraft";

export interface PitchProps {
  slots: PitchSlot[];
  small?: boolean;
  interactive?: boolean;
  className?: string;
  onSlotClick?: (slotId: string, filled: boolean) => void;
  variant?: PitchVariant;
  /** Draft pick-mode: highlight every empty slot. Kept off the slot data
   * itself so selecting a player doesn't rebuild the pitch / cause a flicker. */
  picking?: boolean;
  /** Draft reposition-mode: dim every empty slot that isn't a valid target. */
  repositioning?: boolean;
}

const POS_DOT_BG: Record<string, string> = {
  gk: "bg-[#f6a823]",
  def: "bg-[#4a90e2]",
  mid: "bg-[#1fc77d]",
  att: "bg-[#ff5d6c]",
};
const POS_DOT_TEXT_WHITE = new Set(["def", "att"]);

function Slot({
  slot,
  small,
  interactive,
  variant,
  picking,
  repositioning,
  onClick,
}: {
  slot: PitchSlot;
  small: boolean;
  interactive: boolean;
  variant: PitchVariant;
  picking: boolean;
  repositioning: boolean;
  onClick?: (id: string, filled: boolean) => void;
}) {
  const group = groupOf(slot.pos).toLowerCase();
  // A slot highlights either because it's individually marked `open` (a valid
  // drop target) or because the whole pitch is in pick-mode.
  const effectiveOpen = Boolean(slot.open) || (picking && !slot.filled);
  const dimmed = !slot.filled && !effectiveOpen && repositioning;
  const allFilledClickable = variant === "half" || variant === "cupDraft";
  const clickable = interactive && (effectiveOpen || (slot.filled && allFilledClickable));

  const style: CSSProperties = { left: `${slot.x}%`, bottom: `${slot.y}%` };

  const slotWidth = variant === "half" ? "w-14" : small ? "w-[46px]" : "w-[60px]";
  const dotSize = small ? "h-7 w-7 text-[11px]" : "h-[38px] w-[38px] text-sm";
  const dotSizeHidden = small ? "h-8 w-8 text-[11px]" : dotSize;
  const nameMaxWidth = variant === "half" ? "max-w-[4.25rem]" : "max-w-[72px]";
  const nameFontSize = variant === "half" ? "text-[0.58rem]" : small ? "text-[9px]" : "text-[11px]";

  // The pitch is always rendered on a fixed-green field, never on a themed
  // card — these "white" tones must stay literal so the light-theme utility
  // overrides (which retarget `border-white/`/`bg-white/`/`text-white`
  // classes for readability on light cards) don't reinterpret them.
  let dotState: string;
  if (slot.filled) {
    const selectedSubRing =
      (variant === "half" || variant === "cupDraft") && slot.selectedSub;
    const ring = selectedSubRing
      ? "border-pebol-gold shadow-[0_0_0_5px_rgba(255,206,84,0.22),0_3px_8px_rgba(0,0,0,0.45)]"
      : effectiveOpen
        ? "border-pebol-gold shadow-[0_0_0_4px_rgba(255,206,84,0.2),0_3px_8px_rgba(0,0,0,0.45)]"
        : "border-[rgba(255,255,255,0.85)] shadow-[0_3px_8px_rgba(0,0,0,0.45)]";
    dotState = `${POS_DOT_BG[group] ?? ""} ${POS_DOT_TEXT_WHITE.has(group) ? "text-[#ffffff]" : "text-[#04130c]"} border-2 ${ring}`;
  } else if (effectiveOpen) {
    dotState =
      "bg-[rgba(255,255,255,0.22)] text-[rgba(255,255,255,0.7)] border-2 border-dashed border-pebol-gold shadow-[0_3px_8px_rgba(0,0,0,0.45)] animate-[pitchSlotPulse_1.2s_infinite]";
  } else if (dimmed) {
    dotState =
      "bg-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.7)] border-2 border-dashed border-[rgba(255,255,255,0.24)] shadow-[0_3px_8px_rgba(0,0,0,0.45)] opacity-[0.42]";
  } else {
    dotState =
      "bg-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.7)] border-2 border-dashed border-[rgba(255,255,255,0.85)] shadow-[0_3px_8px_rgba(0,0,0,0.45)]";
  }

  const dot = slot.filled && slot.hideRating ? dotSizeHidden : dotSize;

  return (
    <div
      className={`absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-0.5 text-center ${slotWidth} ${clickable ? "cursor-pointer" : ""}`}
      data-slot={slot.id}
      style={style}
      onClick={
        onClick
          ? (ev) => {
              ev.stopPropagation();
              onClick(slot.id, slot.filled);
            }
          : undefined
      }
    >
      {slot.filled && slot.showPos ? (
        <span
          className={`absolute -top-[9px] left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded border px-1 py-0.5 text-[8px] font-extrabold leading-none tracking-[0.3px] ${
            slot.selectedSub
              ? "border-pebol-gold bg-pebol-gold text-[#1a1305]"
              : "border-[rgba(255,255,255,0.18)] bg-[rgba(4,10,20,0.82)] text-[#ffffff]"
          }`}
        >
          {posLabel(slot.pos)}
        </span>
      ) : null}
      <div className={`relative flex items-center justify-center rounded-full font-extrabold ${dot} ${dotState}`}>
        {slot.filled && slot.hideRating ? (
          <span className="inline-flex min-w-[1.65rem] items-center justify-center text-[0.72rem] font-black leading-none tracking-[-0.02rem]">
            {posLabel(slot.pos)}
          </span>
        ) : null}
        {slot.filled && !slot.hideRating && slot.rating !== undefined ? (
          <span className="leading-none">{slot.rating}</span>
        ) : null}
        {slot.filled && !slot.hideRating && slot.penalty ? (
          <span
            className="absolute -right-1.5 -top-1.5 text-[11px] text-[#ff5d6c]"
            title="Fora de posição"
          >
            ▼
          </span>
        ) : null}
      </div>
      <span
        className={`overflow-hidden text-ellipsis whitespace-nowrap rounded bg-[rgba(0,0,0,0.55)] px-[5px] py-px text-[#ffffff] ${nameMaxWidth} ${nameFontSize}`}
      >
        {slot.label}
      </span>
    </div>
  );
}

export function Pitch({
  slots,
  small = false,
  interactive = false,
  className = "",
  onSlotClick,
  variant = "default",
  picking = false,
  repositioning = false,
}: PitchProps) {
  const maxWidth =
    variant === "setup" && small
      ? "max-w-[min(300px,100%)]"
      : variant === "draft" && small
        ? "max-w-[min(26rem,100%)]"
        : variant === "half"
          ? "max-w-[18.5rem]"
          : variant === "cupDraft"
            ? "max-w-[28rem]"
            : "";
  const cls = [
    "pitch",
    small ? maxWidth || "max-w-[330px]" : maxWidth,
    variant === "half" ? "mb-[0.35rem]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="pitch-lines" />
      {slots.map((s) => (
        <Slot
          key={s.id}
          slot={s}
          small={small}
          interactive={interactive}
          variant={variant}
          picking={picking}
          repositioning={repositioning}
          onClick={onSlotClick}
        />
      ))}
    </div>
  );
}
