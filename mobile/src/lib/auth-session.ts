import { useSyncExternalStore } from 'react';

export type AuthUser = {
  id: number;
  token: string;
  name: string;
  email: string;
  mobile_number: string;
  aadhaar_masked: string;
  role: 'admin' | 'user';
};

let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();

export function setAuthUser(user: AuthUser | null) {
  currentUser = user;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthUser() {
  return useSyncExternalStore(subscribe, () => currentUser, () => null);
}
