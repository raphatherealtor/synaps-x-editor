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
  const tab = useEditorStore((s) => s.tab);
  const focusMode = useEditorStore((s) => s.settings.focusMode);
  const fontScale = useEditorStore((s) => s.settings.fontScale);
  const keyboard = useKeyboardInset();
  const keyboardOpen = keyboard > 60;
  const mainRef = useRef<HTMLElement>(null);
  const prevKb = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await useEditorStore.persist.rehydrate();
      try {
        const { notes } = useEditorStore.getState();
        const result = await migrateLegacyNotes(notes);
        if (cancelled) return;
        if (result.migrated > 0) {
          useEditorStore.getState().replaceNotes(result.notes);
        }
      } catch {
        /* keep legacy data URLs until a later load */
      } finally {
        if (!cancelled) useEditorStore.getState().hydrateFlag();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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

  return (
    <div
      className={cn(
        "app-shell flex min-h-dvh flex-col",
        fontScale === "s" && "scale-s",
        fontScale === "l" && "scale-l",
      )}
    >
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col">
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
            className="relative min-h-0 flex-1 overflow-y-auto"
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
              className={
                keyboardOpen
                  ? "fixed inset-x-0 z-30 mx-auto w-full max-w-[42rem]"
                  : ""
              }
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
