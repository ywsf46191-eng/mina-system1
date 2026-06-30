import { Layout } from '../components/shared/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getBranches } from '../firebase/firestoreService';
import { useState, useEffect } from 'react';
import type { Branch } from '../types';
import { Building2 } from 'lucide-react';

export default function DoctorBranchesPage() {
  const { userProfile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    (async () => {
      const all = await getBranches();
      if (userProfile?.role === 'superadmin') { setBranches(all); return; }
      const managerIds = all.flatMap((b) => b.managerIds ?? []);
      const filtered = all.filter((b) => managerIds.includes(userProfile?.uid ?? ''));
      setBranches(filtered.length > 0 ? filtered : all.filter((b) => b.id === userProfile?.clinicId));
    })();
  }, [userProfile]);

  return (
    <Layout>
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" /> الأفرع
        </h1>
        {branches.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 text-sm">
            لا توجد أفرع مضافة بعد
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">{b.name}</p>
                {b.address && <p className="text-xs text-slate-400">{b.address}</p>}
                {b.phone && <p className="text-xs text-slate-400" dir="ltr">{b.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}