import assert from "node:assert/strict";
import { createBallMotionTracker } from "./lib/ballMotion.js";

const track = createBallMotionTracker();

const stationary = track("kickoff", 50, 50, 500);
assert.equal(stationary.motion, "roll");
assert.equal(stationary.rollFrom, 0);
assert.equal(stationary.rollTo, 0);

const cross = track("corner", 82, 24, 900);
assert.equal(cross.motion, "air");
assert.ok((cross.distance ?? 0) > 30);
assert.ok((cross.rollTo ?? 0) > 360);

const rollAfterCross = cross.rollTo ?? 0;
const save = track("save", 28, 38, 700);
assert.equal(save.motion, "deflect");
assert.ok((save.rollTo ?? 0) < rollAfterCross);

const goal = track("goal", 94, 42, 850);
assert.equal(goal.motion, "strike");
assert.equal(goal.goal, true);
assert.equal(goal.sequence, 4);

console.log("Ball motion: stationary, aerial, deflection and strike scenarios passed.");
