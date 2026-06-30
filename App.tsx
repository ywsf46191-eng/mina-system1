import { Switch, Route, Router as WouterRouter } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location'; // تفعيل نظام الهاش للتوجيه المستقر
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/AdminDashboard';
import DoctorPage from './pages/DoctorPage';
import DoctorBranchesPage from './pages/DoctorBranchesPage';
import SecretaryPage from './pages/SecretaryPage';
import SecretaryFinancePage from './pages/SecretaryFinancePage';
import SecretarySmsPage from './pages/SecretarySmsPage';
import SecretariesPage from './pages/doctor/SecretariesPage';
import DoctorsPage from './pages/doctor/DoctorsPage';
import WarehousePage from './pages/doctor/WarehousePage';
import AccountingPage from './pages/doctor/AccountingPage';
import StatisticsPage from './pages/doctor/StatisticsPage';
import AppearancePage from './pages/doctor/AppearancePage';

import LabsTab from './components/doctor/LabsTab';
import { useLocation } from 'wouter';
import { Layout } from './components/shared/Layout';

// قسم المعامل: نفس المكوّن المستخدم داخل لوحة الطبيب (تبويب المعامل) بحيث لا يظهر "قيد التطوير"
function LabsPage() {
  return (
    <Layout>
      <LabsTab />
    </Layout>
  );
}

// صفحة الأشعة الرقمية مرتبطة بملف مريض محدد، لذلك لا يمكن عرضها بدون اختيار مريض أولاً
function RadiologyPage() {
  const [, navigate] = useLocation();
  return (
    <Layout>
      <div className="text-right" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">قسم الأشعة الرقمية</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          الأشعة مرتبطة بملف كل مريض على حدة. لإضافة أو عرض الأشعة، افتح ملف المريض من لوحة الطبيب
          ثم اختر تبويب "الأشعة" داخل ملفه.
        </p>
        <button
          onClick={() => navigate('/doctor')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          الذهاب إلى لوحة الطبيب
        </button>
      </div>
    </Layout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/unauthorized" component={Unauthorized} />

      <Route path="/admin">
        {() => (
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>

      {/* Doctor routes */}
      <Route path="/doctor/branches">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <DoctorBranchesPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/secretaries">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <SecretariesPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/doctors">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <DoctorsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/warehouse">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <WarehousePage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/accounting">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <AccountingPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/statistics">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <StatisticsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/appearance">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <AppearancePage />
          </ProtectedRoute>
        )}
      </Route>

      {/* تعديل المسارات هنا لتطابق روابط الـ Sidebar تماماً لتجنب الـ 404 */}
      <Route path="/doctor/labs">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager', 'doctor_secretary']}>
            <LabsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/radiology">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager', 'doctor_secretary']}>
            <RadiologyPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager']}>
            <DoctorPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* Secretary routes */}
      <Route path="/secretary/finance">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager']}>
            <SecretaryFinancePage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/secretary/sms">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager']}>
            <SecretarySmsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/secretary">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager']}>
            <SecretaryPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/" component={Login} />
      <Route>
        {() => (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900" dir="rtl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">404 — الصفحة غير موجودة</h1>
              <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">العودة للرئيسية</a>
            </div>
          </div>
        )}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          {/* استخدام خطاف الهاش لحل مشاكل الرفع على الاستضافات الجاهزة */}
          <WouterRouter hook={useHashLocation}>
            <Router />
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
