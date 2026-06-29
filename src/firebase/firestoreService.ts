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
  SmsLogEntry,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

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
  await setDoc(doc(db, col, id), data, { merge: true });
}

async function remove(col: string, id: string): Promise<void> {
  await deleteDoc(doc(db, col, id));
}

// ─── init ────────────────────────────────────────────────────────────────────

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

// ─── users ────────────────────────────────────────────────────────────────────

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

// ─── branches ────────────────────────────────────────────────────────────────

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

// ─── patients ─────────────────────────────────────────────────────────────────

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

// ─── secretaries ─────────────────────────────────────────────────────────────

export async function getSecretaries(clinicId: string): Promise<Secretary[]> {
  const users = await getFiltered<UserProfile>('users', 'clinicId', clinicId);
  return users
    .filter((u) => u.role === 'secretary')
    .map((u) => ({ id: u.uid, uid: u.uid, email: u.email, displayName: u.displayName, clinicId: u.clinicId, doctorId: u.doctorId ?? '', allowedPages: u.allowedPages }));
}

export async function deleteSecretary(id: string): Promise<void> {
  await deleteUser(id);
}

// ─── doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(clinicId: string): Promise<DoctorRecord[]> {
  const users = await getFiltered<UserProfile>('users', 'clinicId', clinicId);
  return users
    .filter((u) => u.role === 'doctor')
    .map((u) => ({ id: u.uid, uid: u.uid, email: u.email, displayName: u.displayName, specialty: '', phone: '', clinicId: u.clinicId, parentDoctorId: u.doctorId ?? '', allowedPages: u.allowedPages }));
}

export async function deleteDoctor(id: string): Promise<void> {
  await deleteUser(id);
}

// ─── salaries ─────────────────────────────────────────────────────────────────

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

// ─── bills ────────────────────────────────────────────────────────────────────

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

// ─── payments ─────────────────────────────────────────────────────────────────

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

// ─── warehouse ────────────────────────────────────────────────────────────────

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

// ─── settings ─────────────────────────────────────────────────────────────────

export async function getClinicSettings(clinicId: string): Promise<ClinicSettings> {
  const snap = await getDoc(doc(db, 'settings', clinicId));
  if (!snap.exists()) return {} as ClinicSettings;
  return snap.data() as ClinicSettings;
}

export async function saveClinicSettings(clinicId: string, data: Partial<ClinicSettings>): Promise<void> {
  await upsert('settings', clinicId, data);
}

// ─── SMS log ──────────────────────────────────────────────────────────────────

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
