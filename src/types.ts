export type UserRole = 'superadmin' | 'branch_manager' | 'doctor' | 'secretary' | 'doctor_secretary';
export type ToothStatus = 'none' | 'treatment' | 'done';
export type BillType = 'electricity' | 'water' | 'rent' | 'other';
export type BillStatus = 'paid' | 'partial' | 'unpaid';
export type WarehouseItemType = 'medical' | 'medicine' | 'other';
export type PaymentMethod = 'cash' | 'bank_palestine' | 'jawwal' | 'palpal';

export interface ToothState {
  diagnosis: string;
  amount: number;
  treatmentStatus: ToothStatus;
  totalSessions?: number;
  completedSessions?: number[];
  sessionNotes?: Record<string, string>;
  notes?: string;
  status?: ToothStatus;
  workedOn?: boolean;
}

export type DentalChartState = Record<string, ToothState>;

export interface DentalRow {
  id: string;
  date: string;
  toothNo: string;
  diagnosis: string;
  treatmentProcedure: string;
  price: number;
  payment: number;
  remainingAmount: number;
}

export interface Lab {
  id: string;
  clinicId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  specializations?: string[];
  notes?: string;
  createdAt: string;
}

export interface LabTransfer {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  labId: string;
  labName: string;
  toothNumber: string;
  diagnosis: string;
  transferDate: string;
  expectedReturnDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface RadiologyImage {
  id: string;
  clinicId: string;
  patientId: string;
  imageData: string; // Base64 encoded
  description: string;
  notes?: string;
  source: 'upload' | 'device';
  createdBy: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  fileNumber: number;
  fullName: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  backupPhoneNumber: string;
  chronicDiseases: string;
  pastSurgeries: string;
  currentMedications: string;
  allergies: string;
  isSmoker: boolean;
  pregnancyOrBreastfeeding: boolean;
  periodDetails: string;
  dentalRows: DentalRow[];
  dentalChart: DentalChartState;
  nextAppointmentDate: string;
  nextAppointmentTime: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Secretary {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  clinicId: string;
  doctorId: string;
  allowedPages?: string[];
}

export interface DoctorRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  specialty: string;
  phone: string;
  clinicId: string;
  parentDoctorId: string;
  allowedPages?: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  password?: string;
  role: UserRole;
  clinicId: string;
  displayName: string;
  doctorId?: string;
  allowedPages?: string[];
  additionalRoles?: string[];
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  managerIds: string[];
  allowedDoctorPages?: string[];
  allowedSecretaryPages?: string[];
  createdAt: string;
}

export interface Salary {
  id: string;
  clinicId: string;
  employeeName: string;
  monthlySalary: number;
  paidAmount: number;
  paymentDate: string;
  notes: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  clinicId: string;
  billType: BillType;
  customTypeName: string;
  period: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: BillStatus;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  toothId?: string;
  note?: string;
}

export interface WarehouseItem {
  id: string;
  clinicId: string;
  name: string;
  type: WarehouseItemType;
  quantity: number;
  unit: string;
  minQuantity: number;
  price: number;
  expiryDate: string;
  notes: string;
  createdAt: string;
}

export interface ClinicSettings {
  backgroundImage?: string;
  hotSmsToken?: string;
  hotSmsSender?: string;
  hotSmsApiUrl?: string;
  hotSmsAutoSend?: boolean;
  hotSmsLastAutoSend?: string;
}

export type SmsStatus = 'sent' | 'failed';
export type SmsSource = 'reminder' | 'manual' | 'auto';

export interface SmsLogEntry {
  id: string;
  clinicId: string;
  patientId?: string;
  patientName: string;
  phoneNumber: string;
  message: string;
  templateId?: string;
  status: SmsStatus;
  source: SmsSource;
  code?: string;
  error?: string;
  appointmentDate?: string;
  createdAt: string;
}
