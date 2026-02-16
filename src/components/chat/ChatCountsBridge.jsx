import { useEffect } from "react";
import { useChatUnread } from "./ChatUnreadProvider";

/**
 * Bridge component: sits inside ChatUnreadProvider, 
 * pushes counts up to Layout via onCounts callback.
 */
export default function ChatCountsBridge({ onCounts }) {
  const { counts } = useChatUnread();
  
  console.log("🌉 [ChatCountsBridge] counts actuales:", counts);

  useEffect(() => {
    console.log("🌉 [ChatCountsBridge] useEffect - propagando counts:", counts);
    if (onCounts) {
      console.log("🌉 [ChatCountsBridge] Llamando onCounts callback");
      onCounts(counts);
    }
  }, [counts, onCounts]);

  return null;
}