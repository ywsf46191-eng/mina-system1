import type { Patient, Payment } from '../types';

export interface PatientFinance {
  totalDue: number;
  totalPaid: number;
  remaining: number;
}

/** Single source of truth for a patient's financials, shared by the doctor's
 *  file view and the secretary's finance page so the numbers always match.
 *  - Due  = sum of dental-chart tooth amounts + legacy dentalRows prices
 *  - Paid = secretary-recorded payments (dc_payments) + legacy dentalRows payments */
export function computePatientFinance(patient: Patient, payments: Payment[] = []): PatientFinance {
  const chartDue = Object.values(patient.dentalChart ?? {}).reduce(
    (s, t) => s + Number(t.amount ?? 0),
    0,
  );
  const rowsDue = (patient.dentalRows ?? []).reduce((s, r) => s + Number(r.price ?? 0), 0);
  const totalDue = chartDue + rowsDue;

  const rowsPaid = (patient.dentalRows ?? []).reduce((s, r) => s + Number(r.payment ?? 0), 0);
  const recordedPaid = payments
    .filter((p) => p.patientId === patient.id)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalPaid = rowsPaid + recordedPaid;

  return { totalDue, totalPaid, remaining: totalDue - totalPaid };
}
