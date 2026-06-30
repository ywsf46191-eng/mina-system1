import { useState } from 'react';
import { ToothModal } from './ToothModal';
import type { DentalChartState, ToothState } from '../../types';
import { resolveVisualStatus } from '../../lib/teeth';

interface Props {
  chartState: DentalChartState;
  onChange: (newState: DentalChartState) => void;
}

/* FDI quadrant definitions — display number shown on button (1-8) */
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

// map quadrant code -> secretary location key used in AddPatientForm
const QUADRANT_TO_LOCATION: Record<string, string> = {
  Q1: 'upper-right',
  Q2: 'upper-left',
  Q3: 'lower-left',
  Q4: 'lower-right',
};

function ToothButton({
  fdi, display, state, onClick,
}: {
  fdi: string;
  display: number;
  state: ToothState | undefined;
  onClick: () => void;
}) {
  const status = resolveVisualStatus(state);
  const colors = {
    none: 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:border-blue-400',
    treatment: 'bg-red-500 border-red-600 text-white shadow-red-100 shadow-md',
    inprogress: 'bg-amber-400 border-amber-500 text-white shadow-amber-100 shadow-md',
    done: 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-100 shadow-md',
  };

  const totalSessions = state?.totalSessions ?? 0;
  const completedCount = Array.isArray(state?.completedSessions) ? state!.completedSessions!.length : 0;
  const sessionBadge = totalSessions > 0 ? `${completedCount}/${totalSessions}` : null;

  const tooltipExtraParts: string[] = [];
  if (state?.diagnosis) tooltipExtraParts.push(state.diagnosis);
  if (state?.notes) tooltipExtraParts.push(state.notes);
  if (totalSessions > 0) tooltipExtraParts.push(`جلسات: ${sessionBadge}`);
  const title = `السن ${fdi}${tooltipExtraParts.length > 0 ? ' — ' + tooltipExtraParts.join(' • ') : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 text-xs font-bold transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${colors[status]}`}
    >
      <span>{display}</span>
      {sessionBadge && (
        <span className="absolute -top-2 -right-2 text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none shadow-md">
          {sessionBadge}
        </span>
      )}
    </button>
  );
}

export function DentalChart({ chartState, onChange }: Props) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  // Try to resolve the ToothState for a displayed tooth (FDI). Support two storage shapes:
  // 1) chartState keyed by FDI (existing doctor saves), e.g. '11', '12', ...
  // 2) chartState keyed by secretary convention 'location_toothNo' e.g. 'upper-right_1'
  //
  // ملاحظة مهمة: تم حذف أي "تخمين" (loose match) كان بيدور على أي مفتاح بينتهي بنفس
  // رقم السن بغض النظر عن الفك، لأن ده كان بيخلي مثلاً السن 4 في كل الأفكاك الأربعة
  // ياخد نفس حالة العلاج لو سن واحد بس اتسجل (مثال: "upper-right_4" كان بيتطابق غلط
  // مع "upper-left_4" و"lower-right_4" و"lower-left_4"). المطابقة دلوقتي محصورة فقط
  // بمفتاح الـ FDI الصريح أو بمفتاح location_display الخاص بنفس الفك بالظبط.
  const getState = (fdi: string, display: number, quadrantCode: string): ToothState | undefined => {
    // prefer explicit FDI key
    if (chartState[fdi]) return chartState[fdi];

    // fallback to secretary key by quadrant + display number (exact match only)
    const loc = QUADRANT_TO_LOCATION[quadrantCode];
    if (loc) {
      const key = `${loc}_${display}`;
      if (chartState[key]) return chartState[key];
    }

    return undefined;
  };

  const handleSave = (toothId: string, state: ToothState) => {
    // Save under the FDI key the doctor interacts with (keeps display consistent).
    onChange({ ...chartState, [toothId]: state });
  };

  const treated = Object.values(chartState).filter((s) => resolveVisualStatus(s) === 'done').length;
  const planned = Object.values(chartState).filter((s) => resolveVisualStatus(s) === 'treatment').length;
  const inProgress = Object.values(chartState).filter((s) => resolveVisualStatus(s) === 'inprogress').length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500" />
          <span className="text-slate-500 dark:text-slate-400">سليم</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-red-500 border-2 border-red-600" />
          <span className="text-slate-600 dark:text-slate-300">علاج مطلوب ({planned})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-amber-400 border-2 border-amber-500" />
          <span className="text-slate-600 dark:text-slate-300">قيد العلاج ({inProgress})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-emerald-500 border-2 border-emerald-600" />
          <span className="text-slate-600 dark:text-slate-300">تم العلاج ({treated})</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[540px]">

          {/* Quadrant labels row */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[QUADRANTS[0], QUADRANTS[1]].map((q) => (
              <div key={q.quadrant} className="text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{q.label}</span>
              </div>
            ))}
          </div>

          {/* Upper jaw */}
          <div className="grid grid-cols-2 gap-0">
            {/* Q1 — upper right (displayed right-to-left: 8 toward center 1) */}
            <div className="flex justify-end gap-1 pr-2 border-r-2 border-dashed border-slate-300 dark:border-slate-600">
              {QUADRANTS[0].teeth.map(({ fdi, display }) => (
                <ToothButton
                  key={fdi}
                  fdi={fdi}
                  display={display}
                  state={getState(fdi, display, QUADRANTS[0].quadrant)}
                  onClick={() => setSelectedTooth(fdi)}
                />
              ))}
            </div>
            {/* Q2 — upper left (displayed left-to-right: 1 toward outside 8) */}
            <div className="flex justify-start gap-1 pl-2">
              {QUADRANTS[1].teeth.map(({ fdi, display }) => (
                <ToothButton
                  key={fdi}
                  fdi={fdi}
                  display={display}
                  state={getState(fdi, display, QUADRANTS[1].quadrant)}
                  onClick={() => setSelectedTooth(fdi)}
                />
              ))}
            </div>
          </div>

          {/* Center divider */}
          <div className="my-3 flex items-center gap-2">
            <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">خط الوسط</span>
            <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
          </div>

          {/* Lower jaw */}
          <div className="grid grid-cols-2 gap-0">
            {/* Q4 — lower right */}
            <div className="flex justify-end gap-1 pr-2 border-r-2 border-dashed border-slate-300 dark:border-slate-600">
              {QUADRANTS[2].teeth.map(({ fdi, display }) => (
                <ToothButton
                  key={fdi}
                  fdi={fdi}
                  display={display}
                  state={getState(fdi, display, QUADRANTS[2].quadrant)}
                  onClick={() => setSelectedTooth(fdi)}
                />
              ))}
            </div>
            {/* Q3 — lower left */}
            <div className="flex justify-start gap-1 pl-2">
              {QUADRANTS[3].teeth.map(({ fdi, display }) => (
                <ToothButton
                  key={fdi}
                  fdi={fdi}
                  display={display}
                  state={getState(fdi, display, QUADRANTS[3].quadrant)}
                  onClick={() => setSelectedTooth(fdi)}
                />
              ))}
            </div>
          </div>

          {/* Lower quadrant labels */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[QUADRANTS[2], QUADRANTS[3]].map((q) => (
              <div key={q.quadrant} className="text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTooth && (
        <ToothModal
          toothId={selectedTooth}
          state={getState(selectedTooth, 1, 'Q1') ?? { diagnosis: '', amount: 0, treatmentStatus: 'none' }}
          onSave={handleSave}
          onClose={() => setSelectedTooth(null)}
        />
      )}
    </div>
  );
}
