import { createFileRoute } from "@tanstack/react-router";
import { MessengerGate } from "@/components/messenger/gate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MessengerGate selectedId={null} />;
}
