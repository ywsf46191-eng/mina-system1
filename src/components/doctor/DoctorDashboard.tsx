import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatients } from '../../hooks/usePatients';
import { getPayments } from '../../firebase/firestoreService';
import { DentalChart } from './DentalChart';
import { FinancialSummary } from './FinancialSummary';
import { AppointmentScheduler } from './AppointmentScheduler';
import SecretaryManagement from './SecretaryManagement';
import DoctorManagement from './DoctorManagement';
import WarehouseTab from './WarehouseTab';
import AccountingTab from './AccountingTab';
import StatisticsTab from './StatisticsTab';
import AppearanceTab from './AppearanceTab';
import LabsTab from './LabsTab';
import { RadiologyPanel } from '../shared/RadiologyPanel';
import {
  Search, Users, TrendingUp, Calendar, ChevronRight, ChevronLeft,
  UserCog, Stethoscope, Package, Calculator, BarChart2, Image, FlaskConical, ScanLine,
} from 'lucide-react';
import type { Patient, DentalChartState, Payment } from '../../types';

type TopTab = 'patients' | 'secretaries' | 'doctors' | 'warehouse' | 'accounting' | 'statistics' | 'appearance' | 'labs';

function StatCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4 border border-slate-100 dark:border-slate-700`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DoctorDashboard() {
  const { clinicId, userProfile } = useAuth();
  const { patients, loading, error, editPatient } = usePatients(clinicId);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'chart' | 'finance' | 'appointment' | 'radiology'>('chart');
  const [topTab, setTopTab] = useState<TopTab>('patients');
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    let active = true;
    getPayments(clinicId).then((p) => { if (active) setPayments(p); });
    return () => { active = false; };
  }, [clinicId, patients]);

  const filtered = patients.filter(
    (p) =>
      p.fullName.includes(search) ||
      String(p.fileNumber).includes(search) ||
      p.phoneNumber.includes(search),
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const currentIndex = filtered.findIndex((p) => p.id === selectedPatientId);

  const navigatePatient = (dir: 'prev' | 'next') => {
    if (filtered.length === 0) return;
    if (currentIndex === -1) { setSelectedPatientId(filtered[0].id); return; }
    const next = dir === 'next'
      ? (currentIndex + 1) % filtered.length
      : (currentIndex - 1 + filtered.length) % filtered.length;
    setSelectedPatientId(filtered[next].id);
  };

  const handleChartChange = async (newState: DentalChartState) => {
    if (!selectedPatient) return;
    await editPatient(selectedPatient.id, {
      dentalChart: newState,
      lastEditedBy: userProfile?.displayName ?? 'unknown',
      lastEditedAt: new Date().toISOString(),
    });
  };

  const handlePatientUpdate = async (data: Partial<Patient>) => {
    if (!selectedPatient) return;
    await editPatient(selectedPatient.id, {
      ...data,
      lastEditedBy: userProfile?.displayName ?? 'unknown',
      lastEditedAt: new Date().toISOString(),
    });
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const allowedPages = userProfile?.allowedPages ?? [];
  const hasAllPages = allowedPages.includes('*') || allowedPages.length === 0;
  const canSeeTab = (key: TopTab) => hasAllPages || allowedPages.includes(key);

  const allTopTabs: { id: TopTab; label: string; icon: React.ReactNode }[] = [
    { id: 'patients', label: 'المرضى', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'secretaries', label: 'السكرتارية', icon: <UserCog className="w-3.5 h-3.5" /> },
    { id: 'doctors', label: 'الأطباء', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'warehouse', label: 'المخزن', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'accounting', label: 'المحاسبة', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'statistics', label: 'الإحصائيات', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'appearance', label: 'المظهر', icon: <Image className="w-3.5 h-3.5" /> },
    { id: 'labs', label: 'المعامل', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  ];
  const topTabs = allTopTabs.filter((t) => canSeeTab(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="إجمالي المرضى" value={patients.length} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard
          label="مواعيد غداً"
          value={patients.filter((p) => p.nextAppointmentDate === tomorrowStr).length}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label="إجمالي الإيرادات"
          value={'₪ ' + patients.reduce((s, p) => s + p.dentalRows.reduce((r, d) => r + Number(d.payment), 0), 0).toLocaleString('ar')}
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label="المتبقي الكلي"
          value={'₪ ' + patients.reduce((s, p) => s + p.dentalRows.reduce((r, d) => r + Number(d.price) - Number(d.payment), 0), 0).toLocaleString('ar')}
          color="text-red-600"
          bg="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      {/* Top navigation tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-hide">
          {topTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTopTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition shrink-0 border-b-2 ${
                topTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Patients tab ── */}
          {topTab === 'patients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient List */}
              <div className="lg:col-span-1">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-600">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">قائمة المرضى</h2>
                    <span className="mr-auto text-xs text-slate-400">{patients.length} مريض</span>
                  </div>
                  <div className="p-3">
                    <div className="relative mb-3">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو رقم الملف..."
                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {filtered.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className={`w-full text-right px-3 py-2.5 rounded-xl transition text-sm ${
                            selectedPatientId === patient.id
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <p className="font-medium">{patient.fullName}</p>
                          <p className={`text-xs mt-0.5 ${selectedPatientId === patient.id ? 'text-blue-100' : 'text-slate-400'}`}>
                            ملف #{patient.fileNumber} · {patient.phoneNumber}
                          </p>
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-6">لا توجد نتائج</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Detail */}
              <div className="lg:col-span-2 space-y-4">
                {selectedPatient ? (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-bold text-slate-800 dark:text-white text-lg">{selectedPatient.fullName}</h2>
                          <p className="text-xs text-slate-400 mt-0.5">ملف #{selectedPatient.fileNumber} · {selectedPatient.phoneNumber}</p>
                          {selectedPatient.lastEditedBy && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              آخر تعديل: {selectedPatient.lastEditedBy} — {selectedPatient.lastEditedAt ? new Date(selectedPatient.lastEditedAt).toLocaleString('ar-SA') : ''}
                            </p>
                          )}
                        </div>
                        {filtered.length > 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{currentIndex + 1} / {filtered.length}</span>
                            <button onClick={() => navigatePatient('next')} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 transition" title="التالي">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => navigatePatient('prev')} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 transition" title="السابق">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 mt-4 bg-slate-200 dark:bg-slate-600 rounded-xl p-1 overflow-x-auto">
                        {[
                          { id: 'chart' as const, label: 'رسم الأسنان', icon: '🦷' },
                          { id: 'finance' as const, label: 'المالية', icon: '💰' },
                          { id: 'appointment' as const, label: 'الموعد', icon: '📅' },
                          { id: 'radiology' as const, label: 'الأشعة', icon: '🖼️' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                              activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <span>{tab.icon}</span> {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-5">
                      {activeTab === 'chart' && (
                        <DentalChart
                          chartState={(selectedPatient as Patient & { dentalChart?: DentalChartState }).dentalChart ?? {}}
                          onChange={handleChartChange}
                        />
                      )}
                      {activeTab === 'finance' && <FinancialSummary patient={selectedPatient} payments={payments} />}
                      {activeTab === 'appointment' && (
                        <>
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">الموعد القادم</h3>
                          </div>
                          <AppointmentScheduler patient={selectedPatient} onUpdated={handlePatientUpdate} />
                        </>
                      )}
                      {activeTab === 'radiology' && (
                        <>
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                            <ScanLine className="w-4 h-4 text-blue-600" />
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">الصور الشعاعية</h3>
                          </div>
                          <RadiologyPanel patientId={selectedPatient.id} />
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400">
                    <Users className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm">اختر مريضاً من القائمة لعرض تفاصيله</p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">يمكنك التنقل بين الملفات بالأسهم</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Secretaries tab ── */}
          {topTab === 'secretaries' && <SecretaryManagement />}

          {/* ── Doctors tab ── */}
          {topTab === 'doctors' && <DoctorManagement />}

          {/* ── Warehouse tab ── */}
          {topTab === 'warehouse' && <WarehouseTab />}

          {/* ── Accounting tab ── */}
          {topTab === 'accounting' && <AccountingTab />}

          {/* ── Statistics tab ── */}
          {topTab === 'statistics' && <StatisticsTab />}

          {/* ── Appearance tab ── */}
          {topTab === 'appearance' && <AppearanceTab />}

          {/* ── Labs tab ── */}
          {topTab === 'labs' && <LabsTab />}
        </div>
      </div>
    </div>
  );
}
