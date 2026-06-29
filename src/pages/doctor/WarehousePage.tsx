import { Layout } from '../../components/shared/Layout';
import WarehouseTab from '../../components/doctor/WarehouseTab';

export default function WarehousePage() {
  return (
    <Layout>
      <div dir="rtl">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-5">المخزن</h1>
        <WarehouseTab />
      </div>
    </Layout>
  );
}
