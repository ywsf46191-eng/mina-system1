# دليل إعداد نظام إدارة العيادة
## Clinic Management System — Setup Guide

---

## 📦 المتطلبات / Requirements

- [Node.js 18+](https://nodejs.org) — يجب تثبيته أولاً
- npm (يأتي مع Node.js)
- اتصال إنترنت للتثبيت الأول فقط

---

## 🚀 خطوات التشغيل / Quick Start

### 1. تثبيت المكتبات
```bash
npm install
```

### 2. تشغيل في المتصفح (للتطوير)
```bash
npm run dev
```
ثم افتح: http://localhost:5173

### 3. تشغيل كبرنامج Desktop (Electron)
```bash
npm run electron:dev
```

---

## 🖥️ بناء ملف .exe للويندوز

```bash
# بناء وتحويل لـ .exe
npm run electron:build
```

الملف الناتج: `dist-electron/نظام إدارة العيادة Setup 1.0.0.exe`

> ملاحظة: البناء يتطلب نظام Windows أو استخدام GitHub Actions (انظر أدناه)

---

## ☁️ Firebase — بيانات الاتصال

الملف: `src/firebase/config.ts`

البيانات موجودة مسبقاً (من الإعداد الذي أرسلته):
```
projectId: mina-system-23af8
```

---

## 📡 نظام Online/Offline

| الحالة | الوصف |
|--------|-------|
| **متصل بالإنترنت** | جميع البيانات تُقرأ وتُكتب مباشرة على Firebase Firestore |
| **منقطع عن الإنترنت** | Firebase يعمل من كاش IndexedDB المحلي تلقائياً |
| **عودة الاتصال** | جميع التغييرات اللي صارت offline تُزامَن تلقائياً مع Firebase |

لا يحتاج المستخدم أي شيء — يعمل تلقائياً ✅

---

## 🔥 Firebase Console

لمشاهدة البيانات:
1. افتح https://console.firebase.google.com
2. اختر مشروع `mina-system-23af8`
3. Firestore Database ← ستجد جميع البيانات

### Collections (جداول البيانات):
- `users` — المستخدمين والأطباء والسكرتيرين
- `branches` — الفروع
- `patients` — المرضى
- `bills` — الفواتير
- `payments` — المدفوعات
- `salaries` — الرواتب
- `warehouse` — المستودع
- `settings` — إعدادات العيادة
- `smslog` — سجل الرسائل

---

## 🔐 بيانات الدخول الافتراضية

| البريد | كلمة المرور | الدور |
|--------|-------------|-------|
| admin@clinic.com | admin123 | المدير العام |

---

## 🏗️ بناء الـ .exe عبر GitHub Actions (موصى به)

إذا كنت على Linux/Mac وتريد .exe للويندوز، استخدم GitHub Actions:

1. ارفع المشروع على GitHub
2. أضف ملف `.github/workflows/build.yml` (موجود في المشروع)
3. كل push ينتج .exe تلقائياً في Releases

---

## 📁 هيكل المشروع

```
clinic-app/
├── electron/
│   └── main.cjs          ← نقطة دخول Electron
├── src/
│   ├── firebase/
│   │   ├── config.ts     ← إعدادات Firebase
│   │   ├── firestoreService.ts  ← كل عمليات البيانات
│   │   └── networkStatus.ts     ← مراقبة الاتصال
│   ├── contexts/
│   │   └── AuthContext.tsx  ← نظام المصادقة
│   └── components/
│       └── shared/
│           └── OfflineBadge.tsx  ← مؤشر الوضع Offline
├── package.json          ← الإعدادات + Electron Builder
└── vite.config.ts        ← إعدادات البناء
```
