import { Layout } from '../../components/shared/Layout';
import AccountingTab from '../../components/doctor/AccountingTab';

export default function AccountingPage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">المحاسبة</h1>
        <AccountingTab />
      </div>
    </Layout>
  );
}
