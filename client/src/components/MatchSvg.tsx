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
      className="bf-svg"
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="105" height="68" className="bf-pitch" />
      <g>
        {v.map((l) => (
          <line key={`v${l.x}`} x1={l.x} y1="0" x2={l.x} y2="68" className="bf-grid" />
        ))}
        {h.map((l) => (
          <line key={`h${l.y}`} x1="0" y1={l.y} x2="105" y2={l.y} className="bf-grid" />
        ))}
      </g>
      <g className="bf-lines">
        <rect x={0.5} y={0.5} width="104" height="67" />
        <line x1={52.5} y1={0.5} x2={52.5} y2={67.5} />
        <circle cx={52.5} cy="34" r={9.15} fill="none" />
        <circle cx={52.5} cy="34" r={0.6} className="bf-spot" />
        <rect x={0.5} y={13.84} width={16.5} height={40.32} fill="none" />
        <rect x="88" y={13.84} width={16.5} height={40.32} fill="none" />
        <rect x={0.5} y={24.84} width={5.5} height={18.32} fill="none" />
        <rect x="99" y={24.84} width={5.5} height={18.32} fill="none" />
        <circle cx="11" cy="34" r={0.6} className="bf-spot" />
        <circle cx="94" cy="34" r={0.6} className="bf-spot" />
      </g>
    </svg>
  );
}

function pentagonPoints(cx: number, cy: number, r: number, rot: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rot + i * 72 - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function rimPentagons(): string[] {
  const rim: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = ((i * 72 - 90) * Math.PI) / 180;
    rim.push(pentagonPoints(50 + 46 * Math.cos(t), 50 + 46 * Math.sin(t), 14, i * 72));
  }
  return rim;
}

/** Classic black/white soccer ball with a center pentagon, 5 rim pentagons
 * clipped to the circle, and a spherical light/shadow overlay. */
export function SoccerBallSvg() {
  const rim = useMemo(rimPentagons, []);
  const center = useMemo(() => pentagonPoints(50, 50, 15, 0), []);
  return (
    <svg
      className="bf-ball-svg"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="bfClip">
          <circle cx="50" cy="50" r={47.5} />
        </clipPath>
        <radialGradient id="bfShine" cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="42%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.34} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r={47.5} fill="#f2f2f2" />
      <g clipPath="url(#bfClip)" fill="#1a1a1a">
        <polygon points={center} />
        {rim.map((p, i) => (
          <polygon key={i} points={p} />
        ))}
      </g>
      <circle cx="50" cy="50" r={47.5} fill="url(#bfShine)" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="#c2c2c2" strokeWidth="1" />
    </svg>
  );
}
