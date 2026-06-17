import type { ReactElement } from "react";

interface FlagSvgProps {
  children: ReactElement | ReactElement[];
}

function FlagSvg({ children }: FlagSvgProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function HStripes({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill={a} />
      <rect width="60" height={13.34} y={13.33} fill={b} />
      <rect width="60" height={13.34} y={26.66} fill={c} />
    </FlagSvg>
  );
}

function VStripes({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <FlagSvg>
      <rect width="20" height="40" x="0" fill={a} />
      <rect width="20" height="40" x="20" fill={b} />
      <rect width="20" height="40" x="40" fill={c} />
    </FlagSvg>
  );
}

const FLAGS: Record<string, () => ReactElement> = {
  Brasil: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#009b3a" />
      <polygon points="30,4 55,20 30,36 5,20" fill="#fedf00" />
      <circle cx="30" cy="20" r="7.5" fill="#002776" />
    </FlagSvg>
  ),
  "Brasil 1970": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#009b3a" />
      <polygon points="30,4 55,20 30,36 5,20" fill="#fedf00" />
      <circle cx="30" cy="20" r="7.5" fill="#002776" />
    </FlagSvg>
  ),
  Alemanha: () => <HStripes a="#000000" b="#dd0000" c="#ffce00" />,
  Argentina: () => <HStripes a="#74acdf" b="#ffffff" c="#74acdf" />,
  "Arábia Saudita": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#006c35" />
      <rect x="8" y="13" width="44" height="2" fill="#ffffff" />
      <rect x="14" y="22" width="32" height="3" fill="#ffffff" />
    </FlagSvg>
  ),
  Bélgica: () => <VStripes a="#000000" b="#fdda24" c="#ef3340" />,
  Colômbia: () => (
    <FlagSvg>
      <rect width="60" height="20" y="0" fill="#fcd116" />
      <rect width="60" height="10" y="20" fill="#003893" />
      <rect width="60" height="10" y="30" fill="#ce1126" />
    </FlagSvg>
  ),
  "Coreia do Sul": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <circle cx="30" cy="20" r="9" fill="#cd2e3a" />
      <path
        d="M30 11 a9 9 0 0 1 0 18 a4.5 4.5 0 0 1 0 -9 a4.5 4.5 0 0 0 0 -9z"
        fill="#0047a0"
      />
    </FlagSvg>
  ),
  "Costa Rica": () => (
    <FlagSvg>
      <rect width="60" height="8" y="0" fill="#002b7f" />
      <rect width="60" height="6" y="8" fill="#ffffff" />
      <rect width="60" height="12" y="14" fill="#ce1126" />
      <rect width="60" height="6" y="26" fill="#ffffff" />
      <rect width="60" height="8" y="32" fill="#002b7f" />
    </FlagSvg>
  ),
  Croácia: () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#d8262a" />
      <rect width="60" height={13.34} y={13.33} fill="#ffffff" />
      <rect width="60" height={13.34} y={26.66} fill="#171796" />
      <g fill="#d8262a">
        <rect x="24" y="14" width="3" height="3" />
        <rect x="30" y="14" width="3" height="3" />
        <rect x="36" y="14" width="3" height="3" />
        <rect x="27" y="17" width="3" height="3" />
        <rect x="33" y="17" width="3" height="3" />
        <rect x="24" y="20" width="3" height="3" />
        <rect x="30" y="20" width="3" height="3" />
        <rect x="36" y="20" width="3" height="3" />
      </g>
    </FlagSvg>
  ),
  Espanha: () => (
    <FlagSvg>
      <rect width="60" height="10" y="0" fill="#aa151b" />
      <rect width="60" height="20" y="10" fill="#f1bf00" />
      <rect width="60" height="10" y="30" fill="#aa151b" />
    </FlagSvg>
  ),
  "Estados Unidos": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <g fill="#b22234">
        <rect y="0" width="60" height="3" />
        <rect y="6" width="60" height="3" />
        <rect y="12" width="60" height="3" />
        <rect y="18" width="60" height="3" />
        <rect y="24" width="60" height="3" />
        <rect y="30" width="60" height="3" />
        <rect y="36" width="60" height="3" />
      </g>
      <rect x="0" y="0" width="24" height="21" fill="#3c3b6e" />
      <g fill="#ffffff">
        <circle cx="4" cy="4" r="0.9" />
        <circle cx="10" cy="4" r="0.9" />
        <circle cx="16" cy="4" r="0.9" />
        <circle cx="22" cy="4" r="0.9" />
        <circle cx="7" cy="8" r="0.9" />
        <circle cx="13" cy="8" r="0.9" />
        <circle cx="19" cy="8" r="0.9" />
        <circle cx="4" cy="12" r="0.9" />
        <circle cx="10" cy="12" r="0.9" />
        <circle cx="16" cy="12" r="0.9" />
        <circle cx="22" cy="12" r="0.9" />
        <circle cx="7" cy="16" r="0.9" />
        <circle cx="13" cy="16" r="0.9" />
        <circle cx="19" cy="16" r="0.9" />
      </g>
    </FlagSvg>
  ),
  França: () => <VStripes a="#0055a4" b="#ffffff" c="#ef4135" />,
  Gana: () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#ce1126" />
      <rect width="60" height={13.34} y={13.33} fill="#fcd116" />
      <rect width="60" height={13.34} y={26.66} fill="#006b3f" />
      <polygon
        points="30,15 32,21 38,21 33,24 35,30 30,26 25,30 27,24 22,21 28,21"
        fill="#000000"
      />
    </FlagSvg>
  ),
  Holanda: () => <HStripes a="#ae1c28" b="#ffffff" c="#21468b" />,
  Hungria: () => <HStripes a="#cd2a3e" b="#ffffff" c="#436f4d" />,
  Inglaterra: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <rect x="25" y="0" width="10" height="40" fill="#ce1124" />
      <rect x="0" y="15" width="60" height="10" fill="#ce1124" />
    </FlagSvg>
  ),
  Itália: () => <VStripes a="#009246" b="#ffffff" c="#ce2b37" />,
  Japão: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <circle cx="30" cy="20" r="11" fill="#bc002d" />
    </FlagSvg>
  ),
  Marrocos: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#c1272d" />
      <polygon
        points="30,12 32.4,19.2 40,19.2 33.8,23.6 36.2,30.8 30,26.4 23.8,30.8 26.2,23.6 20,19.2 27.6,19.2"
        fill="none"
        stroke="#006233"
        strokeWidth={1.6}
      />
    </FlagSvg>
  ),
  México: () => <VStripes a="#006847" b="#ffffff" c="#ce1126" />,
  Nigéria: () => <VStripes a="#008751" b="#ffffff" c="#008751" />,
  Portugal: () => (
    <FlagSvg>
      <rect width="24" height="40" x="0" fill="#006600" />
      <rect width="36" height="40" x="24" fill="#ff0000" />
      <circle
        cx="24"
        cy="20"
        r="5"
        fill="#ffe600"
        stroke="#000"
        strokeWidth={0.4}
      />
    </FlagSvg>
  ),
  Senegal: () => <VStripes a="#00853f" b="#fdef42" c="#e31b23" />,
  Suécia: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#006aa7" />
      <rect x="18" y="0" width="6" height="40" fill="#fecc00" />
      <rect x="0" y="17" width="60" height="6" fill="#fecc00" />
    </FlagSvg>
  ),
  Uruguai: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <g fill="#0038a8">
        <rect y={4.5} width="60" height={4.5} />
        <rect y={13.5} width="60" height={4.5} />
        <rect y={22.5} width="60" height={4.5} />
        <rect y={31.5} width="60" height={4.5} />
      </g>
      <rect x="0" y="0" width="24" height="18" fill="#ffffff" />
      <circle
        cx="12"
        cy="9"
        r="4"
        fill="#fcd116"
        stroke="#000"
        strokeWidth={0.3}
      />
    </FlagSvg>
  ),
};

export function Flag({ name }: { name: string }): ReactElement | null {
  const builder = FLAGS[name];
  return builder ? builder() : null;
}

export function hasFlag(name: string): boolean {
  return name in FLAGS;
}
