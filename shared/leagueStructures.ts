export type LeagueRegion = "south-america" | "europe";

export type LeagueCountry =
  | "brasil"
  | "argentina"
  | "inglaterra"
  | "espanha"
  | "italia"
  | "alemanha"
  | "franca"
  | "portugal";

export interface LeagueTeamRef {
  id: string;
  name: string;
  alias: string;
  playableTeamId?: string;
}

export interface LeagueDivision {
  id: string;
  name: string;
  alias: string;
  tier: number;
  promotionSlots: number;
  relegationSlots: number;
  calendarFormat: "double-round-robin" | "single-round-robin" | "custom";
  shortTournament?: boolean;
  continentalSlots?: Partial<Record<ContinentalCompetition, number>>;
  teams: LeagueTeamRef[];
}

export interface LeagueStructure {
  id: string;
  country: LeagueCountry;
  region: LeagueRegion;
  name: string;
  alias: string;
  divisions: LeagueDivision[];
}

export type ContinentalCompetition =
  | "champions"
  | "europa"
  | "libertadores"
  | "sulamericana";

export interface LeagueFixture {
  round: number;
  leg: 1 | 2;
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
}

export interface PromotionRelegationPlan {
  promoted: Array<{ teamId: string; fromDivisionId: string; toDivisionId: string }>;
  relegated: Array<{ teamId: string; fromDivisionId: string; toDivisionId: string }>;
}

export interface ContinentalQualification {
  competition: ContinentalCompetition;
  teamIds: string[];
}

const t = (
  id: string,
  name: string,
  alias: string,
  playableTeamId?: string,
): LeagueTeamRef => ({
  id,
  name,
  alias,
  playableTeamId,
});

export const LEAGUE_STRUCTURES: LeagueStructure[] = [
  {
    id: "brasil",
    country: "brasil",
    region: "south-america",
    name: "Liga Brasileira",
    alias: "Liga Nacional do Brasil",
    divisions: [
      {
        id: "brasil-serie-a",
        name: "Série A",
        alias: "Primeira Divisão Brasileira",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 4,
        calendarFormat: "double-round-robin",
        continentalSlots: { libertadores: 6, sulamericana: 6 },
        teams: [
          t("flamengo", "Flamengo", "Rubro-Negro Carioca", "flamengo"),
          t("palmeiras", "Palmeiras", "Verdão Paulista", "palmeiras"),
          t("botafogo", "Botafogo", "Estrela Solitária do Rio", "botafogo"),
          t("fluminense", "Fluminense", "Tricolor das Laranjeiras", "fluminense"),
          t("corinthians", "Corinthians", "Alvinegro Paulista", "corinthians"),
          t("sao-paulo", "São Paulo", "Tricolor do Morumbi", "sao-paulo"),
          t("internacional", "Internacional", "Colorado Gaúcho", "internacional"),
          t("atletico-mg", "Atlético-MG", "Galo Mineiro", "atletico-mg"),
          t("cruzeiro", "Cruzeiro", "Raposa Mineira", "cruzeiro"),
          t("gremio", "Grêmio", "Imortal Tricolor", "gremio"),
          t("bahia", "Bahia", "Esquadrão de Aço", "bahia"),
          t("vasco", "Vasco", "Cruzmaltino Carioca", "vasco"),
          t("fortaleza", "Fortaleza", "Leão do Pici", "fortaleza"),
          t("juventude", "Juventude", "Papo Verde da Serra", "juventude"),
          t("bragantino", "Red Bull Bragantino", "Massa Bruta de Bragança", "bragantino"),
          t("mirassol", "Mirassol", "Leão do Interior Paulista", "mirassol"),
          t("ceara", "Ceará", "Vovô do Nordeste", "ceara"),
          t("sport", "Sport Recife", "Leão da Ilha do Retiro", "sport"),
          t("santos", "Santos", "Peixe do Litoral Paulista", "santos"),
          t("vitoria", "Vitória", "Leão da Barra", "vitoria"),
        ],
      },
      {
        id: "brasil-serie-b",
        name: "Série B",
        alias: "Segunda Divisão Brasileira",
        tier: 2,
        promotionSlots: 4,
        relegationSlots: 4,
        calendarFormat: "double-round-robin",
        teams: [
          t("athletico-pr", "Athletico-PR", "Furacão da Baixada"),
          t("coritiba", "Coritiba", "Coxa Branca"),
          t("goias", "Goiás", "Esmeraldino do Cerrado"),
          t("avai", "Avaí", "Leão da Ilha de Florianópolis"),
          t("chapecoense", "Chapecoense", "Verde do Oeste Catarinense"),
          t("crb", "CRB", "Galo da Praia"),
          t("novorizontino", "Novorizontino", "Tigre do Vale"),
          t("operario-pr", "Operário-PR", "Fantasma de Ponta Grossa"),
          t("ponte-preta", "Ponte Preta", "Macaca Campineira"),
          t("vila-nova", "Vila Nova", "Tigre Goiano"),
          t("america-mg", "América-MG", "Coelho Mineiro"),
          t("amazonas", "Amazonas", "Onça de Manaus"),
          t("botafogo-sp", "Botafogo-SP", "Pantera de Ribeirão"),
          t("paysandu", "Paysandu", "Bicolor de Belém"),
          t("remo", "Remo", "Azulino de Belém"),
          t("ferroviaria", "Ferroviária", "Locomotiva de Araraquara"),
          t("atletico-go", "Atlético-GO", "Dragão Goiano"),
          t("cuiaba", "Cuiabá", "Dourado Mato-Grossense"),
          t("volta-redonda", "Volta Redonda", "Aço do Sul Fluminense"),
          t("athletic-club", "Athletic Club", "Esquadrão de São João"),
        ],
      },
    ],
  },
  {
    id: "argentina",
    country: "argentina",
    region: "south-america",
    name: "Liga Argentina",
    alias: "Liga Nacional Argentina",
    divisions: [
      {
        id: "argentina-primera",
        name: "Primera División",
        alias: "Primeira Divisão Argentina",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 2,
        calendarFormat: "double-round-robin",
        continentalSlots: { libertadores: 5, sulamericana: 6 },
        teams: [
          t("boca-juniors", "Boca Juniors", "Azul e Ouro de Buenos Aires", "boca-2000"),
          t("river-plate", "River Plate", "Faixa Vermelha de Núñez"),
          t("racing", "Racing Club", "Academia de Avellaneda"),
          t("independiente", "Independiente", "Rei de Copas de Avellaneda"),
          t("san-lorenzo", "San Lorenzo", "Ciclón de Boedo"),
          t("estudiantes", "Estudiantes", "Pincha de La Plata"),
          t("velez", "Vélez Sarsfield", "Fortín de Liniers"),
          t("lanus", "Lanús", "Granate do Sul"),
          t("rosario-central", "Rosario Central", "Canalha de Rosario"),
          t("newells", "Newell's Old Boys", "Leprosos de Rosario"),
          t("argentinos-juniors", "Argentinos Juniors", "Bicho de La Paternal"),
          t("huracan", "Huracán", "Globo de Parque Patricios"),
          t("gimnasia-lp", "Gimnasia La Plata", "Lobo Platense"),
          t("talleres", "Talleres", "T de Córdoba"),
          t("belgrano", "Belgrano", "Pirata Cordobês"),
          t("instituto", "Instituto", "Gloria de Córdoba"),
          t("colon", "Colón", "Sabalero de Santa Fe"),
          t("union", "Unión", "Tatengue de Santa Fe"),
          t("banfield", "Banfield", "Taladro do Sul"),
          t("defensa", "Defensa y Justicia", "Falcão de Varela"),
          t("tigre", "Tigre", "Matador de Victoria"),
          t("platense", "Platense", "Calamar de Vicente López"),
          t("sarmiento", "Sarmiento", "Verde de Junín"),
          t("godoy-cruz", "Godoy Cruz", "Tomba de Mendoza"),
          t("atl-tucuman", "Atlético Tucumán", "Decano Tucumano"),
          t("central-cordoba", "Central Córdoba", "Ferroviário de Santiago"),
          t("barracas-central", "Barracas Central", "Guapo de Barracas"),
          t("riestra", "Deportivo Riestra", "Malevo do Bajo Flores"),
        ],
      },
    ],
  },
  {
    id: "inglaterra",
    country: "inglaterra",
    region: "europe",
    name: "Liga Inglesa",
    alias: "Liga da Pirâmide Inglesa",
    divisions: [
      {
        id: "inglaterra-premier",
        name: "Premier League",
        alias: "Primeira Divisão Inglesa",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 4, europa: 2 },
        teams: [
          t("man-city", "Manchester City", "Azul-Celeste de Manchester", "man-city"),
          t("liverpool", "Liverpool", "Vermelho de Merseyside", "liverpool"),
          t("arsenal", "Arsenal", "Vermelho do Norte de Londres", "arsenal"),
          t("man-united", "Manchester United", "Vermelho de Manchester", "man-united"),
          t("chelsea", "Chelsea", "Azul do Oeste de Londres", "chelsea"),
          t("aston-villa", "Aston Villa", "Grená e Azul de Birmingham", "aston-villa"),
          t("tottenham", "Tottenham Hotspur", "Branco do Norte de Londres", "tottenham"),
          t("newcastle", "Newcastle United", "Alvinegro do Tyne", "newcastle"),
          t("west-ham", "West Ham United", "Martelos do Leste de Londres", "west-ham"),
          t("brighton", "Brighton", "Gaivotas do Sul", "brighton"),
          t("crystal-palace", "Crystal Palace", "Águias de Selhurst", "crystal-palace"),
          t("everton", "Everton", "Azul de Liverpool", "everton"),
          t("fulham", "Fulham", "Branco do Tâmisa", "fulham"),
          t("brentford", "Brentford", "Abelhas de Londres", "brentford"),
          t("wolves", "Wolverhampton", "Lobos Dourados", "wolves"),
          t("bournemouth", "Bournemouth", "Cerejas do Sul", "bournemouth"),
          t("nottingham-forest", "Nottingham Forest", "Vermelho da Floresta", "nottingham-forest"),
          t("leicester", "Leicester City", "Raposas de Midlands", "leicester"),
          t("leeds", "Leeds United", "Brancos de Yorkshire", "leeds"),
          t("southampton", "Southampton", "Santos da Costa Sul", "southampton"),
        ],
      },
      {
        id: "inglaterra-championship",
        name: "Championship",
        alias: "Segunda Divisão Inglesa",
        tier: 2,
        promotionSlots: 3,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        teams: [
          t("burnley", "Burnley", "Claret de Lancashire"),
          t("sheffield-united", "Sheffield United", "Lâminas de Sheffield"),
          t("norwich", "Norwich City", "Canários de Norfolk"),
          t("watford", "Watford", "Amarelo de Hertfordshire"),
          t("west-brom", "West Bromwich Albion", "Albion de West Bromwich"),
          t("middlesbrough", "Middlesbrough", "Boro do Teesside"),
          t("sunderland", "Sunderland", "Gatos Pretos do Wear"),
          t("coventry", "Coventry City", "Azuis do Midlands"),
          t("millwall", "Millwall", "Leões do Sul de Londres"),
          t("qpr", "Queens Park Rangers", "Aros de Loftus Road"),
          t("blackburn", "Blackburn Rovers", "Azul e Branco de Lancashire"),
          t("preston", "Preston North End", "Lírios de Deepdale"),
          t("stoke", "Stoke City", "Ceramistas de Staffordshire"),
          t("swansea", "Swansea City", "Cisnes do País de Gales"),
          t("cardiff", "Cardiff City", "Azuis de Cardiff"),
          t("bristol-city", "Bristol City", "Rubro de Bristol"),
          t("hull", "Hull City", "Tigres de Hull"),
          t("portsmouth", "Portsmouth", "Azul de Fratton"),
          t("derby", "Derby County", "Carneiros de Derby"),
          t("oxford-united", "Oxford United", "Amarelo de Oxford"),
          t("plymouth", "Plymouth Argyle", "Verde de Plymouth"),
          t("luton", "Luton Town", "Chapeleiros de Luton"),
          t("sheffield-wednesday", "Sheffield Wednesday", "Corujas de Sheffield"),
          t("blackpool", "Blackpool", "Tangerinas do Mar"),
        ],
      },
    ],
  },
  {
    id: "espanha",
    country: "espanha",
    region: "europe",
    name: "Liga Espanhola",
    alias: "Liga Nacional da Espanha",
    divisions: [
      {
        id: "espanha-la-liga",
        name: "La Liga",
        alias: "Primeira Divisão Espanhola",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 4, europa: 2 },
        teams: [
          t("real-madrid", "Real Madrid", "Branco de Madri", "real-madrid"),
          t("barcelona", "Barcelona", "Azul-Grená de Barcelona", "barcelona"),
          t("atletico-madrid", "Atlético de Madrid", "Vermelho e Branco de Madri", "atletico-madrid"),
          t("girona", "Girona", "Vermelho e Branco da Catalunha", "girona"),
          t("athletic-bilbao", "Athletic Bilbao", "Leões de Bilbao", "athletic-bilbao"),
          t("real-sociedad", "Real Sociedad", "Txuri-Urdin de San Sebastián", "real-sociedad"),
          t("real-betis", "Real Betis", "Verde e Branco de Sevilha", "real-betis"),
          t("sevilla", "Sevilla", "Branco e Vermelho de Sevilha", "sevilla"),
          t("valencia", "Valencia", "Morcegos de Mestalla", "valencia"),
          t("villarreal", "Villarreal", "Submarino Amarelo", "villarreal"),
          t("osasuna", "Osasuna", "Vermelho de Pamplona", "osasuna"),
          t("celta", "Celta de Vigo", "Celeste da Galícia", "celta"),
          t("mallorca", "Mallorca", "Vermelho das Ilhas Baleares", "mallorca"),
          t("getafe", "Getafe", "Azul do Sul de Madri", "getafe"),
          t("rayo", "Rayo Vallecano", "Faixa de Vallecas"),
          t("espanyol", "Espanyol", "Azul e Branco de Cornellà"),
          t("leganes", "Leganés", "Pepineros de Leganés"),
          t("valladolid", "Valladolid", "Violeta de Castela"),
          t("las-palmas", "Las Palmas", "Amarelo das Canárias"),
          t("alaves", "Alavés", "Azul e Branco de Vitória"),
        ],
      },
      {
        id: "espanha-segunda",
        name: "Segunda División",
        alias: "Segunda Divisão Espanhola",
        tier: 2,
        promotionSlots: 3,
        relegationSlots: 4,
        calendarFormat: "double-round-robin",
        teams: [
          t("levante", "Levante", "Granota de Valência"),
          t("eibar", "Eibar", "Armeiros de Ipurua"),
          t("granada", "Granada", "Nazarí de Andaluzia"),
          t("cadiz", "Cádiz", "Amarelo de Cádis"),
          t("elche", "Elche", "Franjiverde de Elche"),
          t("zaragoza", "Real Zaragoza", "Leão de Aragão"),
          t("oviedo", "Real Oviedo", "Azul de Astúrias"),
          t("sporting-gijon", "Sporting Gijón", "Rojiblanco de Gijón"),
          t("racing-santander", "Racing Santander", "Verde de Cantábria"),
          t("tenerife", "Tenerife", "Branco e Azul das Canárias"),
          t("malaga", "Málaga", "Boquerón Andaluz"),
          t("deportivo", "Deportivo La Coruña", "Turco da Galícia"),
          t("albacete", "Albacete", "Queijo Mecânico de La Mancha"),
          t("burgos", "Burgos", "Branco de Castela"),
          t("cartagena", "Cartagena", "Efesé de Múrcia"),
          t("castellon", "Castellón", "Alvinegro de Castália"),
          t("cordoba", "Córdoba", "Califa de Andaluzia"),
          t("huesca", "Huesca", "Azulgrana Aragonês"),
          t("mirandes", "Mirandés", "Jabato de Miranda"),
          t("numancia", "Numancia", "Vermelho de Sória"),
          t("almeria", "Almería", "Rubro de Andaluzia"),
          t("eldense", "Eldense", "Azulgrana de Elda"),
        ],
      },
    ],
  },
  {
    id: "italia",
    country: "italia",
    region: "europe",
    name: "Liga Italiana",
    alias: "Liga Nacional da Itália",
    divisions: [
      {
        id: "italia-serie-a",
        name: "Serie A",
        alias: "Primeira Divisão Italiana",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 4, europa: 2 },
        teams: [
          t("inter", "Inter de Milão", "Azul e Preto de Milão", "inter"),
          t("milan", "AC Milan", "Vermelho e Preto de Milão", "milan"),
          t("juventus", "Juventus", "Preto e Branco de Turim", "juventus"),
          t("atalanta", "Atalanta", "Azul e Preto de Bérgamo", "atalanta"),
          t("bologna", "Bologna", "Vermelho e Azul de Bolonha", "bologna"),
          t("roma", "Roma", "Giallorosso da Capital", "roma"),
          t("lazio", "Lazio", "Celeste da Capital", "lazio"),
          t("napoli", "Napoli", "Azul do Vesúvio", "napoli"),
          t("fiorentina", "Fiorentina", "Violeta de Florença", "fiorentina"),
          t("torino", "Torino", "Granata de Turim", "torino"),
          t("genoa", "Genoa", "Grifone da Ligúria"),
          t("sampdoria", "Sampdoria", "Blucerchiati de Gênova"),
          t("udinese", "Udinese", "Zebrette de Friuli", "udinese"),
          t("sassuolo", "Sassuolo", "Neroverde da Emília"),
          t("verona", "Hellas Verona", "Gialloblù de Verona"),
          t("cagliari", "Cagliari", "Rossoblù da Sardenha"),
          t("parma", "Parma", "Cruzados de Parma"),
          t("empoli", "Empoli", "Azul da Toscana"),
          t("lecce", "Lecce", "Giallorosso do Salento"),
          t("venezia", "Venezia", "Lagunari de Veneza"),
        ],
      },
      {
        id: "italia-serie-b",
        name: "Serie B",
        alias: "Segunda Divisão Italiana",
        tier: 2,
        promotionSlots: 3,
        relegationSlots: 4,
        calendarFormat: "double-round-robin",
        teams: [
          t("palermo", "Palermo", "Rosanero da Sicília"),
          t("bari", "Bari", "Galletti da Apúlia"),
          t("brescia", "Brescia", "Andorinhas da Lombardia"),
          t("cesena", "Cesena", "Cavalo-Marinho da Romanha"),
          t("cremonese", "Cremonese", "Grigiorossi de Cremona"),
          t("frosinone", "Frosinone", "Canarini do Lácio"),
          t("modena", "Modena", "Canários da Emília"),
          t("pisa", "Pisa", "Nerazzurri da Toscana"),
          t("reggiana", "Reggiana", "Granata de Reggio"),
          t("salernitana", "Salernitana", "Granata de Salerno"),
          t("spezia", "Spezia", "Aquilotti da Ligúria"),
          t("sudtirol", "Südtirol", "Biancorossi do Alto Ádige"),
          t("catanzaro", "Catanzaro", "Águias da Calábria"),
          t("cittadella", "Cittadella", "Granata do Vêneto"),
          t("cosenza", "Cosenza", "Lobos da Calábria"),
          t("mantova", "Mantova", "Virgiliani da Lombardia"),
          t("carrarese", "Carrarese", "Azzurri de Carrara"),
          t("juve-stabia", "Juve Stabia", "Vespas da Campânia"),
          t("sampdoria-b", "Sampdoria B", "Reserva Blucerchiata"),
          t("ternana", "Ternana", "Fere da Úmbria"),
        ],
      },
    ],
  },
  {
    id: "alemanha",
    country: "alemanha",
    region: "europe",
    name: "Liga Alemã",
    alias: "Liga Nacional da Alemanha",
    divisions: [
      {
        id: "alemanha-bundesliga",
        name: "Bundesliga",
        alias: "Primeira Divisão Alemã",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 4, europa: 2 },
        teams: [
          t("bayern", "Bayern de Munique", "Vermelho da Baviera", "bayern"),
          t("dortmund", "Borussia Dortmund", "Amarelo e Preto de Dortmund", "dortmund"),
          t("leverkusen", "Bayer Leverkusen", "Vermelho e Preto de Leverkusen", "leverkusen"),
          t("leipzig", "RB Leipzig", "Vermelho e Branco da Saxônia", "leipzig"),
          t("stuttgart", "Stuttgart", "Branco e Vermelho da Suábia", "stuttgart"),
          t("eintracht", "Eintracht Frankfurt", "Águia de Frankfurt", "eintracht"),
          t("wolfsburg", "Wolfsburg", "Lobos da Baixa Saxônia", "wolfsburg"),
          t("monchengladbach", "Borussia Mönchengladbach", "Potro do Reno"),
          t("werder", "Werder Bremen", "Verde de Bremen"),
          t("freiburg", "Freiburg", "Breisgau-Brasileiros", "freiburg"),
          t("mainz", "Mainz 05", "Carnavalescos de Mainz", "mainz"),
          t("augsburg", "Augsburg", "Fuggerstädter da Baviera"),
          t("hoffenheim", "Hoffenheim", "Azul de Sinsheim", "hoffenheim"),
          t("union-berlin", "Union Berlin", "Ferro de Köpenick"),
          t("bochum", "Bochum", "Azul do Ruhr"),
          t("heidenheim", "Heidenheim", "Vermelho da Suábia"),
          t("koln", "Köln", "Bodes de Colônia"),
          t("hamburg", "Hamburger SV", "Dinossauro de Hamburgo"),
        ],
      },
      {
        id: "alemanha-2-bundesliga",
        name: "2. Bundesliga",
        alias: "Segunda Divisão Alemã",
        tier: 2,
        promotionSlots: 3,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        teams: [
          t("schalke", "Schalke 04", "Azul Real de Gelsenkirchen"),
          t("hertha", "Hertha Berlin", "Velha Senhora de Berlim"),
          t("hannover", "Hannover 96", "Vermelho da Baixa Saxônia"),
          t("nurnberg", "Nürnberg", "Clube da Francônia"),
          t("kaiserslautern", "Kaiserslautern", "Diabos Vermelhos do Palatinado"),
          t("dusseldorf", "Fortuna Düsseldorf", "Fortuna do Reno"),
          t("karlsruher", "Karlsruher SC", "Azul de Baden"),
          t("st-pauli", "St. Pauli", "Marrom de Hamburgo"),
          t("paderborn", "Paderborn", "Azul do Leste Vestfaliano"),
          t("greuther-furth", "Greuther Fürth", "Trevo da Francônia"),
          t("magdeburg", "Magdeburg", "Azul do Elba"),
          t("darmstadt", "Darmstadt", "Lírios de Hesse"),
          t("braunschweig", "Eintracht Braunschweig", "Leão de Brunswick"),
          t("elversberg", "Elversberg", "Preto e Branco do Sarre"),
          t("regensburg", "Jahn Regensburg", "Vermelho de Regensburg"),
          t("ulm", "Ulm", "Pardais de Ulm"),
          t("munster", "Preußen Münster", "Águias de Münster"),
          t("wehen", "Wehen Wiesbaden", "Vermelho e Preto de Hesse"),
        ],
      },
    ],
  },
  {
    id: "franca",
    country: "franca",
    region: "europe",
    name: "Liga Francesa",
    alias: "Liga Nacional da França",
    divisions: [
      {
        id: "franca-ligue-1",
        name: "Ligue 1",
        alias: "Primeira Divisão Francesa",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 3, europa: 2 },
        teams: [
          t("psg", "Paris Saint-Germain", "Azul-Grená de Paris", "psg"),
          t("monaco", "AS Monaco", "Vermelho e Branco do Principado", "monaco"),
          t("lille", "Lille", "Vermelho e Branco do Norte Francês", "lille"),
          t("marseille", "Olympique Marseille", "Azul e Branco do Mediterrâneo", "marseille"),
          t("lyon", "Olympique Lyonnais", "Leão do Ródano", "lyon"),
          t("nice", "Nice", "Águia da Riviera", "nice"),
          t("lens", "Lens", "Sangue e Ouro do Norte", "lens"),
          t("rennes", "Rennes", "Vermelho da Bretanha", "rennes"),
          t("brest", "Brest", "Vermelho e Branco da Bretanha", "brest"),
          t("nantes", "Nantes", "Canários do Loire"),
          t("strasbourg", "Strasbourg", "Azul da Alsácia"),
          t("montpellier", "Montpellier", "Laranja do Hérault"),
          t("reims", "Reims", "Vermelho e Branco de Champagne"),
          t("toulouse", "Toulouse", "Violeta do Garona"),
          t("auxerre", "Auxerre", "Azul da Borgonha"),
          t("angers", "Angers", "Preto e Branco do Anjou"),
          t("saint-etienne", "Saint-Étienne", "Verde do Loire"),
          t("le-havre", "Le Havre", "Ciel e Marinho da Normandia"),
        ],
      },
      {
        id: "franca-ligue-2",
        name: "Ligue 2",
        alias: "Segunda Divisão Francesa",
        tier: 2,
        promotionSlots: 3,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        teams: [
          t("bordeaux", "Bordeaux", "Girondinos da Aquitânia"),
          t("metz", "Metz", "Grenats de Lorena"),
          t("lorient", "Lorient", "Merlus da Bretanha"),
          t("caen", "Caen", "Vermelho e Azul da Normandia"),
          t("paris-fc", "Paris FC", "Azul da Capital"),
          t("ajaccio", "Ajaccio", "Urso da Córsega"),
          t("bastia", "Bastia", "Azul da Córsega"),
          t("guingamp", "Guingamp", "Vermelho e Preto da Bretanha"),
          t("grenoble", "Grenoble", "Azul dos Alpes"),
          t("amiens", "Amiens", "Licorne da Picardia"),
          t("pau", "Pau", "Amarelo dos Pireneus"),
          t("rodez", "Rodez", "Sangue e Ouro de Aveyron"),
          t("troyes", "Troyes", "Azul de Champagne"),
          t("clermont", "Clermont", "Vermelho de Auvergne"),
          t("dunkerque", "Dunkerque", "Marítimo do Norte"),
          t("annecy", "Annecy", "Vermelho dos Alpes"),
          t("lavallois", "Laval", "Tangue de Mayenne"),
          t("red-star", "Red Star", "Verde de Saint-Ouen"),
        ],
      },
    ],
  },
  {
    id: "portugal",
    country: "portugal",
    region: "europe",
    name: "Liga Portuguesa",
    alias: "Liga Nacional de Portugal",
    divisions: [
      {
        id: "portugal-primeira",
        name: "Primeira Liga",
        alias: "Primeira Divisão Portuguesa",
        tier: 1,
        promotionSlots: 0,
        relegationSlots: 3,
        calendarFormat: "double-round-robin",
        continentalSlots: { champions: 2, europa: 2 },
        teams: [
          t("benfica", "Benfica", "Vermelho de Lisboa", "benfica"),
          t("sporting", "Sporting CP", "Verde e Branco de Lisboa", "sporting"),
          t("porto", "Porto", "Dragão do Douro", "porto-2004"),
          t("braga", "Braga", "Arsenal do Minho", "braga"),
          t("vitoria-guimaraes", "Vitória Guimarães", "Conquistadores de Guimarães", "vitoria-guimaraes"),
          t("boavista", "Boavista", "Xadrez do Porto", "boavista"),
          t("famalicao", "Famalicão", "Azul e Branco do Minho"),
          t("rio-ave", "Rio Ave", "Verde e Branco de Vila do Conde"),
          t("moreirense", "Moreirense", "Cônegos de Moreira"),
          t("gil-vicente", "Gil Vicente", "Galos de Barcelos"),
          t("estoril", "Estoril Praia", "Canarinhos do Estoril"),
          t("casa-pia", "Casa Pia", "Gansos de Lisboa"),
          t("arouca", "Arouca", "Lobos de Arouca"),
          t("nacional-madeira", "Nacional", "Alvinegro da Madeira"),
          t("santa-clara", "Santa Clara", "Açorianos de Ponta Delgada"),
          t("farense", "Farense", "Leões de Faro"),
          t("estrela-amadora", "Estrela Amadora", "Tricolor da Amadora"),
          t("avs", "AVS", "Vermelho e Branco das Aves"),
        ],
      },
    ],
  },
];

export function getLeagueStructure(id: string): LeagueStructure | undefined {
  return LEAGUE_STRUCTURES.find((league) => league.id === id);
}

export function getLeagueDivision(id: string): LeagueDivision | undefined {
  for (const league of LEAGUE_STRUCTURES) {
    const division = league.divisions.find((d) => d.id === id);
    if (division) return division;
  }
  return undefined;
}

export function getLeagueTeam(id: string): LeagueTeamRef | undefined {
  for (const league of LEAGUE_STRUCTURES) {
    for (const division of league.divisions) {
      const team = division.teams.find((candidate) => candidate.id === id);
      if (team) return team;
    }
  }
  return undefined;
}

export function getCountryDivisions(country: LeagueCountry): LeagueDivision[] {
  return getLeagueStructure(country)?.divisions ?? [];
}

export function playableTeamIdsForDivision(divisionId: string): string[] {
  return getLeagueDivision(divisionId)?.teams.flatMap((team) =>
    team.playableTeamId ? [team.playableTeamId] : [],
  ) ?? [];
}

export function playableTeamIdsForLeague(leagueId: string): string[] {
  return getLeagueStructure(leagueId)?.divisions.flatMap((division) =>
    division.teams.flatMap((team) => team.playableTeamId ? [team.playableTeamId] : []),
  ) ?? [];
}

export function generateDoubleRoundRobinFixtures(
  teams: Array<{ id: string; name: string }>,
): LeagueFixture[] {
  if (teams.length < 2) return [];
  const hasBye = teams.length % 2 === 1;
  const list = hasBye ? [...teams, { id: "__bye", name: "Folga" }] : teams;
  const n = list.length;
  const cycle = n - 1;
  const firstLeg: LeagueFixture[] = [];

  for (let roundIndex = 0; roundIndex < cycle; roundIndex++) {
    const fixed = list[0];
    const rotating = list.slice(1);
    const rotated = [
      ...rotating.slice(cycle - roundIndex),
      ...rotating.slice(0, cycle - roundIndex),
    ];
    const ordered = [fixed, ...rotated];
    for (let i = 0; i < n / 2; i++) {
      const a = ordered[i];
      const b = ordered[n - 1 - i];
      if (a.id === "__bye" || b.id === "__bye") continue;
      const swap = (i === 0 ? roundIndex : i) % 2 === 1;
      const home = swap ? b : a;
      const away = home.id === a.id ? b : a;
      firstLeg.push({
        round: roundIndex + 1,
        leg: 1,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeName: home.name,
        awayName: away.name,
      });
    }
  }

  const secondLeg = firstLeg.map((fixture) => ({
    round: fixture.round + cycle,
    leg: 2 as const,
    homeTeamId: fixture.awayTeamId,
    awayTeamId: fixture.homeTeamId,
    homeName: fixture.awayName,
    awayName: fixture.homeName,
  }));

  return [...firstLeg, ...secondLeg];
}

export function fixturesForDivision(division: LeagueDivision): LeagueFixture[] {
  if (division.calendarFormat === "custom") return [];
  const teams = division.teams.map((team) => ({
    id: team.playableTeamId ?? team.id,
    name: team.alias,
  }));
  const fixtures = generateDoubleRoundRobinFixtures(teams);
  return division.calendarFormat === "single-round-robin"
    ? fixtures.filter((fixture) => fixture.leg === 1)
    : fixtures;
}

export function fixturesForDivisionRound(
  division: LeagueDivision,
  round: number,
): LeagueFixture[] {
  return fixturesForDivision(division).filter((fixture) => fixture.round === round);
}

export function promotionRelegationPlan(
  league: LeagueStructure,
  standingsByDivision: Record<string, string[]>,
): PromotionRelegationPlan {
  const divisions = [...league.divisions].sort((a, b) => a.tier - b.tier);
  const promoted: PromotionRelegationPlan["promoted"] = [];
  const relegated: PromotionRelegationPlan["relegated"] = [];

  for (let i = 0; i < divisions.length - 1; i++) {
    const upper = divisions[i];
    const lower = divisions[i + 1];
    const down = standingsByDivision[upper.id]?.slice(-upper.relegationSlots) ?? [];
    const up = standingsByDivision[lower.id]?.slice(0, lower.promotionSlots) ?? [];
    for (const teamId of down) {
      relegated.push({ teamId, fromDivisionId: upper.id, toDivisionId: lower.id });
    }
    for (const teamId of up) {
      promoted.push({ teamId, fromDivisionId: lower.id, toDivisionId: upper.id });
    }
  }

  return { promoted, relegated };
}

export function continentalQualifications(
  league: LeagueStructure,
  topDivisionTeamIds: string[],
): ContinentalQualification[] {
  const topDivision = league.divisions.find((division) => division.tier === 1);
  if (!topDivision?.continentalSlots) return [];
  let cursor = 0;
  return (Object.entries(topDivision.continentalSlots) as Array<[ContinentalCompetition, number]>)
    .map(([competition, slots]) => {
      const teamIds = topDivisionTeamIds.slice(cursor, cursor + slots);
      cursor += slots;
      return { competition, teamIds };
    })
    .filter((entry) => entry.teamIds.length > 0);
}
