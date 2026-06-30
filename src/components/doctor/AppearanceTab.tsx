import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getClinicSettings, saveClinicSettings } from '../../firebase/firestoreService';
import { ImagePlus, Trash2, Save, CheckCircle, Loader2 } from 'lucide-react';

export default function AppearanceTab() {
  const { clinicId } = useAuth();
  const [bgImage, setBgImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clinicId) { setLoading(false); return; }
    getClinicSettings(clinicId).then(s => {
      setBgImage(s.backgroundImage ?? '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clinicId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);

    // Resize + convert to base64 to avoid CORS issues with Firebase Storage
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1600;
        let { width, height } = img;
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.82);
        setBgImage(base64);
        setProcessing(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      await saveClinicSettings(clinicId, { backgroundImage: bgImage });
      window.dispatchEvent(new CustomEvent('clinic-bg-changed', { detail: bgImage }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('إزالة صورة الخلفية؟')) return;
    setBgImage('');
    if (!clinicId) return;
    await saveClinicSettings(clinicId, { backgroundImage: '' });
    window.dispatchEvent(new CustomEvent('clinic-bg-changed', { detail: '' }));
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-5" dir="rtl">
      <div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">صورة خلفية العيادة</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          تُطبَّق على جميع الصفحات مع طبقة تعتيم داكنة — الصورة تُحفظ محلياً وفي قاعدة البيانات
        </p>
      </div>

      {/* Preview */}
      {bgImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 200 }}>
          <img src={bgImage} alt="خلفية العيادة" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <p className="text-white text-sm font-semibold drop-shadow">معاينة الخلفية</p>
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 left-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center shadow transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 transition bg-slate-50 dark:bg-slate-700/30"
          style={{ height: 200 }}
        >
          {processing ? (
            <><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /><p className="text-sm text-slate-500">جارٍ معالجة الصورة...</p></>
          ) : (
            <>
              <ImagePlus className="w-10 h-10 text-slate-400" />
              <p className="text-sm text-slate-500 font-medium">اضغط لاختيار صورة</p>
              <p className="text-xs text-slate-400">PNG, JPG, WEBP — تُضغط تلقائياً</p>
            </>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={processing}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <ImagePlus className="w-4 h-4" />
          {bgImage ? 'تغيير الصورة' : 'اختيار صورة'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !bgImage || processing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</>
            : saved
            ? <><CheckCircle className="w-4 h-4" /> تم الحفظ!</>
            : <><Save className="w-4 h-4" /> حفظ الخلفية</>
          }
        </button>
      </div>

      {bgImage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
          ✓ الخلفية ستُطبَّق على جميع الصفحات مع طبقة تعتيم داكنة لضمان وضوح النصوص
        </div>
      )}
    </div>
  );
}
