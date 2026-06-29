import { Layout } from '../../components/shared/Layout';
import AppearanceTab from '../../components/doctor/AppearanceTab';

export default function AppearancePage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">إعدادات المظهر</h1>
        <AppearanceTab />
      </div>
    </Layout>
  );
}
