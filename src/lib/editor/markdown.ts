const TAG_RE = /(^|\s)#([A-Za-z][\w-]{0,32})/g;

const ESC: Record<string, string> = {
  "&": "&" + "amp;",
  "<": "&" + "lt;",
  ">": "&" + "gt;",
  '"': "&" + "quot;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"]/g, (ch) => ESC[ch] ?? ch);
}

export function renderInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<u>$1</u>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a class="md-link" href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  html = html.replace(TAG_RE, '$1<span class="md-tag">#$2</span>');
  return html;
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  left: string,
  right = left,
): { value: string; start: number; end: number } {
  const selected = value.slice(start, end) || "text";
  const next = value.slice(0, start) + left + selected + right + value.slice(end);
  return {
    value: next,
    start: start + left.length,
    end: start + left.length + selected.length,
  };
}

export function extractHashtags(text: string): string[] {
  const tags: string[] = [];
  const re = /#([A-Za-z][\w-]{0,32})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tag = m[1].toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function firstLine(text: string, fallback = "Untitled"): string {
  const line = text
    .split("\n")
    .map((l) => l.replace(/[#*_`]/g, "").trim())
    .find(Boolean);
  return line || fallback;
}

export function toMarkdown(blocks: {
  semanticType: string;
  content: string;
  checked?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.semanticType) {
      case "title":
        out.push(`# ${b.content}`);
        break;
      case "heading":
        out.push(`## ${b.content}`);
        break;
      case "subheading":
        out.push(`### ${b.content}`);
        break;
      case "quote":
        out.push(
          b.content
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
        );
        break;
      case "code":
        out.push("```\n" + b.content + "\n```");
        break;
      case "checklist":
        out.push(`- [${b.checked ? "x" : " "}] ${b.content}`);
        break;
      case "callout":
        out.push(`> **Note:** ${b.content}`);
        break;
      case "image":
        out.push(`![${b.imageAlt || "image"}](${b.imageSrc || ""})`);
        break;
      case "caption":
        out.push(`*${b.content}*`);
        break;
      default:
        out.push(b.content);
    }
    out.push("");
  }
  return out.join("\n").trim() + "\n";
}
