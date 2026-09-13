import { createFileRoute } from "@tanstack/react-router";
import { MessengerGate } from "@/components/messenger/gate";

export const Route = createFileRoute("/c/$id")({ component: ChatRoute });

function ChatRoute() {
  const { id } = Route.useParams();
  return <MessengerGate selectedId={decodeURIComponent(id)} />;
}
