import { useEffect, useState } from 'react';
import { onNetworkChange, isOnline } from '../../firebase/networkStatus';

export function OfflineBadge() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    return onNetworkChange(setOnline);
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                 flex items-center gap-2 rounded-full px-4 py-2
                 bg-yellow-500 text-white text-sm font-medium shadow-lg
                 animate-pulse"
      dir="rtl"
    >
      <span className="w-2 h-2 rounded-full bg-white inline-block" />
      وضع عدم الاتصال — البيانات محفوظة محلياً وستُزامَن عند عودة الإنترنت
    </div>
  );
}
