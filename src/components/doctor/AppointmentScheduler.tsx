import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarDays, Clock, CheckCircle } from 'lucide-react';
import { updatePatient } from '../../firebase/firestoreService';
import type { Patient } from '../../types';

interface Props {
  patient: Patient;
  onUpdated: (data: Partial<Patient>) => void;
}

interface FormData {
  nextAppointmentDate: string;
  nextAppointmentTime: string;
}

export function AppointmentScheduler({ patient, onUpdated }: Props) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      nextAppointmentDate: patient.nextAppointmentDate,
      nextAppointmentTime: patient.nextAppointmentTime,
    },
  });

  const onSubmit = async (data: FormData) => {
    await updatePatient(patient.id, data);
    onUpdated(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-semibold">تم اضافة الموعد بنجاح</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
            <CalendarDays className="w-4 h-4" />
            تاريخ الموعد القادم
          </label>
          <input
            type="date"
            {...register('nextAppointmentDate')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
            <Clock className="w-4 h-4" />
            وقت الموعد
          </label>
          <input
            type="time"
            {...register('nextAppointmentTime')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl transition text-sm"
      >
        {isSubmitting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <CalendarDays className="w-4 h-4" />
        )}
        {saved ? 'تم الحفظ!' : 'حفظ الموعد'}
      </button>
    </form>
  );
}
