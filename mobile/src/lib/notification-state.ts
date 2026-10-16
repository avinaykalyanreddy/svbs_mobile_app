import { useSyncExternalStore } from 'react';

let unreadCount = 0;
const listeners = new Set<() => void>();

export function setUnreadNotificationCount(count: number) {
  const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (next === unreadCount) return;
  unreadCount = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadNotificationCount() {
  return useSyncExternalStore(subscribe, () => unreadCount, () => 0);
}

export function formatNotificationBadge(count: number) {
  return count > 9 ? '9+' : String(count);
}
