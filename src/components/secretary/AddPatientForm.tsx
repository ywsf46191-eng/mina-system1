import { useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { createPatient } from '../../firebase/firestoreService';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { Patient, ToothState } from '../../types';
import { PhoneInput } from '../shared/PhoneInput';

const uuidv4 = () => crypto.randomUUID();

const dentalRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  toothNo: z.string(), // '1'..'8'
  location: z.enum(['upper-right', 'upper-left', 'lower-right', 'lower-left']).default('upper-right'),
  diagnosis: z.string().optional().default(''),
  treatmentProcedure: z.string().optional().default(''),
  price: z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  payment: z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  remainingAmount: z.number().default(0),
  totalSessions: z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  completedSessions: z.preprocess((v) => (Array.isArray(v) ? v : (v === '' || v == null ? 0 : Number(v))), z.union([z.number(), z.array(z.number())]).default(0)),
  sessionNotes: z.string().optional().default(''),
  nextAppointmentDate: z.string().optional().default(''),
});

const schema = z.object({
  // preprocess trim then coerce to number — but keep validation robust
  fileNumber: z.preprocess((val) => {
    if (typeof val === 'string') {
      const t = val.trim();
      return t === '' ? undefined : Number(t);
    }
    return val;
  }, z.number({ invalid_type_error: 'رقم الملف مطلوب ويجب أن يكون رقمًا', required_error: 'رقم الملف مطلوب' }).min(1, 'يجب أن يكون رقم الملف أكبر من صفر')),
  fullName: z.string().min(2, 'الاسم الثلاثي مطلوب'),
  gender: z.enum(['male', 'female']),
  phoneNumber: z.string().min(1, 'رقم الجوال مطلوب'),
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
        className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
    />
  );
}

export default function AddPatientForm({ onSuccess }: Props) {
  const { clinicId, currentUser } = useAuth();
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      // fileNumber left undefined — Controller will manage
      fullName: '',
      gender: 'male',
      phoneNumber: '',
      backupPhoneNumber: '',
      isSmoker: false,
      pregnancyOrBreastfeeding: false,
      dentalRows: [],
    } as any,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'dentalRows' });

  const gender = watch('gender');
  const isSmoker = watch('isSmoker');
  const pregnancy = watch('pregnancyOrBreastfeeding');

  const addRow = useCallback(() => {
    append({
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      toothNo: '1',
      location: 'upper-right',
      diagnosis: '',
      treatmentProcedure: '',
      price: 0,
      payment: 0,
      remainingAmount: 0,
      totalSessions: 0,
      completedSessions: 0,
      sessionNotes: '',
      nextAppointmentDate: '',
    } as any);
  }, [append]);

  const onSubmit = async (data: FormData) => {
    if (!clinicId) {
      alert('تعذّر حفظ المريض: حسابك غير مرتبط بأي عيادة (clinicId فارغ).');
      return;
    }

    // fileNumber already coerced by zod; be defensive:
    const fileNumberNum = (data as any).fileNumber ?? NaN;
    if (!Number.isFinite(fileNumberNum)) {
      alert('رقم الملف غير صالح');
      return;
    }

    // process dental rows
    const processedDentalRows = (data.dentalRows || []).map((row: any) => {
      const p = Number(row.price) || 0;
      const pay = Number(row.payment) || 0;
      const totalSessions = Number(row.totalSessions) || 0;
      const completedSessions = Array.isArray(row.completedSessions) ? row.completedSessions : (Number(row.completedSessions) ? [Number(row.completedSessions)] : []);
      const remaining = Math.max(0, p - pay);
      return {
        ...row,
        price: p,
        payment: pay,
        remainingAmount: remaining,
        totalSessions,
        completedSessions,
        sessionNotes: row.sessionNotes ?? '',
        nextAppointmentDate: row.nextAppointmentDate ?? '',
      };
    });

    // build dentalChart
    // ملاحظة: لازم نتجنب أي قيمة undefined هنا لأن Firestore بيرفضها،
    // فبدل undefined بنستخدم قيم افتراضية محايدة (null / '' / [] / false)
    const dentalChart: Record<string, ToothState> = {};
    processedDentalRows.forEach((r: any) => {
      const key = `${r.location}_${r.toothNo}`;
      const sessionsArray = Array.isArray(r.completedSessions) ? r.completedSessions : [];
      const status = (r.payment >= r.price && r.price > 0) ? 'done' : (r.price > 0 ? 'treatment' : 'none');

      dentalChart[key] = {
        diagnosis: r.diagnosis ?? '',
        amount: r.price ?? 0,
        treatmentStatus: status,
        totalSessions: r.totalSessions > 0 ? r.totalSessions : null,
        completedSessions: sessionsArray.length > 0 ? sessionsArray : [],
        sessionNotes: r.sessionNotes ? { last: r.sessionNotes } : null,
        notes: r.treatmentProcedure ?? '',
        status: status === 'done' ? 'done' : null,
        workedOn: r.price > 0 || Boolean(r.diagnosis || r.treatmentProcedure),
      } as ToothState;
    });

    const patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
      clinicId,
      fileNumber: fileNumberNum,
      fullName: (data as any).fullName,
      gender: data.gender,
      phoneNumber: (data as any).phoneNumber ?? '',
      backupPhoneNumber: data.backupPhoneNumber ?? '',
      chronicDiseases: data.chronicDiseases ?? '',
      pastSurgeries: data.pastSurgeries ?? '',
      currentMedications: data.currentMedications ?? '',
      allergies: data.allergies ?? '',
      isSmoker: data.isSmoker ?? false,
      pregnancyOrBreastfeeding: data.pregnancyOrBreastfeeding ?? false,
      periodDetails: data.periodDetails ?? '',
      dentalRows: processedDentalRows.map((r: any) => ({
        id: r.id,
        date: r.date,
        toothNo: `${r.location}_${r.toothNo}`,
        diagnosis: r.diagnosis ?? '',
        treatmentProcedure: r.treatmentProcedure ?? '',
        price: r.price,
        payment: r.payment,
        remainingAmount: r.remainingAmount,
      })),
      dentalChart,
      nextAppointmentDate: processedDentalRows.find((r: any) => r.nextAppointmentDate)?.nextAppointmentDate ?? '',
      nextAppointmentTime: '',
      // تم حذف lastEditedBy / lastEditedAt من هنا نهائيًا — كانت undefined وده يسبب رفض Firestore.
      // لو حابب تسجّل آخر شخص عدّل الملف، الأفضل إضافتها داخل createPatient نفسها
      // باستخدام currentUser?.uid بدل ما تُترك فاضية هنا، مثال:
      // lastEditedBy: currentUser?.uid ?? null,
      // lastEditedAt: new Date().toISOString(),
      createdAt: '',
      updatedAt: '',
    };

    try {
      const id = await createPatient(patientData);
      setSaved(true);
      onSuccess?.(id);
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('حدث خطأ أثناء حفظ المريض. راجع Console.');
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
            <Controller
              control={control}
              name="fileNumber" as any
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="001"
                  inputMode="numeric"
                  error={errors?.fileNumber?.message as string | undefined}
                />
              )}
            />
          </div>

          <div>
            <Label>الاسم الثلاثي</Label>
            <Controller
              control={control}
              name="fullName" as any
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="محمد أحمد العلي"
                  error={errors?.fullName?.message as string | undefined}
                />
              )}
            />
          </div>

          <div>
            <Label>الجنس</Label>
            <div className="flex gap-4 mt-2">
              {(['male', 'female'] as const).map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={g}
                    {...{ onChange: (e: any) => setValue('gender' as any, e.target.value), checked: gender === g }}
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
              name="phoneNumber" as any
              render={({ field }) => (
                <PhoneInput value={field.value ?? ''} onChange={field.onChange} error={errors?.phoneNumber?.message as string | undefined} />
              )}
            />
          </div>

          <div>
            <Label>رقم جوال احتياطي</Label>
            <Controller
              control={control}
              name="backupPhoneNumber" as any
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
            <Textarea {...{ onChange: (e: any) => setValue('chronicDiseases' as any, e.target.value), value: watch('chronicDiseases') as any }} placeholder="اذكر الأمراض إن وجدت..." />
          </div>

          <div>
            <Label>هل أجريت عملية جراحية؟</Label>
            <Textarea {...{ onChange: (e: any) => setValue('pastSurgeries' as any, e.target.value), value: watch('pastSurgeries') as any }} placeholder="اذكر العمليات إن وجدت..." />
          </div>

          <div>
            <Label>هل تأخذ أي أدوية؟</Label>
            <Textarea {...{ onChange: (e: any) => setValue('currentMedications' as any, e.target.value), value: watch('currentMedications') as any }} placeholder="اذكر الأدوية إن وجدت..." />
          </div>

          <div>
            <Label>هل هناك حساسية؟</Label>
            <Textarea {...{ onChange: (e: any) => setValue('allergies' as any, e.target.value), value: watch('allergies') as any }} placeholder="اذكر الحساسية إن وجدت..." />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">هل أنت مدخن؟</span>
              <button type="button" onClick={() => setValue('isSmoker' as any, !isSmoker)} className={`relative w-12 h-6 rounded-full transition-colors ${isSmoker ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSmoker ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {gender === 'female' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">هل أنتِ حامل أو مرضع؟</span>
                  <button type="button" onClick={() => setValue('pregnancyOrBreastfeeding' as any, !pregnancy)} className={`relative w-12 h-6 rounded-full transition-colors ${pregnancy ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pregnancy ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {pregnancy && (
                  <div>
                    <Label>يرجى تحديد الفترة</Label>
                    <Input {...{ onChange: (e: any) => setValue('periodDetails' as any, e.target.value), value: watch('periodDetails') as any }} placeholder="مثال: الشهر الخامس من الحمل" />
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
                {[
                  'التاريخ', 'رقم السن', 'المكان', 'التشخيص', 'الإجراء', 'الجلسات (مجموع/مكتملة)',
                  'ملاحظات الجلسات', 'الموعد القادم', 'السعر', 'الدفعة', 'المتبقي', ''].map((h) => (
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
                      <input type="date" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.date` as any, e.target.value), value: watch(`dentalRows.${idx}.date`) as any }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-36" />
                    </td>

                    <td className="px-2 py-2">
                      <select {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.toothNo` as any, e.target.value), value: watch(`dentalRows.${idx}.toothNo`) as any }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-20">
                        {Array.from({ length: 8 }, (_, i) => (i + 1).toString()).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>

                    <td className="px-2 py-2">
                      <select {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.location` as any, e.target.value), value: watch(`dentalRows.${idx}.location`) as any }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32">
                        <option value="upper-right">فك علوي أيمن</option>
                        <option value="upper-left">فك علوي أيسر</option>
                        <option value="lower-right">فك سفلي أيمن</option>
                        <option value="lower-left">فك سفلي أيسر</option>
                      </select>
                    </td>

                    <td className="px-2 py-2">
                      <input {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.diagnosis` as any, e.target.value), value: watch(`dentalRows.${idx}.diagnosis`) as any }} placeholder="تشخيص..." className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32" />
                    </td>

                    <td className="px-2 py-2">
                      <input {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.treatmentProcedure` as any, e.target.value), value: watch(`dentalRows.${idx}.treatmentProcedure`) as any }} placeholder="إجراء..." className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32" />
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.totalSessions` as any, Number(e.target.value)), value: watch(`dentalRows.${idx}.totalSessions`) as any }} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <span className="text-xs text-slate-400">/</span>
                        <input type="number" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.completedSessions` as any, Number(e.target.value)), value: watch(`dentalRows.${idx}.completedSessions`) as any }} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </td>

                    <td className="px-2 py-2">
                      <input {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.sessionNotes` as any, e.target.value), value: watch(`dentalRows.${idx}.sessionNotes`) as any }} placeholder="ملاحظات الجلسة..." className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-40" />
                    </td>

                    <td className="px-2 py-2">
                      <input type="date" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.nextAppointmentDate` as any, e.target.value), value: watch(`dentalRows.${idx}.nextAppointmentDate`) as any }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-36" />
                    </td>

                    <td className="px-2 py-2">
                      <input type="number" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.price` as any, Number(e.target.value)), value: watch(`dentalRows.${idx}.price`) as any }} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-24" />
                    </td>

                    <td className="px-2 py-2">
                      <input type="number" {...{ onChange: (e: any) => setValue(`dentalRows.${idx}.payment` as any, Number(e.target.value)), value: watch(`dentalRows.${idx}.payment`) as any }} placeholder="0" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-24" />
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
                  <td colSpan={12} className="text-center py-8 text-slate-400 text-sm">
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
