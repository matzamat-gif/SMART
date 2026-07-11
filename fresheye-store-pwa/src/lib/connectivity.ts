// Online/offline detection. navigator.onLine is a coarse signal; the real proof of
// connectivity is a successful request, so the API layer also downgrades to offline
// on network failure.

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
