import { Layout } from '../../components/shared/Layout';
import SecretaryManagement from '../../components/doctor/SecretaryManagement';

export default function SecretariesPage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">إدارة السكرتارية</h1>
        <SecretaryManagement />
      </div>
    </Layout>
  );
}
