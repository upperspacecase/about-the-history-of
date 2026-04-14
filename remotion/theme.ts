export const theme = {
  background: "#faf9f6",
  foreground: "#111111",
  accent: "#c0392b",
  muted: "#6b6b6b",
  border: "#e0ddd8",
  card: "#ffffff",
  highlight: "#fdf6ec",
  serif: 'Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const HEADLINES = [
  {
    title: "Supreme Court to Hear Challenge Over Tariff Powers",
    source: "BBC",
    category: "Politics",
    snippet:
      "Justices weigh whether executive branch can impose sweeping duties without Congressional approval, in case with far-reaching economic implications.",
    date: "Apr 14, 9:24 AM",
  },
  {
    title: "Cease-Fire Talks Stall in Eastern Europe",
    source: "NPR",
    category: "World",
    date: "Apr 14, 8:51 AM",
  },
  {
    title: "AI Regulation Bill Advances in Senate",
    source: "Al Jazeera",
    category: "Technology",
    date: "Apr 14, 7:40 AM",
  },
  {
    title: "Central Bank Signals Rate Hold Through Summer",
    source: "BBC",
    category: "Business",
    date: "Apr 14, 6:12 AM",
  },
  {
    title: "Drought Threatens Wheat Harvest Across Three Continents",
    source: "NPR",
    category: "Science",
    snippet: "Meteorologists warn of cascading food supply effects.",
  },
  {
    title: "Tech Giants Face New Antitrust Scrutiny",
    source: "Al Jazeera",
    category: "Technology",
    snippet: "Regulators on both sides of the Atlantic coordinate on probe.",
  },
  {
    title: "Coastal Cities Weigh Seawall Investments",
    source: "BBC",
    category: "Science",
    snippet: "Rising sea levels force infrastructure reckoning.",
  },
];

export const HISTORY = {
  topic: "Executive Power and Tariff Authority",
  headline: "Supreme Court to Hear Challenge Over Tariff Powers",
  summary:
    "The question of who controls trade policy has animated American politics since the founding. Today's case revisits a constitutional tension that has surfaced repeatedly across two centuries.",
  timeline: [
    {
      year: "1789",
      title: "Tariff Act",
      description:
        "Second act passed by the first Congress, asserting legislative authority over duties.",
    },
    {
      year: "1828",
      title: "Tariff of Abominations",
      description:
        "Deep sectional rift over import taxes nearly fractures the union.",
    },
    {
      year: "1890",
      title: "McKinley Tariff",
      description:
        "Congressional tariff policy reaches a high-water mark before backlash.",
    },
    {
      year: "1934",
      title: "Reciprocal Trade Act",
      description:
        "Congress delegates significant tariff-setting authority to the president.",
    },
    {
      year: "1974",
      title: "Trade Act",
      description:
        "Expands executive flexibility, setting modern precedent for unilateral action.",
    },
    {
      year: "2002",
      title: "Steel Tariffs Ruling",
      description:
        "WTO strikes down executive-imposed duties, limiting the tool internationally.",
    },
  ],
  patterns: [
    {
      title: "Crisis begets concentration",
      description:
        "Emergencies reliably pull trade authority toward the executive, even against legislative intent.",
    },
    {
      title: "Sectional friction",
      description:
        "Tariffs have historically pitted industrial regions against agricultural ones.",
    },
    {
      title: "Court as referee",
      description:
        "The judiciary enters only when the branches reach a breaking point.",
    },
    {
      title: "Reversal follows overreach",
      description:
        "Sweeping tariff actions have repeatedly produced backlash legislation.",
    },
  ],
  whyItMattersNow:
    "The ruling will shape whether modern presidents can treat economic policy as a unilateral tool, or whether Congress reclaims a role it has delegated for ninety years.",
};
