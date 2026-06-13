// Country flags (SVG) and team color palettes used by the live match
// presentation (scoreboard badge, crowd stands). Lookup is by team name in
// Portuguese.

export interface TeamPalette {
  flag: string; // unicode emoji (kept for fallbacks)
  flagSvg: string; // inline SVG markup, "" when not available
  primary: string;
  secondary: string;
}

const hStripes = (a: string, b: string, c: string) =>
  `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="13.34" y="0" fill="${a}"/>
    <rect width="60" height="13.34" y="13.33" fill="${b}"/>
    <rect width="60" height="13.34" y="26.66" fill="${c}"/>
  </svg>`;

const vStripes = (a: string, b: string, c: string) =>
  `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="40" x="0" fill="${a}"/>
    <rect width="20" height="40" x="20" fill="${b}"/>
    <rect width="20" height="40" x="40" fill="${c}"/>
  </svg>`;

const FLAGS: Record<string, string> = {
  Brasil: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#009b3a"/>
    <polygon points="30,4 55,20 30,36 5,20" fill="#fedf00"/>
    <circle cx="30" cy="20" r="7.5" fill="#002776"/>
  </svg>`,
  "Brasil 1970": `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#009b3a"/>
    <polygon points="30,4 55,20 30,36 5,20" fill="#fedf00"/>
    <circle cx="30" cy="20" r="7.5" fill="#002776"/>
  </svg>`,
  Alemanha: hStripes("#000000", "#dd0000", "#ffce00"),
  Argentina: hStripes("#74acdf", "#ffffff", "#74acdf"),
  "Arábia Saudita": `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#006c35"/>
    <rect x="8" y="13" width="44" height="2" fill="#ffffff"/>
    <rect x="14" y="22" width="32" height="3" fill="#ffffff"/>
  </svg>`,
  Bélgica: vStripes("#000000", "#fdda24", "#ef3340"),
  Colômbia: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="20" y="0" fill="#fcd116"/>
    <rect width="60" height="10" y="20" fill="#003893"/>
    <rect width="60" height="10" y="30" fill="#ce1126"/>
  </svg>`,
  "Coreia do Sul": `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ffffff"/>
    <circle cx="30" cy="20" r="9" fill="#cd2e3a"/>
    <path d="M30 11 a9 9 0 0 1 0 18 a4.5 4.5 0 0 1 0 -9 a4.5 4.5 0 0 0 0 -9z" fill="#0047a0"/>
  </svg>`,
  "Costa Rica": `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="8" y="0" fill="#002b7f"/>
    <rect width="60" height="6" y="8" fill="#ffffff"/>
    <rect width="60" height="12" y="14" fill="#ce1126"/>
    <rect width="60" height="6" y="26" fill="#ffffff"/>
    <rect width="60" height="8" y="32" fill="#002b7f"/>
  </svg>`,
  Croácia: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="13.34" y="0" fill="#d8262a"/>
    <rect width="60" height="13.34" y="13.33" fill="#ffffff"/>
    <rect width="60" height="13.34" y="26.66" fill="#171796"/>
    <g fill="#d8262a">
      <rect x="24" y="14" width="3" height="3"/><rect x="30" y="14" width="3" height="3"/><rect x="36" y="14" width="3" height="3"/>
      <rect x="27" y="17" width="3" height="3"/><rect x="33" y="17" width="3" height="3"/>
      <rect x="24" y="20" width="3" height="3"/><rect x="30" y="20" width="3" height="3"/><rect x="36" y="20" width="3" height="3"/>
    </g>
  </svg>`,
  Espanha: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="10" y="0" fill="#aa151b"/>
    <rect width="60" height="20" y="10" fill="#f1bf00"/>
    <rect width="60" height="10" y="30" fill="#aa151b"/>
  </svg>`,
  "Estados Unidos": `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ffffff"/>
    <g fill="#b22234">
      <rect y="0" width="60" height="3"/><rect y="6" width="60" height="3"/>
      <rect y="12" width="60" height="3"/><rect y="18" width="60" height="3"/>
      <rect y="24" width="60" height="3"/><rect y="30" width="60" height="3"/>
      <rect y="36" width="60" height="3"/>
    </g>
    <rect x="0" y="0" width="24" height="21" fill="#3c3b6e"/>
    <g fill="#ffffff">
      <circle cx="4" cy="4" r="0.9"/><circle cx="10" cy="4" r="0.9"/><circle cx="16" cy="4" r="0.9"/><circle cx="22" cy="4" r="0.9"/>
      <circle cx="7" cy="8" r="0.9"/><circle cx="13" cy="8" r="0.9"/><circle cx="19" cy="8" r="0.9"/>
      <circle cx="4" cy="12" r="0.9"/><circle cx="10" cy="12" r="0.9"/><circle cx="16" cy="12" r="0.9"/><circle cx="22" cy="12" r="0.9"/>
      <circle cx="7" cy="16" r="0.9"/><circle cx="13" cy="16" r="0.9"/><circle cx="19" cy="16" r="0.9"/>
    </g>
  </svg>`,
  França: vStripes("#0055a4", "#ffffff", "#ef4135"),
  Gana: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="13.34" y="0" fill="#ce1126"/>
    <rect width="60" height="13.34" y="13.33" fill="#fcd116"/>
    <rect width="60" height="13.34" y="26.66" fill="#006b3f"/>
    <polygon points="30,15 32,21 38,21 33,24 35,30 30,26 25,30 27,24 22,21 28,21" fill="#000000"/>
  </svg>`,
  Holanda: hStripes("#ae1c28", "#ffffff", "#21468b"),
  Hungria: hStripes("#cd2a3e", "#ffffff", "#436f4d"),
  Inglaterra: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ffffff"/>
    <rect x="25" y="0" width="10" height="40" fill="#ce1124"/>
    <rect x="0" y="15" width="60" height="10" fill="#ce1124"/>
  </svg>`,
  Itália: vStripes("#009246", "#ffffff", "#ce2b37"),
  Japão: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ffffff"/>
    <circle cx="30" cy="20" r="11" fill="#bc002d"/>
  </svg>`,
  Marrocos: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#c1272d"/>
    <polygon points="30,12 32.4,19.2 40,19.2 33.8,23.6 36.2,30.8 30,26.4 23.8,30.8 26.2,23.6 20,19.2 27.6,19.2" fill="none" stroke="#006233" stroke-width="1.6"/>
  </svg>`,
  México: vStripes("#006847", "#ffffff", "#ce1126"),
  Nigéria: vStripes("#008751", "#ffffff", "#008751"),
  Portugal: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="40" x="0" fill="#006600"/>
    <rect width="36" height="40" x="24" fill="#ff0000"/>
    <circle cx="24" cy="20" r="5" fill="#ffe600" stroke="#000" stroke-width="0.4"/>
  </svg>`,
  Senegal: vStripes("#00853f", "#fdef42", "#e31b23"),
  Suécia: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#006aa7"/>
    <rect x="18" y="0" width="6" height="40" fill="#fecc00"/>
    <rect x="0" y="17" width="60" height="6" fill="#fecc00"/>
  </svg>`,
  Uruguai: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ffffff"/>
    <g fill="#0038a8">
      <rect y="4.5" width="60" height="4.5"/><rect y="13.5" width="60" height="4.5"/>
      <rect y="22.5" width="60" height="4.5"/><rect y="31.5" width="60" height="4.5"/>
    </g>
    <rect x="0" y="0" width="24" height="18" fill="#ffffff"/>
    <circle cx="12" cy="9" r="4" fill="#fcd116" stroke="#000" stroke-width="0.3"/>
  </svg>`,
};

const COLORS: Record<string, { primary: string; secondary: string }> = {
  Alemanha: { primary: "#111111", secondary: "#dd0000" },
  Argentina: { primary: "#74acdf", secondary: "#ffffff" },
  "Arábia Saudita": { primary: "#006c35", secondary: "#ffffff" },
  Brasil: { primary: "#009b3a", secondary: "#fedf00" },
  "Brasil 1970": { primary: "#009b3a", secondary: "#fedf00" },
  Bélgica: { primary: "#111111", secondary: "#fdda24" },
  Colômbia: { primary: "#fcd116", secondary: "#003893" },
  "Coreia do Sul": { primary: "#cd2e3a", secondary: "#0047a0" },
  "Costa Rica": { primary: "#ce1126", secondary: "#002b7f" },
  Croácia: { primary: "#d8262a", secondary: "#171796" },
  Espanha: { primary: "#aa151b", secondary: "#f1bf00" },
  "Estados Unidos": { primary: "#b22234", secondary: "#3c3b6e" },
  França: { primary: "#0055a4", secondary: "#ef4135" },
  Gana: { primary: "#006b3f", secondary: "#fcd116" },
  Holanda: { primary: "#ff6c00", secondary: "#21468b" },
  Hungria: { primary: "#cd2a3e", secondary: "#436f4d" },
  Inglaterra: { primary: "#ffffff", secondary: "#ce1124" },
  Itália: { primary: "#009246", secondary: "#ce2b37" },
  Japão: { primary: "#bc002d", secondary: "#ffffff" },
  Marrocos: { primary: "#c1272d", secondary: "#006233" },
  México: { primary: "#006847", secondary: "#ce1126" },
  Nigéria: { primary: "#008751", secondary: "#ffffff" },
  Portugal: { primary: "#006600", secondary: "#ff0000" },
  Senegal: { primary: "#00853f", secondary: "#fdef42" },
  Suécia: { primary: "#006aa7", secondary: "#fecc00" },
  Uruguai: { primary: "#0038a8", secondary: "#ffffff" },
};

const FALLBACK: TeamPalette = {
  flag: "",
  flagSvg: "",
  primary: "#1fc77d",
  secondary: "#0f5132",
};

export function teamPalette(name: string | undefined | null): TeamPalette {
  if (!name) return FALLBACK;
  const colors = COLORS[name];
  const svg = FLAGS[name];
  if (!colors && !svg) return FALLBACK;
  return {
    flag: svg ?? "",
    flagSvg: svg ?? "",
    primary: colors?.primary ?? FALLBACK.primary,
    secondary: colors?.secondary ?? FALLBACK.secondary,
  };
}

export function isNationalTeam(name: string | undefined | null): boolean {
  if (!name) return false;
  return !!FLAGS[name];
}

