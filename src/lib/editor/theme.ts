import type { SemanticType } from "./types";

export const TYPE_TONE: Record<
  SemanticType,
  {
    text: string;
    typeClass: string;
    glow: string;
    rail: string;
    swatch: string;
  }
> = {
  title: {
    text: "text-sem-title",
    typeClass: "type-title",
    glow: "shadow-glow-title",
    rail: "var(--color-sem-title)",
    swatch: "bg-sem-title",
  },
  heading: {
    text: "text-sem-heading",
    typeClass: "type-heading",
    glow: "shadow-glow-heading",
    rail: "var(--color-sem-heading)",
    swatch: "bg-sem-heading",
  },
  subheading: {
    text: "text-sem-subheading",
    typeClass: "type-subheading",
    glow: "shadow-glow-subheading",
    rail: "var(--color-sem-subheading)",
    swatch: "bg-sem-subheading",
  },
  body: {
    text: "text-sem-body",
    typeClass: "type-body",
    glow: "shadow-glow-body",
    rail: "var(--color-cyan)",
    swatch: "bg-sem-body",
  },
  quote: {
    text: "text-sem-quote",
    typeClass: "type-quote",
    glow: "shadow-glow-quote",
    rail: "var(--color-sem-quote)",
    swatch: "bg-sem-quote",
  },
  code: {
    text: "text-sem-code",
    typeClass: "type-code",
    glow: "shadow-glow-code",
    rail: "var(--color-sem-code)",
    swatch: "bg-sem-code",
  },
  checklist: {
    text: "text-sem-check",
    typeClass: "type-checklist",
    glow: "shadow-glow-check",
    rail: "var(--color-fg-muted)",
    swatch: "bg-fg-muted",
  },
  callout: {
    text: "text-sem-callout",
    typeClass: "type-callout",
    glow: "shadow-glow-callout",
    rail: "var(--color-sem-callout)",
    swatch: "bg-sem-callout",
  },
  image: {
    text: "text-sem-image",
    typeClass: "type-body",
    glow: "shadow-glow-image",
    rail: "var(--color-sem-image)",
    swatch: "bg-sem-image",
  },
  caption: {
    text: "text-sem-caption",
    typeClass: "type-caption",
    glow: "shadow-glow-caption",
    rail: "var(--color-sem-caption)",
    swatch: "bg-sem-caption",
  },
};
