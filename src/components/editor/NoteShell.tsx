import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor/store";
import { migrateLegacyNotes } from "@/lib/editor/migrate-images";
import { isElementInView } from "@/lib/editor/caret";
import { buildStressNote } from "@/lib/editor/stress";
import {
  BottomNav,
  BottomUtilityBar,
  ContextBar,
  FocusChip,
  HeaderBar,
  StorageBanner,
} from "./chrome";
import { EditorBody, EditorSession } from "./EditorBody";
import { NeuralIndex } from "./NeuralIndex";
import { NotesLibrary } from "./NotesLibrary";
import { SettingsPanel } from "./SettingsPanel";
import { Toolbar } from "./Toolbar";

function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(kb > 60 ? kb : 0);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

export function NoteShell() {
  const hydrated = useEditorStore((s) => s.hydrated);
  const [loadError, setLoadError] = useState("");
  const [ownsJournal, setOwnsJournal] = useState(false);
  const tab = useEditorStore((s) => s.tab);
  const focusMode = useEditorStore((s) => s.settings.focusMode);
  const fontScale = useEditorStore((s) => s.settings.fontScale);
  const keyboard = useKeyboardInset();
  const keyboardOpen = keyboard > 60;
  const mainRef = useRef<HTMLElement>(null);
  const prevKb = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    const initialize = async () => {
      try {
        await useEditorStore.persist.rehydrate();
        if (!useEditorStore.persist.hasHydrated())
          throw new Error(
            "Could not read this device's journal. Your stored data has not been replaced. Try reloading; do not clear browser data.",
          );
        const { notes } = useEditorStore.getState();
        const result = await migrateLegacyNotes(notes);
        if (cancelled) return;
        if (result.migrated > 0) {
          useEditorStore.getState().replaceNotes(result.notes);
        }
        if (!cancelled) {
          useEditorStore.getState().hydrateFlag();
          setOwnsJournal(true);
        }
      } catch (error) {
        if (!cancelled)
          setLoadError(error instanceof Error ? error.message : "Could not open local notes.");
      }
    };
    if (navigator.locks) {
      void navigator.locks
        .request("synaps-x-journal-editor", { ifAvailable: true }, async (lock) => {
          if (cancelled) return;
          if (!lock) {
            setLoadError(
              "This journal is open in another tab. Close that tab, then try again to avoid conflicting saves.",
            );
            return;
          }
          const hold = new Promise<void>((resolve) => {
            release = resolve;
          });
          await initialize();
          if (!cancelled) await hold;
        })
        .catch(() => {
          if (!cancelled)
            setLoadError(
              "Could not safely lock local storage. Close other Synaps-X tabs and try again.",
            );
        });
    } else {
      // Older browsers cannot coordinate tabs. Do not risk silently overwriting notes.
      setLoadError(
        "This browser does not support safe journal locking. Use an up-to-date Safari, Chrome, or Edge browser over HTTPS.",
      );
    }
    return () => {
      cancelled = true;
      release?.();
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as Window & {
      __SX?: { store: typeof useEditorStore; buildStressNote: typeof buildStressNote };
    };
    w.__SX = { store: useEditorStore, buildStressNote };
    return () => {
      delete w.__SX;
    };
  }, []);

  useEffect(() => {
    if (keyboardOpen && keyboard > prevKb.current) {
      const el = document.activeElement;
      const scroller = mainRef.current;
      if (el instanceof HTMLElement && scroller && !isElementInView(el, scroller)) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    prevKb.current = keyboard;
  }, [keyboard, keyboardOpen]);

  const hideChrome = focusMode || keyboardOpen;
  const showToolbar = tab === "editor";

  if (!hydrated || !ownsJournal)
    return (
      <main className="min-h-dvh bg-bg p-8 text-fg" role="status">
        <h1 className="font-display text-xl">Synaps-X</h1>
        <p className="mt-4">{loadError || "Opening your local journal safely…"}</p>
        {loadError ? (
          <button
            className="mt-4 rounded-lg bg-cyan p-3 text-bg"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        ) : null}
      </main>
    );

  return (
    <div
      className={cn(
        "app-shell flex h-dvh flex-col overflow-hidden",
        fontScale === "s" && "scale-s",
        fontScale === "l" && "scale-l",
      )}
    >
      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[42rem] flex-col">
        {focusMode ? <FocusChip /> : null}
        {!hideChrome ? (
          <>
            <HeaderBar />
            <ContextBar />
          </>
        ) : null}
        <StorageBanner />

        <EditorSession>
          <main
            ref={mainRef}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{
              paddingBottom: showToolbar && keyboardOpen ? 96 : 8,
            }}
          >
            {tab === "editor" ? <EditorBody /> : null}
            {tab === "graph" ? <NeuralIndex /> : null}
            {tab === "notes" ? <NotesLibrary /> : null}
            {tab === "settings" ? <SettingsPanel /> : null}
          </main>

          {showToolbar ? (
            <div
              className={keyboardOpen ? "fixed inset-x-0 z-30 mx-auto w-full max-w-[42rem]" : ""}
              style={keyboardOpen ? { bottom: keyboard } : undefined}
            >
              <Toolbar />
            </div>
          ) : null}
        </EditorSession>

        {!hideChrome ? (
          <>
            <BottomUtilityBar />
            <BottomNav />
          </>
        ) : null}
      </div>
    </div>
  );
}
