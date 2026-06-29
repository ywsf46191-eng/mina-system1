import { Layout } from '../../components/shared/Layout';
import StatisticsTab from '../../components/doctor/StatisticsTab';

export default function StatisticsPage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">الإحصائيات</h1>
        <StatisticsTab />
      </div>
    </Layout>
  );
}
