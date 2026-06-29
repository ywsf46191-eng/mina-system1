import type { ToothState } from '../types';

/** Visual status used for coloring teeth. 'inprogress' (yellow) is derived,
 *  not stored: a tooth under treatment with some — but not all — sessions done. */
export type VisualToothStatus = 'none' | 'treatment' | 'inprogress' | 'done';

const ORDINALS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن'];

const QUADRANT_SIDE: Record<string, string> = {
  '1': 'علوي أيمن',
  '2': 'علوي أيسر',
  '3': 'سفلي أيسر',
  '4': 'سفلي أيمن',
};

/** Human-readable Arabic description of an FDI tooth code for the secretary,
 *  e.g. '21' → 'القسم الثاني · السن الأول (علوي أيسر)'. */
export function describeTooth(fdi: string): string {
  if (!/^[1-4][1-8]$/.test(fdi)) return `السن ${fdi}`;
  const q = Number(fdi[0]);
  const n = Number(fdi[1]);
  return `القسم ${ORDINALS[q]} · السن ${ORDINALS[n]} (${QUADRANT_SIDE[String(q)]})`;
}

/** Short label, e.g. '21' → 'ق٢ · س١' for compact UI. */
export function shortToothLabel(fdi: string): string {
  if (!/^[1-4][1-8]$/.test(fdi)) return fdi;
  return `ق${fdi[0]} · س${fdi[1]}`;
}

function storedStatus(state: ToothState | undefined): 'none' | 'treatment' | 'done' {
  if (!state) return 'none';
  if (state.treatmentStatus && state.treatmentStatus !== 'none') return state.treatmentStatus;
  if (state.status && state.status !== 'none') return state.status;
  if (state.workedOn) return 'done';
  return 'none';
}

/** Resolve the visual status of a tooth, including the derived yellow
 *  'inprogress' state when treatment has started but not all sessions are done. */
export function resolveVisualStatus(state: ToothState | undefined): VisualToothStatus {
  const stored = storedStatus(state);
  if (stored === 'done') return 'done';
  if (stored === 'treatment') {
    const total = state?.totalSessions ?? 1;
    const done = state?.completedSessions?.length ?? 0;
    if (total > 0 && done >= total) return 'done';
    if (done > 0) return 'inprogress';
    return 'treatment';
  }
  return 'none';
}
