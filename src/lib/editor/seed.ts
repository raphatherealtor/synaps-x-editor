import type { Block, Note } from "./types";

const T0 = Date.UTC(2026, 7, 12, 18, 40, 0);
const T1 = Date.UTC(2026, 7, 28, 21, 12, 0);

function b(
  id: string,
  semanticType: Block["semanticType"],
  content: string,
  order: number,
  extra: Partial<Block> = {},
): Block {
  return {
    id,
    semanticType,
    content,
    order,
    createdAt: T0 + order * 60_000,
    updatedAt: T0 + order * 60_000,
    linkedNodeIds: extra.linkedNodeIds ?? [],
    ...extra,
  };
}

export const SEED_NOTES: Note[] = [
  {
    id: "note_bridge",
    project: "NEURAL JOURNAL",
    createdAt: T0,
    updatedAt: T1,
    blocks: [
      b("b_t1", "title", "The Bridge of Thought", 0, {
        linkedNodeIds: ["b_h1", "b_h2"],
      }),
      b(
        "b_p1",
        "body",
        "Ideas are not born in isolation. They form connections—silent, invisible, and infinite. BrainBridge X is the interface that makes those connections visible. #concept",
        1,
      ),
      b("b_i1", "image", "", 2, {
        imageSrc: "/demo/bridge.jpg",
        imageAlt: "A luminous brain dissolving into a teal architectural bridge",
        imageWidth: 100,
      }),
      b("b_c1", "caption", "Neural span — thought rendered as architecture.", 3),
      b("b_h1", "heading", "System Architecture", 4, {
        linkedNodeIds: ["b_t1"],
      }),
      b(
        "b_p2",
        "body",
        "A decentralized cognitive mesh. Every node represents a thought, every link a synapse. Together, they create a dynamic lattice for knowledge retention and expansion. #architecture",
        5,
      ),
      b("b_i2", "image", "", 6, {
        imageSrc: "/demo/lattice.jpg",
        imageAlt: "Violet glass cubes connected by glowing filaments",
        imageWidth: 100,
      }),
      b("b_c2", "caption", "Lattice of retention. Each cube is a durable node.", 7),
      b("b_h2", "heading", "Design Language", 8),
      b(
        "b_p3",
        "subheading",
        "Retro-futurism, held to a standard.",
        9,
      ),
      b(
        "b_p4",
        "body",
        "Retro-futurism meets clarity. Inspired by 1980s cybernetics, reimagined for the modern creator. Glowing data, industrial forms, and purposeful minimalism. #ux #vision",
        10,
      ),
      b("b_i3", "image", "", 11, {
        imageSrc: "/demo/device.jpg",
        imageAlt: "Handheld retro-futurist writing device",
        imageWidth: 100,
      }),
      b(
        "b_q1",
        "quote",
        "The interface is not a window. It is a bridge — and you are standing on it.",
        12,
      ),
      b(
        "b_k1",
        "callout",
        "Semantic color is editorial, not decorative. Title, heading, and body are types of thought — cyan, violet, and quiet white keep them distinct without shouting.",
        13,
        { calloutTone: "idea" },
      ),
      b("b_x1", "checklist", "Capture the thought before it cools", 14, {
        checked: true,
      }),
      b("b_x2", "checklist", "Assign a semantic type so it can be found later", 15, {
        checked: true,
      }),
      b("b_x3", "checklist", "Link related nodes from the neural index", 16, {
        checked: false,
      }),
      b(
        "b_code",
        "code",
        "synapse.connect({\n  from: thought.id,\n  to: 'visible',\n  color: 'cyan'\n})",
        17,
      ),
    ],
  },
  {
    id: "note_operator",
    project: "OPERATOR LOG",
    createdAt: T1 - 86_400_000,
    updatedAt: T1 - 3_600_000,
    blocks: [
      b("o_t1", "title", "Night Circuit — 28 Aug", 0),
      b(
        "o_p1",
        "body",
        "The handheld editor is the whole product. No board. No infinite canvas. Just a stack of meaning, color-coordinated so the eye can scan a thought the way a technician scans a panel.",
        1,
      ),
      b(
        "o_q1",
        "quote",
        "Discipline is a kind of glow. You only notice it when it is absent.",
        2,
      ),
      b("o_x1", "checklist", "Keep the caret honest — no jumps, no leakage", 3, {
        checked: true,
      }),
      b("o_x2", "checklist", "Images live in the stream, never beside it as stickers", 4, {
        checked: true,
      }),
      b("o_x3", "checklist", "Export a page as markdown when the session closes", 5, {
        checked: false,
      }),
      b(
        "o_k1",
        "callout",
        "Paste a photo from the clipboard. It becomes a block. Resize it. Caption it. Move it. That is the whole image model.",
        6,
        { calloutTone: "info" },
      ),
    ],
  },
];

export const DEFAULT_SETTINGS = {
  focusMode: false,
  fontScale: "m" as const,
  showRails: true,
  compact: false,
};
