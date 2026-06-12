import type { Team, Player, Position } from "../types.js";

// ---------------- Draft pool: iconic World Cup national teams (since the 1950s) ----------------
// You draft 11 legends from these. Ratings are estimates; legends rate high.
export const WC_DRAFT_TEAMS: Team[] = [
  {
    id: "wc-uruguai-1950", name: "Uruguai", season: "1950", league: "Copa do Mundo",
    players: [
      { name: "Máspoli", pos: "GK", rating: 82 },
      { name: "M. González", pos: "RB", rating: 79 },
      { name: "Varela", pos: "CB", rating: 86 },
      { name: "Tejera", pos: "CB", rating: 79 },
      { name: "Gambetta", pos: "LB", rating: 79 },
      { name: "Andrade", pos: "CDM", rating: 84 },
      { name: "Pérez", pos: "CM", rating: 80 },
      { name: "Schiaffino", pos: "CAM", rating: 88 },
      { name: "Ghiggia", pos: "RW", rating: 84 },
      { name: "Míguez", pos: "ST", rating: 82 },
      { name: "Morán", pos: "LW", rating: 79 },
    ],
  },
  {
    id: "wc-brasil-1958", name: "Brasil", season: "1958", league: "Copa do Mundo",
    players: [
      { name: "Gilmar", pos: "GK", rating: 86 },
      { name: "Djalma Santos", pos: "RB", rating: 86 },
      { name: "Bellini", pos: "CB", rating: 85 },
      { name: "Orlando", pos: "CB", rating: 84 },
      { name: "Nílton Santos", pos: "LB", rating: 88 },
      { name: "Zito", pos: "CDM", rating: 85 },
      { name: "Didi", pos: "CM", rating: 90 },
      { name: "Pelé", pos: "CAM", rating: 95 },
      { name: "Garrincha", pos: "RW", rating: 94 },
      { name: "Vavá", pos: "ST", rating: 87 },
      { name: "Zagallo", pos: "LW", rating: 85 },
    ],
  },
  {
    id: "wc-inglaterra-1966", name: "Inglaterra", season: "1966", league: "Copa do Mundo",
    players: [
      { name: "Banks", pos: "GK", rating: 88 },
      { name: "Cohen", pos: "RB", rating: 82 },
      { name: "Bobby Moore", pos: "CB", rating: 90 },
      { name: "Jack Charlton", pos: "CB", rating: 84 },
      { name: "Wilson", pos: "LB", rating: 82 },
      { name: "Stiles", pos: "CDM", rating: 82 },
      { name: "Bobby Charlton", pos: "CM", rating: 92 },
      { name: "Alan Ball", pos: "CM", rating: 84 },
      { name: "Peters", pos: "CAM", rating: 84 },
      { name: "Geoff Hurst", pos: "ST", rating: 86 },
      { name: "Hunt", pos: "ST", rating: 82 },
    ],
  },
  {
    id: "wc-holanda-1974", name: "Holanda", season: "1974", league: "Copa do Mundo",
    players: [
      { name: "Jongbloed", pos: "GK", rating: 79 },
      { name: "Suurbier", pos: "RB", rating: 82 },
      { name: "Rijsbergen", pos: "CB", rating: 81 },
      { name: "Haan", pos: "CB", rating: 85 },
      { name: "Krol", pos: "LB", rating: 87 },
      { name: "Jansen", pos: "CDM", rating: 84 },
      { name: "Neeskens", pos: "CM", rating: 88 },
      { name: "van Hanegem", pos: "CAM", rating: 86 },
      { name: "Cruyff", pos: "CAM", rating: 95 },
      { name: "Rep", pos: "RW", rating: 83 },
      { name: "Rensenbrink", pos: "LW", rating: 85 },
    ],
  },
  {
    id: "wc-alemanha-1974", name: "Alemanha", season: "1974", league: "Copa do Mundo",
    players: [
      { name: "Maier", pos: "GK", rating: 86 },
      { name: "Vogts", pos: "RB", rating: 86 },
      { name: "Beckenbauer", pos: "CB", rating: 94 },
      { name: "Schwarzenbeck", pos: "CB", rating: 83 },
      { name: "Breitner", pos: "LB", rating: 88 },
      { name: "Bonhof", pos: "CDM", rating: 85 },
      { name: "Hoeneß", pos: "CM", rating: 86 },
      { name: "Overath", pos: "CAM", rating: 87 },
      { name: "Grabowski", pos: "RW", rating: 84 },
      { name: "Gerd Müller", pos: "ST", rating: 93 },
      { name: "Hölzenbein", pos: "LW", rating: 83 },
    ],
  },
  {
    id: "wc-italia-1982", name: "Itália", season: "1982", league: "Copa do Mundo",
    players: [
      { name: "Zoff", pos: "GK", rating: 88 },
      { name: "Gentile", pos: "RB", rating: 85 },
      { name: "Scirea", pos: "CB", rating: 88 },
      { name: "Collovati", pos: "CB", rating: 82 },
      { name: "Cabrini", pos: "LB", rating: 85 },
      { name: "Oriali", pos: "CDM", rating: 83 },
      { name: "Tardelli", pos: "CM", rating: 85 },
      { name: "Antognoni", pos: "CAM", rating: 85 },
      { name: "Conti", pos: "RW", rating: 86 },
      { name: "Paolo Rossi", pos: "ST", rating: 89 },
      { name: "Graziani", pos: "LW", rating: 83 },
    ],
  },
  {
    id: "wc-brasil-1982", name: "Brasil", season: "1982", league: "Copa do Mundo",
    players: [
      { name: "Waldir Peres", pos: "GK", rating: 82 },
      { name: "Leandro", pos: "RB", rating: 86 },
      { name: "Oscar", pos: "CB", rating: 85 },
      { name: "Luizinho", pos: "CB", rating: 84 },
      { name: "Júnior", pos: "LB", rating: 87 },
      { name: "Toninho Cerezo", pos: "CDM", rating: 86 },
      { name: "Falcão", pos: "CM", rating: 90 },
      { name: "Sócrates", pos: "CAM", rating: 92 },
      { name: "Zico", pos: "CAM", rating: 93 },
      { name: "Serginho", pos: "ST", rating: 82 },
      { name: "Éder", pos: "LW", rating: 87 },
    ],
  },
  {
    id: "wc-argentina-1986", name: "Argentina", season: "1986", league: "Copa do Mundo",
    players: [
      { name: "Pumpido", pos: "GK", rating: 82 },
      { name: "Cuciuffo", pos: "RB", rating: 80 },
      { name: "Ruggeri", pos: "CB", rating: 85 },
      { name: "Brown", pos: "CB", rating: 83 },
      { name: "Olarticoechea", pos: "LB", rating: 82 },
      { name: "Giusti", pos: "CDM", rating: 84 },
      { name: "Batista", pos: "CM", rating: 83 },
      { name: "Burruchaga", pos: "CAM", rating: 86 },
      { name: "Maradona", pos: "CAM", rating: 97 },
      { name: "Valdano", pos: "ST", rating: 86 },
      { name: "Enrique", pos: "LW", rating: 83 },
    ],
  },
  {
    id: "wc-franca-1998", name: "França", season: "1998", league: "Copa do Mundo",
    players: [
      { name: "Barthez", pos: "GK", rating: 85 },
      { name: "Thuram", pos: "RB", rating: 88 },
      { name: "Blanc", pos: "CB", rating: 86 },
      { name: "Desailly", pos: "CB", rating: 88 },
      { name: "Lizarazu", pos: "LB", rating: 85 },
      { name: "Deschamps", pos: "CDM", rating: 84 },
      { name: "Petit", pos: "CM", rating: 84 },
      { name: "Zidane", pos: "CAM", rating: 96 },
      { name: "Karembeu", pos: "CM", rating: 81 },
      { name: "Djorkaeff", pos: "CAM", rating: 85 },
      { name: "Henry", pos: "ST", rating: 85 },
    ],
  },
  {
    id: "wc-brasil-2002", name: "Brasil", season: "2002", league: "Copa do Mundo",
    players: [
      { name: "Marcos", pos: "GK", rating: 86 },
      { name: "Cafu", pos: "RB", rating: 89 },
      { name: "Lúcio", pos: "CB", rating: 88 },
      { name: "Edmílson", pos: "CB", rating: 84 },
      { name: "Roberto Carlos", pos: "LB", rating: 90 },
      { name: "Gilberto Silva", pos: "CDM", rating: 85 },
      { name: "Kléberson", pos: "CM", rating: 82 },
      { name: "Ronaldinho", pos: "CAM", rating: 92 },
      { name: "Rivaldo", pos: "CAM", rating: 92 },
      { name: "Ronaldo", pos: "ST", rating: 95 },
      { name: "Denílson", pos: "LW", rating: 82 },
    ],
  },
  {
    id: "wc-italia-2006", name: "Itália", season: "2006", league: "Copa do Mundo",
    players: [
      { name: "Buffon", pos: "GK", rating: 92 },
      { name: "Zambrotta", pos: "RB", rating: 85 },
      { name: "Cannavaro", pos: "CB", rating: 91 },
      { name: "Materazzi", pos: "CB", rating: 83 },
      { name: "Grosso", pos: "LB", rating: 82 },
      { name: "Gattuso", pos: "CDM", rating: 84 },
      { name: "Pirlo", pos: "CM", rating: 90 },
      { name: "Perrotta", pos: "CM", rating: 82 },
      { name: "Totti", pos: "CAM", rating: 88 },
      { name: "Luca Toni", pos: "ST", rating: 84 },
      { name: "Del Piero", pos: "LW", rating: 86 },
    ],
  },
  {
    id: "wc-espanha-2010", name: "Espanha", season: "2010", league: "Copa do Mundo",
    players: [
      { name: "Casillas", pos: "GK", rating: 91 },
      { name: "Ramos", pos: "RB", rating: 88 },
      { name: "Piqué", pos: "CB", rating: 87 },
      { name: "Puyol", pos: "CB", rating: 87 },
      { name: "Capdevila", pos: "LB", rating: 81 },
      { name: "Busquets", pos: "CDM", rating: 85 },
      { name: "Xabi Alonso", pos: "CM", rating: 86 },
      { name: "Xavi", pos: "CM", rating: 92 },
      { name: "Iniesta", pos: "CAM", rating: 92 },
      { name: "Villa", pos: "ST", rating: 88 },
      { name: "Pedro", pos: "RW", rating: 82 },
    ],
  },
  {
    id: "wc-alemanha-2014", name: "Alemanha", season: "2014", league: "Copa do Mundo",
    players: [
      { name: "Neuer", pos: "GK", rating: 92 },
      { name: "Lahm", pos: "RB", rating: 88 },
      { name: "Boateng", pos: "CB", rating: 86 },
      { name: "Hummels", pos: "CB", rating: 87 },
      { name: "Höwedes", pos: "LB", rating: 82 },
      { name: "Khedira", pos: "CDM", rating: 84 },
      { name: "Schweinsteiger", pos: "CM", rating: 88 },
      { name: "Kroos", pos: "CM", rating: 89 },
      { name: "Müller", pos: "CAM", rating: 88 },
      { name: "Özil", pos: "CAM", rating: 87 },
      { name: "Klose", pos: "ST", rating: 85 },
    ],
  },
  {
    id: "wc-franca-2018", name: "França", season: "2018", league: "Copa do Mundo",
    players: [
      { name: "Lloris", pos: "GK", rating: 86 },
      { name: "Pavard", pos: "RB", rating: 82 },
      { name: "Varane", pos: "CB", rating: 87 },
      { name: "Umtiti", pos: "CB", rating: 84 },
      { name: "L. Hernández", pos: "LB", rating: 84 },
      { name: "Kanté", pos: "CDM", rating: 88 },
      { name: "Pogba", pos: "CM", rating: 87 },
      { name: "Matuidi", pos: "CM", rating: 83 },
      { name: "Mbappé", pos: "RW", rating: 90 },
      { name: "Griezmann", pos: "CAM", rating: 89 },
      { name: "Giroud", pos: "ST", rating: 83 },
    ],
  },
  {
    id: "wc-argentina-2022", name: "Argentina", season: "2022", league: "Copa do Mundo",
    players: [
      { name: "E. Martínez", pos: "GK", rating: 88 },
      { name: "Molina", pos: "RB", rating: 83 },
      { name: "Romero", pos: "CB", rating: 86 },
      { name: "Otamendi", pos: "CB", rating: 84 },
      { name: "Tagliafico", pos: "LB", rating: 83 },
      { name: "De Paul", pos: "CDM", rating: 85 },
      { name: "Enzo Fernández", pos: "CM", rating: 85 },
      { name: "Mac Allister", pos: "CM", rating: 85 },
      { name: "Messi", pos: "CAM", rating: 96 },
      { name: "Julián Álvarez", pos: "ST", rating: 85 },
      { name: "Di María", pos: "RW", rating: 86 },
    ],
  },
  {
    id: "wc-hungria-1954", name: "Hungria", season: "1954", league: "Copa do Mundo",
    players: [
      { name: "Grosics", pos: "GK", rating: 86 },
      { name: "Buzánszky", pos: "RB", rating: 82 },
      { name: "Lóránt", pos: "CB", rating: 84 },
      { name: "Lantos", pos: "LB", rating: 82 },
      { name: "Bozsik", pos: "CDM", rating: 91 },
      { name: "Zakariás", pos: "CM", rating: 83 },
      { name: "Hidegkuti", pos: "CAM", rating: 90 },
      { name: "Czibor", pos: "LW", rating: 88 },
      { name: "Kocsis", pos: "ST", rating: 91 },
      { name: "Puskás", pos: "CF", rating: 95 },
      { name: "Budai", pos: "RW", rating: 83 },
    ],
  },
  {
    id: "wc-brasil-1970", name: "Brasil", season: "1970", league: "Copa do Mundo",
    players: [
      { name: "Félix", pos: "GK", rating: 84 },
      { name: "Carlos Alberto", pos: "RB", rating: 91 },
      { name: "Brito", pos: "CB", rating: 86 },
      { name: "Piazza", pos: "CB", rating: 86 },
      { name: "Everaldo", pos: "LB", rating: 84 },
      { name: "Clodoaldo", pos: "CDM", rating: 88 },
      { name: "Gérson", pos: "CM", rating: 92 },
      { name: "Pelé", pos: "CAM", rating: 97 },
      { name: "Rivelino", pos: "LW", rating: 93 },
      { name: "Tostão", pos: "ST", rating: 91 },
      { name: "Jairzinho", pos: "RW", rating: 93 },
    ],
  },
  {
    id: "wc-alemanha-1990", name: "Alemanha", season: "1990", league: "Copa do Mundo",
    players: [
      { name: "Illgner", pos: "GK", rating: 85 },
      { name: "Berthold", pos: "RB", rating: 83 },
      { name: "Kohler", pos: "CB", rating: 87 },
      { name: "Augenthaler", pos: "CB", rating: 85 },
      { name: "Brehme", pos: "LB", rating: 88 },
      { name: "Buchwald", pos: "CDM", rating: 84 },
      { name: "Matthäus", pos: "CM", rating: 94 },
      { name: "Hässler", pos: "CAM", rating: 86 },
      { name: "Littbarski", pos: "RW", rating: 86 },
      { name: "Klinsmann", pos: "ST", rating: 88 },
      { name: "Völler", pos: "CF", rating: 86 },
    ],
  },
  {
    id: "wc-brasil-1994", name: "Brasil", season: "1994", league: "Copa do Mundo",
    players: [
      { name: "Taffarel", pos: "GK", rating: 86 },
      { name: "Jorginho", pos: "RB", rating: 84 },
      { name: "Aldair", pos: "CB", rating: 87 },
      { name: "Márcio Santos", pos: "CB", rating: 85 },
      { name: "Branco", pos: "LB", rating: 83 },
      { name: "Dunga", pos: "CDM", rating: 86 },
      { name: "Mauro Silva", pos: "CM", rating: 86 },
      { name: "Mazinho", pos: "CM", rating: 83 },
      { name: "Bebeto", pos: "CF", rating: 88 },
      { name: "Romário", pos: "ST", rating: 93 },
      { name: "Rai", pos: "CAM", rating: 85 },
    ],
  },
  {
    id: "wc-croacia-1998", name: "Croácia", season: "1998", league: "Copa do Mundo",
    players: [
      { name: "Ladić", pos: "GK", rating: 82 },
      { name: "Stanić", pos: "RB", rating: 81 },
      { name: "Štimac", pos: "CB", rating: 84 },
      { name: "Bilić", pos: "CB", rating: 83 },
      { name: "Jarni", pos: "LB", rating: 85 },
      { name: "Soldo", pos: "CDM", rating: 82 },
      { name: "Asanović", pos: "CM", rating: 84 },
      { name: "Prosinečki", pos: "CAM", rating: 86 },
      { name: "Boban", pos: "CAM", rating: 88 },
      { name: "Šuker", pos: "ST", rating: 89 },
      { name: "Vlaović", pos: "RW", rating: 81 },
    ],
  },
  {
    id: "wc-portugal-2006", name: "Portugal", season: "2006", league: "Copa do Mundo",
    players: [
      { name: "Ricardo", pos: "GK", rating: 83 },
      { name: "Miguel", pos: "RB", rating: 83 },
      { name: "Ricardo Carvalho", pos: "CB", rating: 88 },
      { name: "Fernando Meira", pos: "CB", rating: 82 },
      { name: "Nuno Valente", pos: "LB", rating: 80 },
      { name: "Costinha", pos: "CDM", rating: 83 },
      { name: "Maniche", pos: "CM", rating: 86 },
      { name: "Deco", pos: "CAM", rating: 90 },
      { name: "Figo", pos: "RW", rating: 89 },
      { name: "Pauleta", pos: "ST", rating: 84 },
      { name: "Cristiano Ronaldo", pos: "LW", rating: 88 },
    ],
  },
  {
    id: "wc-holanda-2010", name: "Holanda", season: "2010", league: "Copa do Mundo",
    players: [
      { name: "Stekelenburg", pos: "GK", rating: 84 },
      { name: "van der Wiel", pos: "RB", rating: 81 },
      { name: "Heitinga", pos: "CB", rating: 83 },
      { name: "Mathijsen", pos: "CB", rating: 82 },
      { name: "van Bronckhorst", pos: "LB", rating: 84 },
      { name: "van Bommel", pos: "CDM", rating: 84 },
      { name: "de Jong", pos: "CM", rating: 83 },
      { name: "Sneijder", pos: "CAM", rating: 91 },
      { name: "Robben", pos: "RW", rating: 91 },
      { name: "van Persie", pos: "ST", rating: 88 },
      { name: "Kuyt", pos: "LW", rating: 84 },
    ],
  },
  {
    id: "wc-belgica-2018", name: "Bélgica", season: "2018", league: "Copa do Mundo",
    players: [
      { name: "Courtois", pos: "GK", rating: 90 },
      { name: "Meunier", pos: "RB", rating: 83 },
      { name: "Alderweireld", pos: "CB", rating: 86 },
      { name: "Vertonghen", pos: "CB", rating: 86 },
      { name: "Chadli", pos: "LB", rating: 81 },
      { name: "Witsel", pos: "CDM", rating: 85 },
      { name: "De Bruyne", pos: "CM", rating: 92 },
      { name: "Fellaini", pos: "CM", rating: 82 },
      { name: "Hazard", pos: "LW", rating: 91 },
      { name: "Lukaku", pos: "ST", rating: 87 },
      { name: "Mertens", pos: "RW", rating: 86 },
    ],
  },
  {
    id: "wc-croacia-2018", name: "Croácia", season: "2018", league: "Copa do Mundo",
    players: [
      { name: "Subašić", pos: "GK", rating: 84 },
      { name: "Vrsaljko", pos: "RB", rating: 82 },
      { name: "Lovren", pos: "CB", rating: 83 },
      { name: "Vida", pos: "CB", rating: 82 },
      { name: "Strinić", pos: "LB", rating: 78 },
      { name: "Brozović", pos: "CDM", rating: 85 },
      { name: "Rakitić", pos: "CM", rating: 88 },
      { name: "Modrić", pos: "CM", rating: 93 },
      { name: "Perišić", pos: "LW", rating: 86 },
      { name: "Mandžukić", pos: "ST", rating: 86 },
      { name: "Rebić", pos: "RW", rating: 82 },
    ],
  },
  {
    id: "wc-marrocos-2022", name: "Marrocos", season: "2022", league: "Copa do Mundo",
    players: [
      { name: "Bono", pos: "GK", rating: 86 },
      { name: "Hakimi", pos: "RB", rating: 87 },
      { name: "Saïss", pos: "CB", rating: 82 },
      { name: "Aguerd", pos: "CB", rating: 82 },
      { name: "Mazraoui", pos: "LB", rating: 83 },
      { name: "Amrabat", pos: "CDM", rating: 85 },
      { name: "Ounahi", pos: "CM", rating: 82 },
      { name: "Amallah", pos: "CM", rating: 80 },
      { name: "Ziyech", pos: "RW", rating: 86 },
      { name: "En-Nesyri", pos: "ST", rating: 82 },
      { name: "Boufal", pos: "LW", rating: 81 },
    ],
  },
];

// ---------------- Final boss: a legendary side (Over 93+) ----------------
// Listed in 4-3-3 slot order (GK, RB, CB, CB, LB, CDM, CM, CAM, LW, ST, RW).
export const WC_BOSS: Team = {
  id: "wc-boss-brasil-1970", name: "Brasil 1970", season: "1970", league: "O Chefe Final",
  players: [
    { name: "Félix", pos: "GK", rating: 88 },
    { name: "Carlos Alberto", pos: "RB", rating: 94 },
    { name: "Brito", pos: "CB", rating: 89 },
    { name: "Piazza", pos: "CB", rating: 89 },
    { name: "Everaldo", pos: "LB", rating: 88 },
    { name: "Clodoaldo", pos: "CDM", rating: 91 },
    { name: "Gérson", pos: "CM", rating: 95 },
    { name: "Pelé", pos: "CAM", rating: 99 },
    { name: "Rivelino", pos: "LW", rating: 95 },
    { name: "Tostão", pos: "ST", rating: 94 },
    { name: "Jairzinho", pos: "RW", rating: 95 },
  ],
};

// ---------------- Opponent ladder (escalating difficulty) ----------------
export interface LadderRound {
  label: string;          // shown in the progress bar / pre-match
  overRange: [number, number];
  pool: string[];         // themed national-team names to draw from (for flavour)
}

// 8 matches: 3 group-stage fixtures, then Round of 32 through the final.
// The last one is the authored boss; the others are generated at the over band.
export const WC_LADDER: LadderRound[] = [
  { label: "Fase de Grupos — Jogo 1", overRange: [70, 76], pool: ["Arábia Saudita 1994", "Coreia do Sul 2002", "Costa Rica 2014", "Senegal 2002"] },
  { label: "Fase de Grupos — Jogo 2", overRange: [72, 78], pool: ["Camarões 1990", "Gana 2010", "Nigéria 1994", "Japão 2018"] },
  { label: "Fase de Grupos — Jogo 3", overRange: [74, 80], pool: ["México 1986", "Estados Unidos 2002", "Marrocos 2022", "Croácia 2018"] },
  { label: "16-avos de Final", overRange: [79, 83], pool: ["Bélgica 2018", "Suécia 1994", "Portugal 2006", "Colômbia 2014"] },
  { label: "Oitavas de Final", overRange: [82, 85], pool: ["Holanda 2010", "Inglaterra 1990", "Uruguai 2010", "França 2006"] },
  { label: "Quartas de Final", overRange: [86, 88], pool: ["Croácia 2018", "Espanha 2022", "Argentina 1998", "Brasil 1994"] },
  { label: "Semifinal", overRange: [89, 92], pool: ["Espanha 2010", "Alemanha 1990", "França 1998", "Argentina 2022"] },
  { label: "A Grande Final", overRange: [93, 96], pool: [WC_BOSS.name] },
];

const SURNAMES = [
  "Silva", "Pereira", "Costa", "Almeida", "Rocha", "Vidal", "Soto", "Ramírez", "Okafor",
  "Mensah", "Diallo", "Traoré", "Suzuki", "Tanaka", "Kim", "Park", "Hassan", "Ali",
  "Novak", "Petrov", "Larsson", "Hansen", "Müller", "Schmidt", "Rossi", "Bianchi",
  "Mendoza", "Castro", "Nunes", "Oliveira", "Kovač", "Marić", "Bakić",
];

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Positions in 4-3-3 slot order, matching getFormation("4-3-3").
const OPP_POS: Position[] = ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CAM", "LW", "ST", "RW"];

/** Build the opponent national team for a given round (0-based). Round 6 is the boss. */
export function wcOpponentTeam(round: number, rng: () => number): Team {
  const cfg = WC_LADDER[round];
  if (round >= WC_LADDER.length - 1) return WC_BOSS;
  const name = cfg.pool[Math.floor(rng() * cfg.pool.length)];
  const [lo, hi] = cfg.overRange;
  const names = shuffle(SURNAMES, rng);
  const players: Player[] = OPP_POS.map((pos, i) => ({
    name: names[i % names.length],
    pos,
    rating: lo + Math.floor(rng() * (hi - lo + 1)),
  }));
  return { id: `wc-opp-${round}`, name, season: "", league: cfg.label, players };
}
