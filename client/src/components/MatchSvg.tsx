import { useMemo } from "react";

function fieldGridLines() {
  const v: { x: number }[] = [];
  for (let x = 5; x < 105; x += 5) v.push({ x });
  const h: { y: number }[] = [];
  for (let y = 5; y < 68; y += 5) h.push({ y });
  return { v, h };
}

export function BallFieldSvg() {
  const { v, h } = useMemo(fieldGridLines, []);
  return (
    <svg
      className="absolute inset-0 block h-full w-full"
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bfPitchShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.045" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#00140b" stopOpacity="0.14" />
        </linearGradient>
        <pattern id="bfPitchStripes" patternUnits="userSpaceOnUse" width="14" height="68">
          <rect x="0" y="0" width="14" height="68" fill="#287a45" />
          <rect x="0" y="0" width="7" height="68" fill="#236f3e" />
          <rect x="0" y="0" width="14" height="68" fill="url(#bfPitchShade)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="105" height="68" className="fill-[url(#bfPitchStripes)]" />
      <g>
        {v.map((l) => (
          <line key={`v${l.x}`} x1={l.x} y1="0" x2={l.x} y2="68" className="stroke-white/[0.07] stroke-[0.18]" />
        ))}
        {h.map((l) => (
          <line key={`h${l.y}`} x1="0" y1={l.y} x2="105" y2={l.y} className="stroke-white/[0.07] stroke-[0.18]" />
        ))}
      </g>
      <g className="fill-none stroke-white/45 stroke-[0.4]">
        <rect x={0.5} y={0.5} width="104" height="67" />
        <line x1={52.5} y1={0.5} x2={52.5} y2={67.5} />
        <circle cx={52.5} cy="34" r={9.15} fill="none" />
        <circle cx={52.5} cy="34" r={0.6} className="fill-white/60 stroke-none" />
        <rect x={0.5} y={13.84} width={16.5} height={40.32} fill="none" />
        <rect x="88" y={13.84} width={16.5} height={40.32} fill="none" />
        <rect x={0.5} y={24.84} width={5.5} height={18.32} fill="none" />
        <rect x="99" y={24.84} width={5.5} height={18.32} fill="none" />
        <circle cx="11" cy="34" r={0.6} className="fill-white/60 stroke-none" />
        <circle cx="94" cy="34" r={0.6} className="fill-white/60 stroke-none" />
      </g>
    </svg>
  );
}

export function SoccerBallSvg() {
  return (
    <img
      className="block h-full w-full"
      src="/soccer-ball.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
