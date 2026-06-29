import { useState, useEffect } from 'react';

type NetworkState = 'online' | 'offline' | 'syncing';

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    const onOnline = () => setState('online');
    const onOffline = () => setState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return state;
}
