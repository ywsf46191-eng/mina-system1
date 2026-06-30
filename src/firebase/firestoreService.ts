
/**
 * firestoreService.ts
 * 
 * Hybrid data layer:
 *  - When ONLINE  → reads/writes go to Firebase Firestore
 *  - When OFFLINE → Firestore's built-in IndexedDB cache serves reads;
 *                   writes are queued and synced automatically on reconnect
 * 
 * The public API is identical to the old localStorage version so no other
 * file needs to change.
 */
 
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, Timestamp, onSnapshot,
  serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Patient, UserProfile, Secretary, DoctorRecord,
  Salary, Bill, BillType, BillStatus, Payment,
  WarehouseItem, WarehouseItemType, ClinicSettings, Branch,
  SmsLogEntry, Lab, LabTransfer, RadiologyImage,
} from '../types';
 
// ─── helpers ──────────────────────────────────────────────────────────
 
function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
 
// Firestore يرفض أي قيمة undefined (سواء في أعلى الكائن أو جوّه بشكل متداخل)،
// فبنشيلها تلقائيًا قبل أي عملية كتابة لمنع أخطاء زي:
// "Function setDoc() called with invalid data. Unsupported field value: undefined"
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, v]) => {
      if (v === undefined) return; // تجاهل أي حقل قيمته undefined بدل ما يوصل لـ Firestore
      cleaned[key] = stripUndefinedDeep(v);
    });
    return cleaned as T;
  }
  return value;
}
 
async function getAll<T>(col: string): Promise<T[]> {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
}
 
async function getFiltered<T>(col: string, field: string, value: string): Promise<T[]> {
  const q = query(collection(db, col), where(field, '==', value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
}
 
async function upsert(col: string, id: string, data: object): Promise<void> {
  await setDoc(doc(db, col, id), stripUndefinedDeep(data), { merge: true });
}
 
async function remove(col: string, id: string): Promise<void> {
  await deleteDoc(doc(db, col, id));
}
 
// ─── init ───────────────────────────────────────────────────────────
 
export async function initStore(): Promise<void> {
  // Seed superadmin if not present
  const users = await getAll<UserProfile>('users');
  if (!users.find((u) => u.role === 'superadmin')) {
    const admin: UserProfile = {
      uid: 'sa-1',
      email: 'admin@clinic.com',
      password: 'admin123',
      role: 'superadmin',
      clinicId: '',
      displayName: 'المدير العام',
      allowedPages: ['*'],
    };
    await upsert('users', admin.uid, admin);
  }
}
 
// ─── users ───────────────────────────────────────────────────────────
 
export async function getUsers(): Promise<UserProfile[]> {
  return getAll<UserProfile>('users');
}
 
export async function getUserById(uid: string): Promise<UserProfile | undefined> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return undefined;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}
 
export async function saveUser(user: UserProfile): Promise<void> {
  await upsert('users', user.uid, user);
}
 
export async function deleteUser(uid: string): Promise<void> {
  await remove('users', uid);
}
 
export async function loginUser(email: string, password: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('email', '==', email), where('password', '==', password));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() } as UserProfile;
}
 
export async function createUserProfile(
  newUid: string,
  data: { email: string; role: string; clinicId: string; displayName: string; doctorId?: string; password?: string; allowedPages?: string[] },
): Promise<void> {
  const user: UserProfile = {
    uid: newUid,
    email: data.email,
    password: data.password ?? '',
    role: data.role as UserProfile['role'],
    clinicId: data.clinicId,
    displayName: data.displayName,
    doctorId: data.doctorId,
    allowedPages: data.allowedPages ?? [],
  };
  await upsert('users', newUid, user);
}
 
// ─── branches ─────────────────────────────────────────────────────────
 
export async function getBranches(): Promise<Branch[]> {
  return getAll<Branch>('branches');
}
 
export async function saveBranch(branch: Branch): Promise<void> {
  await upsert('branches', branch.id, branch);
}
 
export async function deleteBranch(id: string): Promise<void> {
  await remove('branches', id);
}
 
export async function createBranchRecord(data: {
  name: string; address?: string; phone?: string;
  allowedDoctorPages?: string[]; allowedSecretaryPages?: string[];
}): Promise<Branch> {
  const branch: Branch = {
    id: uid(),
    name: data.name,
    address: data.address ?? '',
    phone: data.phone ?? '',
    managerIds: [],
    allowedDoctorPages: data.allowedDoctorPages ?? [],
    allowedSecretaryPages: data.allowedSecretaryPages ?? [],
    createdAt: now(),
  };
  await saveBranch(branch);
  return branch;
}
 
// ─── patients ─────────────────────────────────────────────────────────
 
export async function getPatients(clinicId: string): Promise<Patient[]> {
  if (!clinicId) return [];
  return getFiltered<Patient>('patients', 'clinicId', clinicId);
}
 
export async function createPatient(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uid();
  const patient: Patient = { ...data, id, dentalChart: data.dentalChart ?? {}, createdAt: now(), updatedAt: now() };
  await upsert('patients', id, patient);
  return id;
}
 
export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  await upsert('patients', id, { ...data, updatedAt: now() });
}
 
export async function deletePatient(id: string): Promise<void> {
  await remove('patients', id);
}
 
// ─── secretaries ────────────────────────────────────────────────────────
 
export async function getSecretaries(clinicId: string): Promise<Secretary[]> {
  const users = await getFiltered<UserProfile>('users', 'clinicId', clinicId);
  return users
    .filter((u) => u.role === 'secretary')
    .map((u) => ({ id: u.uid, uid: u.uid, email: u.email, displayName: u.displayName, clinicId: u.clinicId, doctorId: u.doctorId ?? '', allowedPages: u.allowedPages }));
}
 
export async function deleteSecretary(id: string): Promise<void> {
  await deleteUser(id);
}
 
// ─── doctors ──────────────────────────────────────────────────────────
 
export async function getDoctors(clinicId: string): Promise<DoctorRecord[]> {
  const users = await getFiltered<UserProfile>('users', 'clinicId', clinicId);
  return users
    .filter((u) => u.role === 'doctor')
    .map((u) => ({ id: u.uid, uid: u.uid, email: u.email, displayName: u.displayName, specialty: '', phone: '', clinicId: u.clinicId, parentDoctorId: u.doctorId ?? '', allowedPages: u.allowedPages }));
}
 
export async function deleteDoctor(id: string): Promise<void> {
  await deleteUser(id);
}
 
// ─── salaries ─────────────────────────────────────────────────────────
 
export async function getSalaries(clinicId: string): Promise<Salary[]> {
  return getFiltered<Salary>('salaries', 'clinicId', clinicId);
}
 
export async function createSalary(data: Omit<Salary, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const salary: Salary = { ...data, id, createdAt: now() };
  await upsert('salaries', id, salary);
  return id;
}
 
export async function deleteSalary(id: string, _clinicId: string): Promise<void> {
  await remove('salaries', id);
}
 
// ─── bills ──────────────────────────────────────────────────────────
 
export async function getBills(clinicId: string): Promise<Bill[]> {
  return getFiltered<Bill>('bills', 'clinicId', clinicId);
}
 
export async function createBill(data: Omit<Bill, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const bill: Bill = { ...data, id, createdAt: now() };
  await upsert('bills', id, bill);
  return id;
}
 
export async function deleteBill(id: string, _clinicId: string): Promise<void> {
  await remove('bills', id);
}
 
// ─── payments ─────────────────────────────────────────────────────────
 
export async function getPayments(clinicId: string): Promise<Payment[]> {
  return getFiltered<Payment>('payments', 'clinicId', clinicId);
}
 
export async function createPayment(data: Omit<Payment, 'id'>): Promise<Payment> {
  const id = uid();
  const payment: Payment = { ...data, id };
  await upsert('payments', id, payment);
  return payment;
}
 
export async function deletePayment(id: string, _clinicId: string): Promise<void> {
  await remove('payments', id);
}
 
// ─── warehouse ─────────────────────────────────────────────────────────
 
export async function getWarehouseItems(clinicId: string): Promise<WarehouseItem[]> {
  return getFiltered<WarehouseItem>('warehouse', 'clinicId', clinicId);
}
 
export async function createWarehouseItem(data: Omit<WarehouseItem, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const item: WarehouseItem = { ...data, id, createdAt: now() };
  await upsert('warehouse', id, item);
  return id;
}
 
export async function deleteWarehouseItem(id: string, _clinicId: string): Promise<void> {
  await remove('warehouse', id);
}
 
export async function updateWarehouseItem(id: string, _clinicId: string, data: Partial<WarehouseItem>): Promise<void> {
  await upsert('warehouse', id, data);
}
 
// ─── settings ─────────────────────────────────────────────────────────
 
export async function getClinicSettings(clinicId: string): Promise<ClinicSettings> {
  const snap = await getDoc(doc(db, 'settings', clinicId));
  if (!snap.exists()) return {} as ClinicSettings;
  return snap.data() as ClinicSettings;
}
 
export async function saveClinicSettings(clinicId: string, data: Partial<ClinicSettings>): Promise<void> {
  await upsert('settings', clinicId, data);
}
 
// ─── SMS log ──────────────────────────────────────────────────────────
 
export async function getSmsLog(clinicId: string): Promise<SmsLogEntry[]> {
  const entries = await getFiltered<SmsLogEntry>('smslog', 'clinicId', clinicId);
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
 
export async function addSmsLog(entry: Omit<SmsLogEntry, 'id' | 'createdAt'>): Promise<SmsLogEntry> {
  const e: SmsLogEntry = { ...entry, id: uid(), createdAt: now() };
  await upsert('smslog', e.id, e);
  return e;
}
 
export async function deleteSmsLog(id: string, _clinicId: string): Promise<void> {
  await remove('smslog', id);
}
 
export async function clearSmsLog(clinicId: string): Promise<void> {
  const entries = await getFiltered<SmsLogEntry>('smslog', 'clinicId', clinicId);
  const batch = writeBatch(db);
  entries.forEach((e) => batch.delete(doc(db, 'smslog', e.id)));
  await batch.commit();
}
 
// ─── labs ────────────────────────────────────────────────────────────
 
export function getLabs(clinicId: string): Lab[] {
  // For now, return empty array - will be populated by Firestore when setup
  try {
    const allLabs = localStorage.getItem('mina_labs') ? JSON.parse(localStorage.getItem('mina_labs') || '[]') : [];
    return allLabs.filter((l: Lab) => l.clinicId === clinicId);
  } catch {
    return [];
  }
}
 
export async function addLab(data: Omit<Lab, 'id' | 'createdAt'>): Promise<Lab> {
  const lab: Lab = {
    ...data,
    id: uid(),
    createdAt: now(),
  };
  await upsert('labs', lab.id, lab);
  // Also update localStorage for sync
  try {
    const allLabs = localStorage.getItem('mina_labs') ? JSON.parse(localStorage.getItem('mina_labs') || '[]') : [];
    allLabs.push(lab);
    localStorage.setItem('mina_labs', JSON.stringify(allLabs));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
  return lab;
}
 
export async function deleteLab(id: string, clinicId: string): Promise<void> {
  await remove('labs', id);
  // Also update localStorage
  try {
    const allLabs = localStorage.getItem('mina_labs') ? JSON.parse(localStorage.getItem('mina_labs') || '[]') : [];
    const filtered = allLabs.filter((l: Lab) => !(l.id === id && l.clinicId === clinicId));
    localStorage.setItem('mina_labs', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
}
 
// ─── lab transfers ───────────────────────────────────────────────────
 
export function getLabTransfers(clinicId: string): LabTransfer[] {
  try {
    const allTransfers = localStorage.getItem('mina_lab_transfers') ? JSON.parse(localStorage.getItem('mina_lab_transfers') || '[]') : [];
    return allTransfers.filter((t: LabTransfer) => t.clinicId === clinicId);
  } catch {
    return [];
  }
}
 
export async function addLabTransfer(data: Omit<LabTransfer, 'id' | 'createdAt'>): Promise<LabTransfer> {
  const transfer: LabTransfer = {
    ...data,
    id: uid(),
    createdAt: now(),
  };
  await upsert('labTransfers', transfer.id, transfer);
  // Also update localStorage
  try {
    const allTransfers = localStorage.getItem('mina_lab_transfers') ? JSON.parse(localStorage.getItem('mina_lab_transfers') || '[]') : [];
    allTransfers.push(transfer);
    localStorage.setItem('mina_lab_transfers', JSON.stringify(allTransfers));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
  return transfer;
}
 
export async function updateLabTransfer(id: string, clinicId: string, data: Partial<LabTransfer>): Promise<void> {
  await upsert('labTransfers', id, { ...data, updatedAt: now() });
  // Also update localStorage
  try {
    const allTransfers = localStorage.getItem('mina_lab_transfers') ? JSON.parse(localStorage.getItem('mina_lab_transfers') || '[]') : [];
    const index = allTransfers.findIndex((t: LabTransfer) => t.id === id && t.clinicId === clinicId);
    if (index !== -1) {
      allTransfers[index] = { ...allTransfers[index], ...data };
      localStorage.setItem('mina_lab_transfers', JSON.stringify(allTransfers));
    }
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
}
 
export async function deleteLabTransfer(id: string, clinicId: string): Promise<void> {
  await remove('labTransfers', id);
  // Also update localStorage
  try {
    const allTransfers = localStorage.getItem('mina_lab_transfers') ? JSON.parse(localStorage.getItem('mina_lab_transfers') || '[]') : [];
    const filtered = allTransfers.filter((t: LabTransfer) => !(t.id === id && t.clinicId === clinicId));
    localStorage.setItem('mina_lab_transfers', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
}
 
// ─── radiology images ────────────────────────────────────────────────
 
export function getRadiologyImages(clinicId: string, patientId: string): RadiologyImage[] {
  try {
    const allImages = localStorage.getItem('mina_radiology_images') ? JSON.parse(localStorage.getItem('mina_radiology_images') || '[]') : [];
    return allImages.filter((img: RadiologyImage) => img.clinicId === clinicId && img.patientId === patientId);
  } catch {
    return [];
  }
}
 
export async function addRadiologyImage(data: Omit<RadiologyImage, 'id' | 'createdAt'>): Promise<RadiologyImage> {
  const image: RadiologyImage = {
    ...data,
    id: uid(),
    createdAt: now(),
  };
  await upsert('radiologyImages', image.id, image);
  // Also update localStorage
  try {
    const allImages = localStorage.getItem('mina_radiology_images') ? JSON.parse(localStorage.getItem('mina_radiology_images') || '[]') : [];
    allImages.push(image);
    localStorage.setItem('mina_radiology_images', JSON.stringify(allImages));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
  return image;
}
 
export async function deleteRadiologyImage(id: string, clinicId: string): Promise<void> {
  await remove('radiologyImages', id);
  // Also update localStorage
  try {
    const allImages = localStorage.getItem('mina_radiology_images') ? JSON.parse(localStorage.getItem('mina_radiology_images') || '[]') : [];
    const filtered = allImages.filter((img: RadiologyImage) => !(img.id === id && img.clinicId === clinicId));
    localStorage.setItem('mina_radiology_images', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
}
 
