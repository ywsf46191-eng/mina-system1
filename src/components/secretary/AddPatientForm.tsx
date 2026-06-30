import { useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { createPatient } from '../../firebase/firestoreService';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { Patient } from '../../types';
import { PhoneInput } from '../shared/PhoneInput';

const uuidv4 = () => crypto.randomUUID();

const dentalRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  toothNo: z.string(),
  diagnosis: z.string(),
  treatmentProcedure: z.string(),
  price: z.coerce.number().min(0).default(0),
  payment: z.coerce.number().min(0).default(0),
  remainingAmount: z.number().default(0),
});

const schema = z.object({
  fileNumber: z.coerce.number().min(1, 'رقم الملف مطلوب'),
  fullName: z.string().min(2, 'الاسم الثلاثي مطلوب'),
  gender: z.enum(['male', 'female']),
  phoneNumber: z.string().min(9, 'رقم الجوال مطلوب'),
  backupPhoneNumber: z.string().optional().default(''),
  chronicDiseases: z.string().optional().default(''),
  pastSurgeries: z.string().optional().default(''),
  currentMedications: z.string().optional().default(''),
  allergies: z.string().optional().default(''),
  isSmoker: z.boolean().default(false),
  pregnancyOrBreastfeeding: z.boolean().default(false),
  periodDetails: z.string().optional().default(''),
  dentalRows: z.array(dentalRowSchema).default([]),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: (patientId: string) => void;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition"
      >
        <span className="font-semibold text-slate-700">{title}</span>
        {open ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      {open && <div className="px-6 py-5">{children}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-600 mb-1">{children}</label>;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

function Input({ error, ...props }: InputProps) {
  return (
    <div>
      <input
        {...props}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${error ? 'border-red-300' : 'border-slate-200'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function AddPatientForm({ onSuccess }: Props) {
  const { clinicId } = useAuth();
  const [saved, setSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fileNumber: undefined,
      fullName: '',
      gender: 'male',
      phoneNumber: '',
      backupPhoneNumber: '',
      isSmoker: false,
      pregnancyOrBreastfeeding: false,
      dentalRows: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'dentalRows' });

  const gender = watch('gender');
  const isSmoker = watch('isSmoker');
  const pregnancy = watch('pregnancyOrBreastfeeding');

  const addRow = useCallback(() => {
    append({
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      toothNo: '',
      diagnosis: '',
      treatmentProcedure: '',
      price: 0,
      payment: 0,
      remainingAmount: 0,
    });
  }, [append]);

  const onSubmit = async (data: FormData) => {
    if (!clinicId) return;

    // حساب المبلغ المتبقي لكل صف قبل الحفظ الفعلي
    const processedDentalRows = (data.dentalRows || []).map((row) => {
      const p = Number(row.price) || 0;
      const pay = Number(row.payment) || 0;
      return {
        ...row,
        price: p,
        payment: pay,
        remainingAmount: p - pay,
      };
    });

    const patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      clinicId,
      backupPhoneNumber: data.backupPhoneNumber ?? '',
      chronicDiseases: data.chronicDiseases ?? '',
      pastSurgeries: data.pastSurgeries ?? '',
      currentMedications: data.currentMedications ?? '',
      allergies: data.allergies ?? '',
      periodDetails: data.periodDetails ?? '',
      nextAppointmentDate: '',
      nextAppointmentTime: '',
      dentalRows: processedDentalRows,
    };

    try {
      const id = await createPatient(patientData);
      setSaved(true);
      onSuccess?.(id);
    } catch (error) {
      console.error("Error creating patient:", error);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Save className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">تم حفظ ملف المريض بنجاح</h2>
        <button
          onClick={() => setSaved(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition"
        >
          إضافة مريض جديد
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      {/* Section 1 — Basic Info */}
      <Section title="معلومات الملف">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>رقم الملف</Label>
            <Input type="number" {...register('fileNumber')} placeholder="001" error={errors.fileNumber?.message} />
          </div>
          <div>
            <Label>الاسم الثلاثي</Label>
            <Input {...register('fullName')} placeholder="محمد أحمد العلي" error={errors.fullName?.message} />
          </div>
          <div>
            <Label>الجنس</Label>
            <div className="flex gap-4 mt-2">
              {((['male', 'female'] as const)).map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={g}
                    {...register('gender')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{g === 'male' ? 'ذكر' : 'أنثى'}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>رقم الجوال</Label>
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field }) => (
                <PhoneInput value={field.value ?? ''} onChange={field.onChange} error={errors.phoneNumber?.message} />
              )}
            />
          </div>
          <div>
            <Label>رقم جوال احتياطي</Label>
            <Controller
              control={control}
              name="backupPhoneNumber"
              render={({ field }) => (
                <PhoneInput value={field.value ?? ''} onChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </Section>

      {/* Section 2 — Medical History */}
      <Section title="التاريخ الطبي">
        <div className="space-y-4">
          <div>
            <Label>هل هناك أمراض مزمنة أو طارئة؟</Label>
            <Textarea {...register('chronicDiseases')} placeholder="اذكر الأمراض إن وجدت..." />
          </div>
          <div>
            <Label>هل أجريت عملية جراحية؟</Label>
            <Textarea {...register('pastSurgeries')} placeholder="اذكر العمليات إن وجدت..." />
          </div>
          <div>
            <Label>هل تأخذ أي أدوية؟</Label>
            <Textarea {...register('currentMedications')} placeholder="اذكر الأدوية إن وجدت..." />
          </div>
          <div>
            <Label>هل هناك حساسية؟</Label>
            <Textarea {...register('allergies')} placeholder="اذكر الحساسية إن وجدت..." />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <Toggle
              value={isSmoker}
              onChange={(v) => setValue('isSmoker', v)}
              label="هل أنت مدخن؟"
            />

            {gender === 'female' && (
              <div className="space-y-3">
                <Toggle
                  value={pregnancy}
                  onChange={(v) => setValue('pregnancyOrBreastfeeding', v)}
                  label="هل أنتِ حامل أو مرضع؟"
                />
                {pregnancy && (
                  <div>
                    <Label>يرجى تحديد الفترة</Label>
                    <Input {...register('periodDetails')} placeholder="مثال: الشهر الخامس من الحمل" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Section 3 — Dental Follow-up */}
      <Section title="جدول متابعة الأسنان">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['التاريخ', 'رقم السن', 'التشخيص', 'إجراء العلاج', 'السعر', 'الدفعة', 'المتبقي', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, idx) => {
                const price = watch(`dentalRows.${idx}.price`) || 0;
                const payment = watch(`dentalRows.${idx}.payment`) || 0;
                const remaining = Number(price) - Number(payment);
                return (
                  <tr key={field.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2">
                      <input type="date" {...register(`dentalRows.${idx}.date`)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" />
                    </td>
                    <td className="px-2 py-2">
                      <input {...register(`dentalRows.${idx}.toothNo`)} placeholder="18" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-20" />
                    </td>
                    <td className="px-2 py-2">
                      <input {...register(`dentalRows.${idx}.diagnosis`)} placeholder="تشخيص..." className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-32" />
                    </td>
                    <td className="px-2 py-2">
                      <input {...register(`dentalRows.${idx}.treatmentProcedure`)} placeholder="إجراء..." className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-32" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" {...register(`dentalRows.${idx}.price`)} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-24" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" {...register(`dentalRows.${idx}.payment`)} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-24" />
                    </td>
                    <td className="px-2 py-2">
                      <span className={`font-medium text-xs px-2 py-1 rounded-lg ${remaining > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        ₪ {remaining.toLocaleString('ar')}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {fields.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                    لا توجد صفوف — اضغط "إضافة صف" لإضافة سجل علاج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          إضافة صف
        </button>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl transition"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          حفظ ملف المريض
        </button>
      </div>
    </form>
  );
}
