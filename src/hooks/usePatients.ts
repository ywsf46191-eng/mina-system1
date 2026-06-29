import { useState, useEffect, useCallback } from 'react';
import { getPatients, updatePatient } from '../firebase/firestoreService';
import type { Patient } from '../types';

export function usePatients(clinicId: string | undefined | null) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getPatients(clinicId);
      setPatients(data);
      setError(null);
    } catch (e) {
      setError('فشل تحميل بيانات المرضى');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const editPatient = useCallback(async (id: string, data: Partial<Patient>) => {
    await updatePatient(id, data);
    await fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, error, editPatient, refetch: fetchPatients };
}
