/**
 * Network status monitor - tracks online/offline state
 * Components can subscribe to know when to show offline badge
 */

type Listener = (online: boolean) => void;
const listeners: Set<Listener> = new Set();

let _isOnline = navigator.onLine;

window.addEventListener('online', () => {
  _isOnline = true;
  listeners.forEach((fn) => fn(true));
});

window.addEventListener('offline', () => {
  _isOnline = false;
  listeners.forEach((fn) => fn(false));
});

export function isOnline(): boolean {
  return _isOnline;
}

export function onNetworkChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
