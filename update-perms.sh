#!/usr/bin/env bash
set -euo pipefail

# تشغيل من جذر المشروع
# تحققي من git clean
if [ -n "$(git status --porcelain)" ]; then
  echo "تحذير: لديك تغييرات محلية غير ملتزمة. الرجاء الالتزام بها أو stash قبل تشغيل هذا السكربت."
  exit 1
fi

BRANCH="feature/add-labs-radiology-perms"

# أنشئ فرع عمل محلي
git checkout -b "$BRANCH"

# ملفات الهدف
ADMIN="src/pages/AdminDashboard.tsx"
LAYOUT="src/components/shared/Layout.tsx"
TYPES="src/types.ts"

# احفظ نسخ احتياطية
for f in "$ADMIN" "$LAYOUT" "$TYPES"; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    echo "Backup: $f -> $f.bak"
  else
    echo "خطأ: الملف $f غير موجود. تأكدي من أنك في جذر المستودع الصحيح."
    exit 1
  fi
done

# 1) استبدال ALL_DOCTOR_PAGES و ALL_SECRETARY_PAGES في AdminDashboard.tsx
perl -0777 -pe 's/const\s+ALL_DOCTOR_PAGES\s*=\s*\[.*?\];/const ALL_DOCTOR_PAGES = [
  { key: '\''patients'\'',    label: '\''📋 المرضى'\'' },
  { key: '\''secretaries'\'', label: '\''🗂️ السكرتارية'\'' },
  { key: '\''doctors'\'',     label: '\''🩺 الأطباء'\'' },
  { key: '\''warehouse'\'',   label: '\''📦 المخزن'\'' },
  { key: '\''accounting'\'',  label: '\''🧾 المحاسبة'\'' },
  { key: '\''statistics'\'',  label: '\''📊 الإحصائيات'\'' },
  { key: '\''appearance'\'',  label: '\''🎨 المظهر'\'' },
  { key: '\''labs'\'',        label: '\''🧪 المعامل'\'' },
  { key: '\''radiology'\'',   label: '\''🩻 الأشعة'\'' },
  { key: '\''treatment_plan_print'\'', label: '\''🖨️ طباعة الخطة العلاجية'\'' },
];/gs' -i "$ADMIN"

perl -0777 -pe 's/const\s+ALL_SECRETARY_PAGES\s*=\s*\[.*?\];/const ALL_SECRETARY_PAGES = [
  { key: '\''patients'\'', label: '\''📋 المرضى'\'' },
  { key: '\''finance'\'',  label: '\''💰 المالية'\'' },
  { key: '\''sms'\'',      label: '\''📱 إرسال SMS'\'' },
  { key: '\''radiology'\'', label: '\''🩻 الأشعة'\'' },
  { key: '\''labs'\'',      label: '\''🧪 المعامل'\'' },
];/gs' -i "$ADMIN"

echo "✓ Updated $ADMIN"

# 2) استبدال children block في Layout.tsx
# نحاول استبدال الكتلة const children = [ ... ].filter(Boolean) as ...
perl -0777 -pe 's/const\s+children\s*=\s*\[.*?\]\.filter\(Boolean\)\s*as[^\;]*;/const children = [
  canSee('\''secretaries'\'') && { label: '\''السكرتارية'\'', path: '\''\/doctor\/secretaries'\'', icon: UserCog, pageKey: '\''secretaries'\'' },
  canSee('\''doctors'\'')     && { label: '\''الأطباء'\'',     path: '\''\/doctor\/doctors'\'',     icon: Stethoscope, pageKey: '\''doctors'\''     },
  canSee('\''warehouse'\'')   && { label: '\''المخزن'\'',      path: '\''\/doctor\/warehouse'\'',   icon: Package,     pageKey: '\''warehouse'\''   },
  canSee('\''accounting'\'')  && { label: '\''المحاسبة'\'',    path: '\''\/doctor\/accounting'\'',  icon: Calculator,  pageKey: '\''accounting'\''  },
  canSee('\''statistics'\'')  && { label: '\''الإحصائيات'\'', path: '\''\/doctor\/statistics'\'',  icon: BarChart2,   pageKey: '\''statistics'\''  },
  canSee('\''appearance'\'')  && { label: '\''المظهر'\'',      path: '\''\/doctor\/appearance'\'',  icon: ImageIcon,   pageKey: '\''appearance'\''  },
  canSee('\''labs'\'')        && { label: '\''المعامل'\'',      path: '\''\/doctor\/labs'\'',        icon: FlaskConical, pageKey: '\''labs'\'' },
  canSee('\''radiology'\'')   && { label: '\''الأشعة'\'',       path: '\''\/doctor\/radiology'\'',   icon: ImageIcon,    pageKey: '\''radiology'\'' },
].filter(Boolean) as { label: string; path: string; icon: React.ElementType; pageKey: string }[];/gs' -i "$LAYOUT"

# Verify replacement occurred
if ! grep -q "treat.*plan" "$ADMIN" >/dev/null 2>&1; then
  # quick check: ensure the new keys exist
  if ! grep -q "labs'\\|radiology'\\|treatment_plan_print" "$ADMIN"; then
    echo "⚠️ لم يتم تحديث $ADMIN كما توقعت. اطلعي الملف يدوياً."
    exit 1
  fi
fi
echo "✓ Updated $LAYOUT"

# 3) تحديث src/types.ts لإضافة doctor_secretary
if grep -q "export type UserRole" "$TYPES"; then
  perl -0777 -pe "s/export\s+type\s+UserRole\s*=\s*'[^;]*';/export type UserRole = 'superadmin' | 'branch_manager' | 'doctor' | 'secretary' | 'doctor_secretary';/s" -i "$TYPES"
  echo "✓ Updated $TYPES"
else
  echo "⚠️ لم أجد تعريف UserRole في $TYPES"
fi

# 4) git add, commit, push
git add "$ADMIN" "$LAYOUT" "$TYPES"
git commit -m "feat(admin): expose labs, radiology, treatment_plan_print in permission lists; add doctor_secretary role"
git push -u origin "$BRANCH"

echo ""
echo "انتهى: فرع '$BRANCH' دُفع إلى remote. افتحي Pull Request من هذا الفرع إلى main عبر GitHub."
