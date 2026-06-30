// name=src/components/shared/RadiologyPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRadiologyImages, addRadiologyImage, deleteRadiologyImage } from '../../firebase/firestoreService';
import type { RadiologyImage } from '../../types';
import { ImagePlus, Camera, Trash2, X, ScanLine, Loader2 } from 'lucide-react';

function fileToCompressedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RadiologyPanel({ patientId }: { patientId: string }) {
  const { clinicId, userProfile } = useAuth();
  const [images, setImages] = useState<RadiologyImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<RadiologyImage | null>(null);
  const [pendingFile, setPendingFile] = useState<{ data: string; source: 'upload' | 'device' } | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const deviceRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    if (!clinicId) return;
    try {
      setImages(getRadiologyImages(clinicId, patientId));
    } catch (err) {
      console.error('Failed to load radiology images', err);
      setImages([]);
    }
  };

  useEffect(() => { reload(); }, [clinicId, patientId]);

  const handleFile = async (file: File | undefined, source: 'upload' | 'device') => {
    if (!file) return;
    setProcessing(true);
    try {
      const data = await fileToCompressedBase64(file);
      setPendingFile({ data, source });
    } catch (err) {
      console.error('fileToCompressedBase64 error', err);
      alert('فشل معالجة الصورة');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!clinicId || !pendingFile) return;
    try {
      await addRadiologyImage({
        clinicId,
        patientId,
        imageData: pendingFile.data,
        description,
        notes,
        source: pendingFile.source,
        createdBy: userProfile?.displayName ?? 'مستخدم',
      });
      setPendingFile(null);
      setDescription('');
      setNotes('');
      reload();
    } catch (err) {
      console.error('addRadiologyImage error', err);
      alert('حدث خطأ أثناء حفظ الصورة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!clinicId) return;
    if (!confirm('حذف هذه الصورة؟')) return;
    try {
      await deleteRadiologyImage(id, clinicId);
      if (preview?.id === id) setPreview(null);
      reload();
    } catch (err) {
      console.error('deleteRadiologyImage error', err);
      alert('فشل حذف الصورة');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => uploadRef.current?.click()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <ImagePlus className="w-3.5 h-3.5" /> رفع صورة أشعة
        </button>
        <button type="button" onClick={() => deviceRef.current?.click()} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <Camera className="w-3.5 h-3.5" /> جلب من جهاز
        </button>
        {processing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], 'upload')} />
        <input ref={deviceRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], 'device')} />
      </div>

      {pendingFile && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">إضافة وصف للصورة</h4>
            <button onClick={() => setPendingFile(null)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <img src={pendingFile.data} alt="معاينة" className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-600 bg-black/5" />
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">وصف الصورة *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: بانورامية" className="w-full border rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm"></textarea>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!description.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl">حفظ</button>
            <button onClick={() => setPendingFile(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">إلغاء</button>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2 text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-600">
          <ScanLine className="w-9 h-9 opacity-30" />
          <p className="text-sm">لا توجد صور أشعة مسجّلة لهذا المريض</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden group relative">
              <button onClick={() => setPreview(img)} className="block w-full">
                <img src={img.imageData} alt={img.description} className="w-full h-28 object-cover" />
              </button>
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{img.description}</p>
                <p className="text-[10px] text-slate-400">{new Date(img.createdAt).toLocaleDateString('ar-EG')}</p>
              </div>
              <button onClick={() => handleDelete(img.id)} className="absolute top-1.5 left-1.5 p-1.5 bg-white/90 dark:bg-slate-900/80 rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">{preview.description}</h3>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <img src={preview.imageData} alt={preview.description} className="w-full max-h-[60vh] object-contain bg-black/5" />
            {preview.notes && <p className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{preview.notes}</p>}
            <p className="px-5 pb-4 text-[10px] text-slate-400">{preview.createdBy} · {new Date(preview.createdAt).toLocaleString('ar-EG')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
