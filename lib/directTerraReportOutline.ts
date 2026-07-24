// Parses the direct-Terra report's required "#N Best Match — Name" labels
// into one shared contract for shortlist cards, evaluation, price binding, and
// report anchors. Terra may emit the label as an ordinary Markdown paragraph
// (`#1 Best Match`, with no space after `#`) or inside an H1-H4 heading. This
// only reads Terra's report — it never reranks, rewrites, or invents products.

const MARKDOWN_RANKED_HEADING =
  /^(#{1,4})\s+#?(\d+)\s+Best Match\b\s*[—\-:]*\s*(.*)$/i;
const BARE_RANKED_LABEL =
  /^#(\d+)\s+Best Match\b\s*[—\-:]*\s*(.*)$/i;
const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/;
const REQUIRED_REPORT_SECTION =
  /^(?:comparison(?:\s+(?:at\s+a\s+glance|table))?|close\s+matches|what\s+to\s+avoid|final\s+buying\s+advice)\b/i;

export type DirectTerraPick = {
  rank: number;
  name: string;
  anchorId: string;
};

export type DirectTerraRankedHeading = {
  rank: number;
  name: string;
  // Zero means a bare "#N Best Match" paragraph label. One through four are
  // actual Markdown heading depths.
  depth: 0 | 1 | 2 | 3 | 4;
  headingText: string;
};

export type DirectTerraRankedSection = DirectTerraRankedHeading & {
  section: string;
};

// A stable slug for a heading's full text. The report renderer stamps the same
// slug as each heading's DOM id, so `#${anchorId}` scrolls to the right section.
export function headingSlug(text: string): string {
  return (text || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Extract text from React markdown heading children (string, or array of
// strings/nodes) so the renderer can slug it identically to the parser.
export function reactChildrenToText(children: unknown): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(reactChildrenToText).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in (children as Record<string, unknown>)
  ) {
    const props = (children as { props?: { children?: unknown } }).props;
    return reactChildrenToText(props?.children);
  }
  return "";
}

export function parseDirectTerraRankedHeading(
  value: string,
): DirectTerraRankedHeading | null {
  const line = (value || "").trim();
  const markdownMatch = line.match(MARKDOWN_RANKED_HEADING);
  const bareMatch = markdownMatch ? null : line.match(BARE_RANKED_LABEL);
  const match = markdownMatch ?? bareMatch;
  if (!match) return null;

  const rankIndex = markdownMatch ? 2 : 1;
  const nameIndex = markdownMatch ? 3 : 2;
  const rank = Number(match[rankIndex]);
  if (!Number.isSafeInteger(rank) || rank <= 0) return null;

  const depth = markdownMatch
    ? (markdownMatch[1].length as 1 | 2 | 3 | 4)
    : 0;
  const headingText = markdownMatch
    ? line.slice(markdownMatch[1].length).trim()
    : line;
  return {
    rank,
    name: match[nameIndex].trim() || `Pick ${rank}`,
    depth,
    headingText,
  };
}

function markdownHeading(value: string) {
  const match = (value || "").trim().match(MARKDOWN_HEADING);
  if (!match) return null;
  return {
    depth: match[1].length,
    text: match[2].trim(),
  };
}

function isRequiredReportSection(value: string) {
  const heading = markdownHeading(value);
  return Boolean(heading && REQUIRED_REPORT_SECTION.test(heading.text));
}

export function parseDirectTerraRankedSections(
  reportMarkdown: string,
): DirectTerraRankedSection[] {
  const sections: DirectTerraRankedSection[] = [];
  const seenRanks = new Set<number>();
  let current: DirectTerraRankedSection | null = null;
  const flush = () => {
    if (!current) return;
    current.section = current.section.trim();
    sections.push(current);
    current = null;
  };

  for (const line of (reportMarkdown || "").split(/\r?\n/)) {
    const ranked = parseDirectTerraRankedHeading(line);
    if (ranked) {
      flush();
      if (seenRanks.has(ranked.rank)) continue;
      seenRanks.add(ranked.rank);
      current = { ...ranked, section: "" };
      continue;
    }

    if (current) {
      const heading = markdownHeading(line);
      const closesByDepth =
        heading !== null && current.depth > 0 && heading.depth <= current.depth;
      if (closesByDepth || isRequiredReportSection(line)) {
        flush();
        continue;
      }
      current.section += `${line}\n`;
    }
  }
  flush();
  return sections.sort((left, right) => left.rank - right.rank);
}

export function extractDirectTerraPicks(
  reportMarkdown: string,
): DirectTerraPick[] {
  return parseDirectTerraRankedSections(reportMarkdown).map(
    ({ rank, name, headingText }) => ({
      rank,
      name,
      anchorId: headingSlug(headingText),
    }),
  );
}
