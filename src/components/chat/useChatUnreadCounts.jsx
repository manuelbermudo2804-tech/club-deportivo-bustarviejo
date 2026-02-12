/**
 * BACKWARD-COMPATIBLE WRAPPER
 * All state now lives in ChatUnreadProvider (single source of truth).
 * This hook simply re-exports the context so existing consumers keep working
 * without any import changes.
 */
import { useChatUnread } from "./ChatUnreadProvider";

export function useChatUnreadCounts(_user) {
  // _user param ignored — Provider already has the user
  return useChatUnread();
}