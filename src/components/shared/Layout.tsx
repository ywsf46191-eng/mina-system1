import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { OfflineBadge } from './OfflineBadge';
import { getClinicSettings } from '../../firebase/firestoreService';
import {
  Stethoscope, LogOut, LayoutDashboard, Users, Sun, Moon, CreditCard,
  Building2, Phone, UserCog, Package, Calculator, BarChart2, ImageIcon,
  FlaskConical, ChevronDown, ChevronUp, GitBranch, Shield, MessageSquare,
} from 'lucide-react';

interface LayoutProps { children: ReactNode; title?: string; }

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  pageKey?: string;
  children?: { label: string; path: string; icon: React.ElementType; pageKey?: string }[];
}

export function Layout({ children }: LayoutProps) {
  const { userProfile, userRole, signOut, clinicId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [doctorMenuOpen, setDoctorMenuOpen] = useState(true);

  const allowedPages: string[] = userProfile?.allowedPages ?? [];
  const hasAll = allowedPages.includes('*') || allowedPages.length === 0;
  const canSee = (key: string) => hasAll || allowedPages.includes(key);

  useEffect(() => {
    if (!clinicId) return;
    getClinicSettings(clinicId).then((s) => {
      if (s.backgroundImage) setBgImage(s.backgroundImage);
    }).catch(() => null);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setBgImage(detail || null);
    };
    window.addEventListener('clinic-bg-changed', handler);
    return () => window.removeEventListener('clinic-bg-changed', handler);
  }, [clinicId]);

  const navItems: NavItem[] = (() => {
    if (userRole === 'superadmin') return [
      { label: 'لوحة التحكم', path: '/admin', icon: Shield },
    ];

    if (userRole === 'doctor' || userRole === 'branch_manager') {
      const children = [
  canSee('secretaries') && { label: 'السكرتارية', path: '/doctor/secretaries', icon: UserCog, pageKey: 'secretaries' },
  canSee('doctors')     && { label: 'الأطباء',     path: '/doctor/doctors',     icon: Stethoscope, pageKey: 'doctors'     },
  canSee('warehouse')   && { label: 'المخزن',      path: '/doctor/warehouse',   icon: Package,     pageKey: 'warehouse'   },
  canSee('accounting')  && { label: 'المحاسبة',    path: '/doctor/accounting',  icon: Calculator,  pageKey: 'accounting'  },
  canSee('statistics')  && { label: 'الإحصائيات', path: '/doctor/statistics',  icon: BarChart2,   pageKey: 'statistics'  },
  canSee('appearance')  && { label: 'المظهر',      path: '/doctor/appearance',  icon: ImageIcon,   pageKey: 'appearance'  },
  canSee('labs')        && { label: 'المعامل',      path: '/doctor/labs',        icon: FlaskConical, pageKey: 'labs' },
  canSee('radiology')   && { label: 'الأشعة',       path: '/doctor/radiology',   icon: ImageIcon,    pageKey: 'radiology' },
].filter(Boolean) as { label: string; path: string; icon: React.ElementType; pageKey: string }[];
      return [
        { label: 'لوحة الطبيب', path: '/doctor', icon: LayoutDashboard },
        { label: 'الأفرع', path: '/doctor/branches', icon: GitBranch },
        ...(children.length > 0 ? [{
          label: 'الإدارة',
          path: '/doctor/manage',
          icon: Building2,
          children,
        }] : []),
      ];
    }

    const secChildren: NavItem[] = [];
    if (canSee('patients')) secChildren.push({ label: 'المرضى', path: '/secretary', icon: Users, pageKey: 'patients' });
    if (canSee('finance'))  secChildren.push({ label: 'المالية', path: '/secretary/finance', icon: CreditCard, pageKey: 'finance' });
    if (canSee('sms'))      secChildren.push({ label: 'إرسال SMS', path: '/secretary/sms', icon: MessageSquare, pageKey: 'sms' });

    return secChildren.map((c) => ({ ...c, children: undefined }));
  })();

  const isActive = (path: string) =>
    location === path || (path !== '/doctor' && path !== '/admin' && location.startsWith(path + '/'));

  const isGroupActive = (item: NavItem) =>
    item.children?.some((c) => location === c.path || location.startsWith(c.path + '/'));

  const roleLabel = () => {
    if (userRole === 'superadmin') return '🔑 مشرف عام';
    if (userRole === 'branch_manager') return '🏢 مدير فرع';
    if (userRole === 'doctor') return '🩺 طبيب';
    return '🗂️ سكرتارية';
  };

  return (
    <div
      className="min-h-screen flex transition-colors duration-300"
      dir="rtl"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : undefined}
    >
      {bgImage && <div className="fixed inset-0 bg-black/50 dark:bg-black/65 pointer-events-none z-0" />}

      <div className="relative z-10 flex w-full min-h-screen">
        <aside className={`w-60 shrink-0 flex flex-col sticky top-0 h-screen shadow-sm z-20 ${
          bgImage
            ? 'bg-white/90 dark:bg-slate-800/90 backdrop-blur border-l border-white/20'
            : 'bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700'
        }`}>
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-bold">M</span>
              </div>
              <div>
                <p className="text-sm font-black tracking-widest text-blue-600 dark:text-blue-400 leading-none">MINA</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest leading-none mt-0.5">SYSTEM</p>
              </div>
            </div>
            {userProfile && (
              <div className="mt-3 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{userProfile.displayName}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{roleLabel()}</p>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              if (item.children) {
                const groupActive = isGroupActive(item);
                return (
                  <div key={item.path}>
                    <button
                      onClick={() => setDoctorMenuOpen((v) => !v)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        groupActive
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-right">{item.label}</span>
                      {doctorMenuOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {doctorMenuOpen && (
                      <div className="mr-3 mt-0.5 border-r-2 border-slate-100 dark:border-slate-700 pr-1 space-y-0.5">
                        {item.children.map((child) => {
                          const active = isActive(child.path);
                          return (
                            <button
                              key={child.path}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                active
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <child.icon className="w-3.5 h-3.5 shrink-0" />
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="px-3 pb-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-0.5">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              {theme === 'dark' ? 'وضع النهار' : 'وضع الليل'}
            </button>
            <button
              onClick={() => void signOut()}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              تسجيل الخروج
            </button>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-black">IC</span>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">ICON TEAM</p>
                <a href="tel:+972592853342" className="flex items-center gap-1 text-[9px] text-blue-500 hover:text-blue-600 font-mono" dir="ltr">
                  <Phone className="w-2.5 h-2.5" />+972592853342
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 p-6 overflow-auto ${bgImage ? '' : 'bg-slate-50 dark:bg-slate-900'}`}>
          {children}
        </main>

        <OfflineBadge />
      </div>
    </div>
  );
}
