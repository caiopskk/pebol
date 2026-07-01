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
  Bolívia: () => <HStripes a="#d52b1e" b="#f9e300" c="#007934" />,
  Canadá: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <rect x="0" y="0" width="15" height="40" fill="#ff0000" />
      <rect x="45" y="0" width="15" height="40" fill="#ff0000" />
      <polygon
        points="30,10 32,17 38,15 35,21 40,24 34,25 35,31 30,27.5 25,31 26,25 20,24 25,21 22,15 28,17"
        fill="#ff0000"
      />
    </FlagSvg>
  ),
  Catar: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#8d1b3d" />
      <rect width="18" height="40" fill="#ffffff" />
      <polygon
        points="18,0 24,0 18,5 24,10 18,15 24,20 18,20"
        fill="#8d1b3d"
      />
      <polygon
        points="18,20 24,20 18,25 24,30 18,35 24,40 18,40"
        fill="#8d1b3d"
      />
    </FlagSvg>
  ),
  China: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#de2910" />
      <g fill="#ffde00">
        <circle cx="10" cy="10" r="3.2" />
        <circle cx="21" cy="4" r="1.1" />
        <circle cx="24" cy="9.5" r="1.1" />
        <circle cx="23" cy="15.5" r="1.1" />
        <circle cx="18" cy="18.5" r="1.1" />
      </g>
    </FlagSvg>
  ),
  "El Salvador": () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#0047ab" />
      <rect width="60" height={13.34} y={13.33} fill="#ffffff" />
      <rect width="60" height={13.34} y={26.66} fill="#0047ab" />
      <circle
        cx="30"
        cy="20"
        r="4.5"
        fill="none"
        stroke="#0047ab"
        strokeWidth={0.6}
      />
    </FlagSvg>
  ),
  "Emirados Árabes Unidos": () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#00732f" />
      <rect width="60" height={13.34} y={13.33} fill="#ffffff" />
      <rect width="60" height={13.34} y={26.66} fill="#000000" />
      <rect x="0" y="0" width="14" height="40" fill="#ff0000" />
    </FlagSvg>
  ),
  Grécia: () => (
    <FlagSvg>
      <g fill="#0d5eaf">
        <rect y={0} width="60" height={4.44} />
        <rect y={8.88} width="60" height={4.44} />
        <rect y={17.76} width="60" height={4.44} />
        <rect y={26.64} width="60" height={4.44} />
        <rect y={35.52} width="60" height={4.44} />
      </g>
      <g fill="#ffffff">
        <rect y={4.44} width="60" height={4.44} />
        <rect y={13.32} width="60" height={4.44} />
        <rect y={22.2} width="60" height={4.44} />
        <rect y={31.08} width="60" height={4.44} />
      </g>
      <rect x="0" y="0" width="22.2" height="22.2" fill="#0d5eaf" />
      <rect x="8.5" y="0" width="5.2" height="22.2" fill="#ffffff" />
      <rect x="0" y="8.5" width="22.2" height="5.2" fill="#ffffff" />
    </FlagSvg>
  ),
  Haiti: () => (
    <FlagSvg>
      <rect width="60" height="20" y="0" fill="#00209f" />
      <rect width="60" height="20" y="20" fill="#d21034" />
      <rect x="24" y="14" width="12" height="12" fill="#ffffff" />
    </FlagSvg>
  ),
  Honduras: () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#0073cf" />
      <rect width="60" height={13.34} y={13.33} fill="#ffffff" />
      <rect width="60" height={13.34} y={26.66} fill="#0073cf" />
      <g fill="#0073cf">
        <circle cx="21" cy="17" r="1.4" />
        <circle cx="30" cy="15" r="1.4" />
        <circle cx="39" cy="17" r="1.4" />
        <circle cx="25" cy="23" r="1.4" />
        <circle cx="35" cy="23" r="1.4" />
      </g>
    </FlagSvg>
  ),
  "Nova Zelândia": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#00247d" />
      <rect x="0" y="0" width="24" height="16" fill="#00247d" />
      <rect x="0" y="6.5" width="24" height="3" fill="#ffffff" />
      <rect x="10.5" y="0" width="3" height="16" fill="#ffffff" />
      <rect x="0" y="7.5" width="24" height="1" fill="#cc142b" />
      <rect x="11.5" y="0" width="1" height="16" fill="#cc142b" />
      <g fill="#cc142b" stroke="#ffffff" strokeWidth={0.4}>
        <circle cx="42" cy="10" r="1.8" />
        <circle cx="50" cy="16" r="1.8" />
        <circle cx="46" cy="26" r="2.2" />
        <circle cx="37" cy="30" r="1.8" />
      </g>
    </FlagSvg>
  ),
  Togo: () => (
    <FlagSvg>
      <g fill="#006a4e">
        <rect y={0} width="60" height={8} />
        <rect y={16} width="60" height={8} />
        <rect y={32} width="60" height={8} />
      </g>
      <g fill="#ffce00">
        <rect y={8} width="60" height={8} />
        <rect y={24} width="60" height={8} />
      </g>
      <rect x="0" y="0" width="16" height="24" fill="#d21034" />
      <polygon
        points="8,7 9.3,10.8 13.3,10.8 10.2,13 11.4,17 8,14.6 4.6,17 5.8,13 2.7,10.8 6.7,10.8"
        fill="#ffffff"
      />
    </FlagSvg>
  ),
  "Trinidad e Tobago": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ce1126" />
      <polygon points="0,0 12,0 60,32 60,40 48,40 0,8" fill="#ffffff" />
      <polygon points="0,2.5 9,2.5 60,34.5 60,37.5 51,37.5 0,5.5" fill="#000000" />
    </FlagSvg>
  ),
  Zaire: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#009543" />
      <circle cx="24" cy="20" r="9" fill="#f7d618" />
      <rect x="21" y="16" width="3" height="9" fill="#3a2314" />
      <polygon points="24,13 26,17 22,17" fill="#ce1021" />
    </FlagSvg>
  ),
  "República da Coreia": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <circle cx="30" cy="20" r="9" fill="#cd2e3a" />
      <path
        d="M30 11 a9 9 0 0 1 0 18 a4.5 4.5 0 0 1 0 -9 a4.5 4.5 0 0 0 0 -9z"
        fill="#0047a0"
      />
    </FlagSvg>
  ),
  "Países Baixos": () => <HStripes a="#ae1c28" b="#ffffff" c="#21468b" />,
  "África do Sul": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <rect width="60" height={13.34} y={0} fill="#de3831" />
      <rect width="60" height={13.34} y={26.66} fill="#002395" />
      <polygon points="0,13.34 30,20 0,26.66" fill="#007a4d" />
      <polygon points="0,15.5 24,20 0,24.5" fill="#ffb81c" />
      <polygon points="0,0 18,20 0,40" fill="#000000" />
    </FlagSvg>
  ),
  Tchéquia: () => (
    <FlagSvg>
      <rect width="60" height="20" y="0" fill="#ffffff" />
      <rect width="60" height="20" y="20" fill="#d7141a" />
      <polygon points="0,0 30,20 0,40" fill="#11457e" />
    </FlagSvg>
  ),
  Suíça: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#d52b1e" />
      <rect x="24" y="10" width="12" height="20" fill="#ffffff" />
      <rect x="16" y="16" width="28" height="8" fill="#ffffff" />
    </FlagSvg>
  ),
  "Bósnia e Herzegovina": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#002395" />
      <polygon points="0,0 60,0 60,10 10,40 0,40" fill="#fecb00" />
      <g fill="#ffffff">
        <circle cx="52" cy="4" r="1.3" />
        <circle cx="44" cy="10" r="1.3" />
        <circle cx="36" cy="16" r="1.3" />
        <circle cx="28" cy="22" r="1.3" />
        <circle cx="20" cy="28" r="1.3" />
        <circle cx="12" cy="34" r="1.3" />
      </g>
    </FlagSvg>
  ),
  Escócia: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#0065bd" />
      <polygon points="0,0 6,0 60,36 60,40 54,40 0,4" fill="#ffffff" />
      <polygon points="54,0 60,0 60,4 6,40 0,40 0,36" fill="#ffffff" />
    </FlagSvg>
  ),
  Austrália: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#00247d" />
      <rect x="0" y="6.5" width="24" height="3" fill="#ffffff" />
      <rect x="10.5" y="0" width="3" height="16" fill="#ffffff" />
      <rect x="0" y="7.5" width="24" height="1" fill="#cc142b" />
      <rect x="11.5" y="0" width="1" height="16" fill="#cc142b" />
      <g fill="#ffffff">
        <circle cx="46" cy="10" r="3" />
        <circle cx="34" cy="26" r="1.6" />
        <circle cx="44" cy="30" r="1.6" />
        <circle cx="52" cy="24" r="1.6" />
        <circle cx="52" cy="34" r="1.6" />
      </g>
    </FlagSvg>
  ),
  Paraguai: () => <HStripes a="#d52b1e" b="#ffffff" c="#0038a8" />,
  Turquia: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#e30a17" />
      <circle cx="24" cy="20" r="9" fill="#ffffff" />
      <circle cx="27" cy="20" r="7.2" fill="#e30a17" />
      <polygon
        points="34,20 38.5,18.5 35.2,21.8 36.4,26.5 32.5,23.6 28.6,26.5 29.8,21.8 26.5,18.5 31,19.3"
        fill="#ffffff"
      />
    </FlagSvg>
  ),
  Equador: () => (
    <FlagSvg>
      <rect width="60" height="20" y="0" fill="#ffd100" />
      <rect width="60" height="10" y="20" fill="#0072ce" />
      <rect width="60" height="10" y="30" fill="#ef3340" />
    </FlagSvg>
  ),
  "Côte d'Ivoire": () => <VStripes a="#f77f00" b="#ffffff" c="#009e60" />,
  Curaçao: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#002b7f" />
      <rect x="0" y="26" width="60" height="4" fill="#f9e814" />
      <g fill="#ffffff">
        <polygon points="14,8 15,11 18,11 15.5,13 16.5,16 14,14 11.5,16 12.5,13 10,11 13,11" />
        <polygon points="22,14 22.7,16.2 25,16.2 23.2,17.6 23.9,19.8 22,18.4 20.1,19.8 20.8,17.6 19,16.2 21.3,16.2" />
      </g>
    </FlagSvg>
  ),
  Tunísia: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#e70013" />
      <circle cx="30" cy="20" r="9" fill="#ffffff" />
      <circle cx="32.5" cy="20" r="7" fill="#e70013" />
      <circle cx="29" cy="20" r="4.6" fill="#ffffff" />
      <polygon
        points="34,20 37.5,18.9 35.3,21.6 36.2,25.2 33.4,23 30.6,25.2 31.5,21.6 29.3,18.9 32.8,19.7"
        fill="#e70013"
      />
    </FlagSvg>
  ),
  Egito: () => <HStripes a="#ce1126" b="#ffffff" c="#000000" />,
  "República Islâmica do Irã": () => (
    <HStripes a="#239f40" b="#ffffff" c="#da0000" />
  ),
  "Cabo Verde": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#003893" />
      <rect x="0" y="21" width="60" height="2.4" fill="#ffffff" />
      <rect x="0" y="23.4" width="60" height="4.2" fill="#cf2027" />
      <rect x="0" y="27.6" width="60" height="2.4" fill="#ffffff" />
      <g fill="#f7d116">
        <circle cx="18" cy="12" r="1" />
        <circle cx="23" cy="9" r="1" />
        <circle cx="29" cy="8" r="1" />
        <circle cx="35" cy="9" r="1" />
        <circle cx="40" cy="12" r="1" />
        <circle cx="42" cy="17" r="1" />
        <circle cx="40" cy="22" r="1" />
        <circle cx="35" cy="24" r="1" />
        <circle cx="29" cy="25" r="1" />
        <circle cx="23" cy="24" r="1" />
      </g>
    </FlagSvg>
  ),
  Noruega: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ba0c2f" />
      <rect x="16" y="0" width="12" height="40" fill="#ffffff" />
      <rect x="0" y="14" width="60" height="12" fill="#ffffff" />
      <rect x="19" y="0" width="6" height="40" fill="#00205b" />
      <rect x="0" y="17" width="60" height="6" fill="#00205b" />
    </FlagSvg>
  ),
  Iraque: () => <HStripes a="#ce1126" b="#ffffff" c="#000000" />,
  Áustria: () => <HStripes a="#ed2939" b="#ffffff" c="#ed2939" />,
  Argélia: () => (
    <FlagSvg>
      <rect width="30" height="40" x="0" fill="#006233" />
      <rect width="30" height="40" x="30" fill="#ffffff" />
      <circle cx="33" cy="20" r="7.5" fill="none" stroke="#d21034" strokeWidth={1.6} />
      <circle cx="35.5" cy="20" r="6.2" fill="#ffffff" />
      <polygon
        points="40,20 43.2,19 41.1,21.5 41.9,24.8 39.3,22.8 36.7,24.8 37.5,21.5 35.4,19 38.6,19.8"
        fill="#d21034"
      />
    </FlagSvg>
  ),
  Jordânia: () => (
    <FlagSvg>
      <rect width="60" height={13.34} y={0} fill="#000000" />
      <rect width="60" height={13.34} y={13.33} fill="#ffffff" />
      <rect width="60" height={13.34} y={26.66} fill="#007a3d" />
      <polygon points="0,0 26,20 0,40" fill="#ce1126" />
      <polygon
        points="8,17 9.4,20.8 13.4,20.8 10.3,23 11.5,27 8,24.6 4.5,27 5.7,23 2.6,20.8 6.6,20.8"
        fill="#ffffff"
      />
    </FlagSvg>
  ),
  "República Democrática do Congo": () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#007fff" />
      <polygon points="0,32 0,40 8,40 60,10 60,2 52,2" fill="#f7d618" />
      <polygon points="0,34.5 0,40 4.5,40 60,7 60,4.5 55.5,4.5" fill="#ce1021" />
      <polygon
        points="14,7 15.2,10.6 19,10.6 15.9,12.9 17.1,16.5 14,14.2 10.9,16.5 12.1,12.9 9,10.6 12.8,10.6"
        fill="#f7d618"
      />
    </FlagSvg>
  ),
  Uzbequistão: () => (
    <FlagSvg>
      <rect width="60" height="40" fill="#ffffff" />
      <rect width="60" height="16" y="0" fill="#0099b5" />
      <rect width="60" height="1.6" y="16" fill="#ce1126" />
      <rect width="60" height="1.6" y="22.4" fill="#ce1126" />
      <rect width="60" height="16" y="24" fill="#1eb53a" />
      <circle cx="12" cy="8" r="4" fill="#ffffff" />
      <circle cx="13.6" cy="8" r="3.3" fill="#0099b5" />
      <g fill="#ffffff">
        <circle cx="22" cy="4" r="0.8" />
        <circle cx="26" cy="4" r="0.8" />
        <circle cx="30" cy="4" r="0.8" />
        <circle cx="22" cy="8" r="0.8" />
        <circle cx="26" cy="8" r="0.8" />
        <circle cx="30" cy="8" r="0.8" />
        <circle cx="22" cy="12" r="0.8" />
        <circle cx="26" cy="12" r="0.8" />
        <circle cx="30" cy="12" r="0.8" />
      </g>
    </FlagSvg>
  ),
  Panamá: () => (
    <FlagSvg>
      <rect width="30" height="20" x="0" y="0" fill="#ffffff" />
      <rect width="30" height="20" x="30" y="0" fill="#005293" />
      <rect width="30" height="20" x="0" y="20" fill="#da121a" />
      <rect width="30" height="20" x="30" y="20" fill="#ffffff" />
      <polygon
        points="15,5 16.2,8.6 20,8.6 16.9,10.9 18.1,14.5 15,12.2 11.9,14.5 13.1,10.9 10,8.6 13.8,8.6"
        fill="#005293"
      />
      <polygon
        points="45,25 46.2,28.6 50,28.6 46.9,30.9 48.1,34.5 45,32.2 41.9,34.5 43.1,30.9 40,28.6 43.8,28.6"
        fill="#da121a"
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
