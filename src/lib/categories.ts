export const CATEGORIES = [
  "World",
  "U.S.",
  "Politics",
  "Business",
  "Science",
  "Technology",
] as const;

export type Category = (typeof CATEGORIES)[number];
