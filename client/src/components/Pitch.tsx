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

export interface PitchProps {
  slots: PitchSlot[];
  small?: boolean;
  interactive?: boolean;
  className?: string;
  onSlotClick?: (slotId: string, filled: boolean) => void;
}

function Slot({
  slot,
  onClick,
}: {
  slot: PitchSlot;
  onClick?: (id: string, filled: boolean) => void;
}) {
  const cls = [
    "slot",
    slot.filled ? "filled" : "empty",
    slot.open ? "open" : "",
    slot.selectedSub ? "selected-sub" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties = { left: `${slot.x}%`, bottom: `${slot.y}%` };
  return (
    <div
      className={cls}
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
        <span className="slot-postag">{posLabel(slot.pos)}</span>
      ) : null}
      <div className={`slot-dot pos-${groupOf(slot.pos).toLowerCase()}`}>
        {slot.filled && slot.hideRating ? (
          <span className="slot-hidden-pos">{posLabel(slot.pos)}</span>
        ) : null}
        {slot.filled && !slot.hideRating && slot.rating !== undefined ? (
          <span className="slot-rt">{slot.rating}</span>
        ) : null}
        {slot.filled && !slot.hideRating && slot.penalty ? (
          <span className="slot-pen" title="Fora de posição">
            ▼
          </span>
        ) : null}
      </div>
      <span className="slot-name">{slot.label}</span>
    </div>
  );
}

export function Pitch({
  slots,
  small = false,
  interactive = false,
  className = "",
  onSlotClick,
}: PitchProps) {
  const cls = [
    "pitch",
    small ? "small" : "",
    interactive ? "interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="pitch-lines" />
      {slots.map((s) => (
        <Slot key={s.id} slot={s} onClick={onSlotClick} />
      ))}
    </div>
  );
}
