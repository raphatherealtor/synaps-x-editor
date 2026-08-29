import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor/store";
import {
  BottomNav,
  BottomUtilityBar,
  ContextBar,
  FocusChip,
  HeaderBar,
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

  useEffect(() => {
    void Promise.resolve(useEditorStore.persist.rehydrate()).finally(() => {
      useEditorStore.getState().hydrateFlag();
    });
  }, []);

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

        <EditorSession>
          <main
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
