import { Switch, Route, Router as WouterRouter } from 'wouter';
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
import LabsPage from './pages/doctor/LabsPage';

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
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <DoctorBranchesPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/secretaries">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <SecretariesPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/doctors">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <DoctorsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/warehouse">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <WarehousePage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/accounting">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <AccountingPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/statistics">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <StatisticsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/appearance">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <AppearancePage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor/labs">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <LabsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/doctor">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'branch_manager', 'doctor_secretary']}>
            <DoctorPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* Secretary routes */}
      <Route path="/secretary/finance">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager', 'doctor_secretary']}>
            <SecretaryFinancePage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/secretary/sms">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager', 'doctor_secretary']}>
            <SecretarySmsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/secretary">
        {() => (
          <ProtectedRoute allowedRoles={['doctor', 'secretary', 'branch_manager', 'doctor_secretary']}>
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
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
