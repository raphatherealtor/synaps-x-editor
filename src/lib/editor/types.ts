export const SEMANTIC_TYPES = [
  "title",
  "heading",
  "subheading",
  "body",
  "quote",
  "code",
  "checklist",
  "callout",
  "image",
  "caption",
] as const;

export type SemanticType = (typeof SEMANTIC_TYPES)[number];

export type CalloutTone = "info" | "idea" | "warn";
export type FontScale = "s" | "m" | "l";
export type AppTab = "editor" | "graph" | "notes" | "settings";
export type SaveState = "saved" | "saving" | "offline";

export interface Block {
  id: string;
  semanticType: SemanticType;
  content: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  linkedNodeIds: string[];
  checked?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  imageWidth?: number;
  calloutTone?: CalloutTone;
}

export interface Note {
  id: string;
  project: string;
  createdAt: number;
  updatedAt: number;
  blocks: Block[];
}

export interface EditorSettings {
  focusMode: boolean;
  fontScale: FontScale;
  showRails: boolean;
  compact: boolean;
}

export interface TypeMeta {
  label: string;
  short: string;
  token: string;
  placeholder: string;
  slash: string[];
}

export const TYPE_META: Record<SemanticType, TypeMeta> = {
  title: {
    label: "Title",
    short: "H1",
    token: "title",
    placeholder: "Name the thought",
    slash: ["/title", "/h1"],
  },
  heading: {
    label: "Heading",
    short: "H2",
    token: "heading",
    placeholder: "Section heading",
    slash: ["/heading", "/h2"],
  },
  subheading: {
    label: "Subheading",
    short: "H3",
    token: "subheading",
    placeholder: "Subheading",
    slash: ["/sub", "/h3"],
  },
  body: {
    label: "Body",
    short: "P",
    token: "body",
    placeholder: "Begin a thought…",
    slash: ["/body", "/p", "/text"],
  },
  quote: {
    label: "Quote",
    short: "Q",
    token: "quote",
    placeholder: "A line worth keeping",
    slash: ["/quote", "/q"],
  },
  code: {
    label: "Code",
    short: "</>",
    token: "code",
    placeholder: "signal.write()",
    slash: ["/code", "/pre"],
  },
  checklist: {
    label: "Checklist",
    short: "✓",
    token: "check",
    placeholder: "Track a step",
    slash: ["/todo", "/check", "/list"],
  },
  callout: {
    label: "Callout",
    short: "!",
    token: "callout",
    placeholder: "A note to future you",
    slash: ["/callout", "/note", "/info"],
  },
  image: {
    label: "Image",
    short: "IMG",
    token: "image",
    placeholder: "Drop an image",
    slash: ["/image", "/img", "/pic"],
  },
  caption: {
    label: "Caption",
    short: "CAP",
    token: "caption",
    placeholder: "Caption this frame",
    slash: ["/caption", "/cap"],
  },
};

export const SLASH_LOOKUP: Record<string, SemanticType> = Object.fromEntries(
  SEMANTIC_TYPES.flatMap((t) => TYPE_META[t].slash.map((s) => [s, t])),
) as Record<string, SemanticType>;
