import { Layout } from '../../components/shared/Layout';
import DoctorManagement from '../../components/doctor/DoctorManagement';

export default function DoctorsPage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">إدارة الأطباء</h1>
        <DoctorManagement />
      </div>
    </Layout>
  );
}
