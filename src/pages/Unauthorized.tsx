import { useLocation } from 'wouter';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">غير مصرح لك</h1>
        <p className="text-sm text-slate-400">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition">
          العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
}
