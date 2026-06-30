// src/components/doctor/PrintTreatmentPlan.tsx
import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { resolveVisualStatus } from '../../lib/teeth';
import { getRadiologyImages } from '../../firebase/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import type { Patient, ToothState, DentalChartState, RadiologyImage } from '../../types';

interface Props {
  patient: Patient;
}

/* ── نفس تعريفات الأرباع المستخدمة في DentalChart — لازم تفضل متطابقة معاها ── */
const QUADRANTS = [
  {
    label: 'الفك العلوي — أيمن',
    quadrant: 'Q1',
    teeth: [
      { fdi: '18', display: 8 }, { fdi: '17', display: 7 }, { fdi: '16', display: 6 },
      { fdi: '15', display: 5 }, { fdi: '14', display: 4 }, { fdi: '13', display: 3 },
      { fdi: '12', display: 2 }, { fdi: '11', display: 1 },
    ],
  },
  {
    label: 'الفك العلوي — أيسر',
    quadrant: 'Q2',
    teeth: [
      { fdi: '21', display: 1 }, { fdi: '22', display: 2 }, { fdi: '23', display: 3 },
      { fdi: '24', display: 4 }, { fdi: '25', display: 5 }, { fdi: '26', display: 6 },
      { fdi: '27', display: 7 }, { fdi: '28', display: 8 },
    ],
  },
  {
    label: 'الفك السفلي — أيمن',
    quadrant: 'Q4',
    teeth: [
      { fdi: '48', display: 8 }, { fdi: '47', display: 7 }, { fdi: '46', display: 6 },
      { fdi: '45', display: 5 }, { fdi: '44', display: 4 }, { fdi: '43', display: 3 },
      { fdi: '42', display: 2 }, { fdi: '41', display: 1 },
    ],
  },
  {
    label: 'الفك السفلي — أيسر',
    quadrant: 'Q3',
    teeth: [
      { fdi: '31', display: 1 }, { fdi: '32', display: 2 }, { fdi: '33', display: 3 },
      { fdi: '34', display: 4 }, { fdi: '35', display: 5 }, { fdi: '36', display: 6 },
      { fdi: '37', display: 7 }, { fdi: '38', display: 8 },
    ],
  },
];

const QUADRANT_TO_LOCATION: Record<string, string> = {
  Q1: 'upper-right',
  Q2: 'upper-left',
  Q3: 'lower-left',
  Q4: 'lower-right',
};

function getToothState(
  chartState: DentalChartState,
  fdi: string,
  display: number,
  quadrantCode: string,
): ToothState | undefined {
  if (chartState[fdi]) return chartState[fdi];
  const loc = QUADRANT_TO_LOCATION[quadrantCode];
  if (loc) {
    const key = `${loc}_${display}`;
    if (chartState[key]) return chartState[key];
  }
  // last-resort: find any key that ends with _display
  const fallbackKey = Object.keys(chartState).find((k) => k.endsWith(`_${display}`));
  if (fallbackKey) return chartState[fallbackKey];
  return undefined;
}

const STATUS_COLORS: Record<string, string> = {
  none: '#ffffff',
  treatment: '#ef4444',
  inprogress: '#fbbf24',
  done: '#10b981',
};

function PrintToothBox({ display, state }: { display: number; state: ToothState | undefined }) {
  const status = resolveVisualStatus(state);
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: '1.5px solid #94a3b8',
        backgroundColor: STATUS_COLORS[status],
        color: status === 'none' ? '#475569' : '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {display}
    </div>
  );
}

export default function PrintTreatmentPlan({ patient }: Props) {
  const { clinicId } = useAuth();
  const [open, setOpen] = useState(false);
  const [radiologyImages, setRadiologyImages] = useState<RadiologyImage[]>([]);

  useEffect(() => {
    if (!open || !clinicId) return;
    try {
      const images = getRadiologyImages(clinicId, patient.id);
      setRadiologyImages(images);
    } catch (err) {
      console.error('Failed to load radiology images', err);
      setRadiologyImages([]);
    }
  }, [open, clinicId, patient.id]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error('print error', e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [open]);

  const chartState = (patient.dentalChart ?? {}) as DentalChartState;
  const dentalRows = patient.dentalRows ?? [];

  const totalPrice = dentalRows.reduce((sum, r) => sum + Number(r.price ?? 0), 0);
  const totalPaid = dentalRows.reduce((sum, r) => sum + Number(r.payment ?? 0), 0);
  const totalRemaining = totalPrice - totalPaid;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
      >
        <Printer className="w-3.5 h-3.5" />
        طباعة الخطة العلاجية
      </button>

      {open && (
        <>
          {/* زرار إغلاق ظاهر على الشاشة بس مش بيتطبع */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="print:hidden fixed top-4 left-4 z-[60] bg-slate-800 hover:bg-slate-900 text-white rounded-full p-2 shadow-lg"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="print-treatment-plan fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">
            {/* ── صفحة 1 ── */}
            <div className="print-page p-8" style={{ minHeight: '100vh' }}>
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-5">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">الخطة العلاجية</h1>
                  <p className="text-xs text-slate-500 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{patient.fullName}</p>
                  <p className="text-xs text-slate-500">ملف #{patient.fileNumber} · {patient.phoneNumber}</p>
                </div>
              </div>

              {/* مخطط الأسنان */}
              <h2 className="text-sm font-bold text-slate-700 mb-2">مخطط الأسنان</h2>
              <div className="border border-slate-300 rounded-xl p-4 mb-6">
                <div style={{ minWidth: 480 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                    <span style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{QUADRANTS[0].label}</span>
                    <span style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{QUADRANTS[1].label}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, paddingRight: 8, borderRight: '2px dashed #cbd5e1' }}>
                      {QUADRANTS[0].teeth.map(({ fdi, display }) => (
                        <PrintToothBox key={fdi} display={display} state={getToothState(chartState, fdi, display, QUADRANTS[0].quadrant)} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 4, paddingLeft: 8 }}>
                      {QUADRANTS[1].teeth.map(({ fdi, display }) => (
                        <PrintToothBox key={fdi} display={display} state={getToothState(chartState, fdi, display, QUADRANTS[1].quadrant)} />
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '2px dashed #cbd5e1', margin: '10px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, paddingRight: 8, borderRight: '2px dashed #cbd5e1' }}>
                      {QUADRANTS[2].teeth.map(({ fdi, display }) => (
                        <PrintToothBox key={fdi} display={display} state={getToothState(chartState, fdi, display, QUADRANTS[2].quadrant)} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 4, paddingLeft: 8 }}>
                      {QUADRANTS[3].teeth.map(({ fdi, display }) => (
                        <PrintToothBox key={fdi} display={display} state={getToothState(chartState, fdi, display, QUADRANTS[3].quadrant)} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    <span style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{QUADRANTS[2].label}</span>
                    <span style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{QUADRANTS[3].label}</span>
                  </div>
                </div>

                {/* وسيلة الإيضاح */}
                <div className="flex flex-wrap gap-4 mt-4 text-[10px]">
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ffffff', border: '1px solid #94a3b8', borderRadius: 2, marginLeft: 4 }} />سليم</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginLeft: 4 }} />علاج مطلوب</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fbbf24', borderRadius: 2, marginLeft: 4 }} />قيد العلاج</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginLeft: 4 }} />تم العلاج</span>
                </div>
              </div>

              {/* جدول تفصيلي للأسنان والجلسات */}
              <h2 className="text-sm font-bold text-slate-700 mb-2">تفاصيل العلاج والجلسات</h2>
              <table className="w-full text-xs border-collapse mb-6">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2 py-1.5">التاريخ</th>
                    <th className="border border-slate-300 px-2 py-1.5">السن</th>
                    <th className="border border-slate-300 px-2 py-1.5">التشخيص</th>
                    <th className="border border-slate-300 px-2 py-1.5">الإجراء</th>
                    <th className="border border-slate-300 px-2 py-1.5">السعر</th>
                    <th className="border border-slate-300 px-2 py-1.5">المدفوع</th>
                    <th className="border border-slate-300 px-2 py-1.5">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {dentalRows.length === 0 ? (
                    <tr><td colSpan={7} className="border border-slate-300 px-2 py-3 text-center text-slate-400">لا توجد سجلات علاج</td></tr>
                  ) : (
                    dentalRows.map((r) => (
                      <tr key={r.id}>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">{r.date}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">{r.toothNo}</td>
                        <td className="border border-slate-300 px-2 py-1.5">{r.diagnosis || '—'}</td>
                        <td className="border border-slate-300 px-2 py-1.5">{r.treatmentProcedure || '—'}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">₪ {Number(r.price ?? 0).toLocaleString('ar')}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">₪ {Number(r.payment ?? 0).toLocaleString('ar')}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">₪ {Number(r.remainingAmount ?? 0).toLocaleString('ar')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* الملخص المالي */}
              <h2 className="text-sm font-bold text-slate-700 mb-2">الملخص المالي</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2 py-1.5">إجمالي التكلفة</th>
                    <th className="border border-slate-300 px-2 py-1.5">إجمالي المدفوع</th>
                    <th className="border border-slate-300 px-2 py-1.5">إجمالي المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold">₪ {totalPrice.toLocaleString('ar')}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold text-emerald-700">₪ {totalPaid.toLocaleString('ar')}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold text-red-700">₪ {totalRemaining.toLocaleString('ar')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── صفحة 2 — صور الأشعة ── */}
            <div className="print-page p-8" style={{ minHeight: '100vh', pageBreakBefore: 'always' }}>
              <h2 className="text-base font-bold text-slate-800 border-b-2 border-slate-800 pb-3 mb-5">
                الصور الشعاعية — {patient.fullName}
              </h2>
              {radiologyImages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10">لا توجد صور أشعة مرفوعة لهذا المريض</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {radiologyImages.map((img) => {
                    // imageData is the primary field used elsewhere in the app
                    const src = (img as any).imageData ?? (img as any).url ?? (img as any).imageUrl ?? '';
                    return (
                      <div key={img.id} className="border border-slate-300 rounded-xl p-2">
                        <img
                          src={src}
                          alt={img.description ?? 'صورة أشعة'}
                          style={{ width: '100%', height: 220, objectFit: 'contain', background: '#f8fafc' }}
                        />
                        <p className="text-[10px] text-slate-500 mt-1 text-center">
                          {new Date(img.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CSS الطباعة: بيخفي كل حاجة في الصفحة عدا منطقة الطباعة */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-treatment-plan, .print-treatment-plan * { visibility: visible; }
          .print-treatment-plan { position: absolute; inset: 0; width: 100%; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
      `}</style>
    </>
  );
}
