import {
  HELP_SECTIONS,
  getHelpSectionPlainText,
  type HelpSection,
  type HelpSectionId,
} from '../data/helpCenterContent';

export type HelpSearchResult = {
  sectionId: HelpSectionId;
  title: string;
  subtitle: string;
  score: number;
  matchedKeywords: string[];
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s,.;:!?]+/)
    .filter((t) => t.length >= 2);
}

function scoreSection(section: HelpSection, tokens: string[]): HelpSearchResult | null {
  if (!tokens.length) return null;

  let score = 0;
  const matchedKeywords: string[] = [];
  const haystack = `${section.title} ${section.subtitle} ${getHelpSectionPlainText(section)}`.toLowerCase();

  for (const token of tokens) {
    if (section.keywords.some((k) => k.includes(token) || token.includes(k))) {
      score += 4;
      matchedKeywords.push(token);
    }
    if (section.title.toLowerCase().includes(token)) score += 3;
    if (section.subtitle.toLowerCase().includes(token)) score += 2;
    if (haystack.includes(token)) score += 1;
  }

  if (score <= 0) return null;

  return {
    sectionId: section.id,
    title: section.title,
    subtitle: section.subtitle,
    score,
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}

export function searchHelpArticles(query: string): HelpSearchResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  return HELP_SECTIONS.map((section) => scoreSection(section, tokens))
    .filter((r): r is HelpSearchResult => r !== null)
    .sort((a, b) => b.score - a.score);
}
