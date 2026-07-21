// Parses the direct-Terra report's ranked "## #N Best Match — Name" headings
// into a scannable shortlist for the "your picks at a glance" band, and derives
// stable heading anchor ids so a pick can link to its section in the full
// report. This only reads Terra's own report text — it never reranks, rewrites,
// or invents products.

const RANKED_HEADING = /^#{2,4}\s+#?(\d+)\s+Best Match\b\s*[—\-:]*\s*(.*)$/i;
const HEADING_MARKER = /^#{1,6}\s+/;

export type DirectTerraPick = {
  rank: number;
  name: string;
  anchorId: string;
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

export function extractDirectTerraPicks(reportMarkdown: string): DirectTerraPick[] {
  const picks: DirectTerraPick[] = [];
  const seenRanks = new Set<number>();
  for (const line of (reportMarkdown || "").split(/\r?\n/)) {
    const match = line.match(RANKED_HEADING);
    if (!match) continue;
    const rank = Number(match[1]);
    if (!Number.isInteger(rank) || seenRanks.has(rank)) continue;
    // Slug the heading's content (everything after the leading `## `), matching
    // what the report renderer produces for its heading id.
    const headingText = line.replace(HEADING_MARKER, "").trim();
    const name = match[2].trim() || `Pick ${rank}`;
    seenRanks.add(rank);
    picks.push({ rank, name, anchorId: headingSlug(headingText) });
  }
  return picks.sort((a, b) => a.rank - b.rank);
}
