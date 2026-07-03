import type { Message } from "@/types/messages";
import { removeMessages, updateMessage } from "./message-utils";

/**
 * Handles message-related events from the build process.
 * This keeps all chat message logic within the chat-view scope.
 */
export const handleMessageEvent = (
  eventType: string,
  data: unknown,
): boolean => {
  switch (eventType) {
    case "add_message": {
      // Add/update message in React Query cache (replaces placeholder if exists)
      updateMessage(data as Message);
      return true;
    }
    case "token": {
      // Update message text in React Query cache for streaming.
      // Only include timestamp if the backend provides it — using new Date() as a
      // fallback would overwrite the correct server timestamp set by the preceding
      // add_message event, causing messages to appear out of order when the client
      // clock differs from the server (e.g. VPN clock drift).
      const tokenData = data as Record<string, unknown>;
      updateMessage({
        id: tokenData.id,
        flow_id: (tokenData.flow_id as string) || "",
        session_id: (tokenData.session_id as string) || "",
        text: (tokenData.chunk as string) || "",
        sender: (tokenData.sender as string) || "Machine",
        sender_name: (tokenData.sender_name as string) || "AI",
        ...(tokenData.timestamp
          ? { timestamp: tokenData.timestamp as string }
          : {}),
        files: (tokenData.files as string[]) || [],
        edit: (tokenData.edit as boolean) || false,
        background_color: (tokenData.background_color as string) || "",
        text_color: (tokenData.text_color as string) || "",
        properties: { ...(tokenData.properties as object), state: "partial" },
      } as Message);
      return true;
    }
    case "remove_message": {
      // Remove message from React Query cache
      removeMessages([data.id], data.session_id || "", data.flow_id || "");
      return true;
    }
    case "error": {
      if (data?.category === "error") {
        // Add error message to React Query cache
        updateMessage(data as Message);
      }
      return true;
    }
    default:
      // Not a message event, return false to indicate it wasn't handled
      return false;
  }
};
