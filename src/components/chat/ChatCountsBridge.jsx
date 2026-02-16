import { useEffect } from "react";
import { useChatUnread } from "./ChatUnreadProvider";

/**
 * Bridge component: sits inside ChatUnreadProvider, 
 * pushes counts up to Layout via onCounts callback.
 */
export default function ChatCountsBridge({ onCounts }) {
  const { counts } = useChatUnread();

  useEffect(() => {
    if (onCounts) onCounts(counts);
  }, [counts, onCounts]);

  return null;
}