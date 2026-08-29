import { createFileRoute } from "@tanstack/react-router";
import { NoteShell } from "@/components/editor/NoteShell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NoteShell />;
}
