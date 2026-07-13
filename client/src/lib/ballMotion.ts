import type { MatchEventType } from "../../../shared/types.js";
import type { BallMotionKind, BallState } from "./liveStore.js";

const BALL_CIRCUMFERENCE_PERCENT = 18.5;

function motionKind(type: MatchEventType): BallMotionKind {
  switch (type) {
    case "corner":
      return "air";
    case "chance":
    case "goal":
    case "penalty":
      return "strike";
    case "save":
      return "deflect";
    case "kickoff":
    case "possession":
      return "roll";
    case "offside":
    case "foul":
    case "card":
    case "injury":
    case "var":
    case "halftime":
    case "fulltime":
    case "info":
      return "settle";
    default:
      return "pass";
  }
}

export function createBallMotionTracker() {
  let previousLeft = 50;
  let previousTop = 50;
  let accumulatedRoll = 0;
  let sequence = 0;

  return (type: MatchEventType, left: number, top: number, transitionMs: number): Partial<BallState> => {
    const dx = left - previousLeft;
    const dy = (top - previousTop) * 0.65;
    const distance = Math.hypot(dx, dy);
    const direction = Math.abs(dx) > 0.25 ? Math.sign(dx) : Math.sign(dy || 1);
    const rollFrom = accumulatedRoll;
    const rotations = distance < 0.15
      ? 0
      : Math.max(0.08, distance / BALL_CIRCUMFERENCE_PERCENT);
    accumulatedRoll += rotations * 360 * direction;
    previousLeft = left;
    previousTop = top;
    sequence += 1;

    return {
      left,
      top,
      transitionMs,
      goal: type === "goal",
      motion: motionKind(type),
      sequence,
      rollFrom,
      rollTo: accumulatedRoll,
      distance,
    };
  };
}
