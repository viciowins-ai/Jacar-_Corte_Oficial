import { db, auth } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

export interface ServiceItem {
  id: string | number;
  name: string;
  price: number;
  duration_minutes: number;
  active?: boolean;
}

export const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Cabelo', price: 30, duration_minutes: 30, active: true },
  { id: '2', name: 'Barba', price: 20, duration_minutes: 20, active: true },
  { id: '3', name: 'Barba + Cabelo + Sobrancelha', price: 50, duration_minutes: 50, active: true },
  { id: '4', name: 'Sobrancelha', price: 10, duration_minutes: 15, active: true },
  { id: '5', name: 'Luzes', price: 130, duration_minutes: 60, active: true },
  { id: '6', name: 'Platinado', price: 130, duration_minutes: 60, active: true },
  { id: '7', name: 'Reflexo Alinhado', price: 130, duration_minutes: 60, active: true }
];

export const DEFAULT_TIME_SLOTS: string[] = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '13:00', '13:40', '14:20', '15:00', '15:40',
  '16:20', '17:00', '17:40', '18:20', '19:00'
];

const SERVICES_CACHE_KEY = 'barbershop_services';
const SCHEDULE_CACHE_KEY = 'barbershop_schedule_slots';

// Helper error handler
function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    },
    operationType,
    path
  };
  console.warn(`[Firestore Error - ${operationType}] ${path}:`, errInfo);
}

/**
 * Obter lista de serviços (Firestore -> Cache Local -> Padrões)
 */
export async function fetchServices(): Promise<ServiceItem[]> {
  try {
    const snap = await getDocs(collection(db, 'services'));
    const list: ServiceItem[] = [];

    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        name: data.name || 'Serviço',
        price: Number(data.price ?? 0),
        duration_minutes: Number(data.duration_minutes ?? 30),
        active: data.active !== false
      });
    });

    if (list.length > 0) {
      // Ordenar por ID ou nome
      list.sort((a, b) => {
        const numA = parseInt(String(a.id), 10);
        const numB = parseInt(String(b.id), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.name.localeCompare(b.name);
      });
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(list));
      return list;
    }

    // Se estiver vazio no banco pela primeira vez, semear serviços padrão
    try {
      for (const s of DEFAULT_SERVICES) {
        await setDoc(doc(db, 'services', String(s.id)), {
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
          active: true,
          created_at: new Date().toISOString()
        });
      }
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(DEFAULT_SERVICES));
      return DEFAULT_SERVICES;
    } catch {
      // fallback
    }
  } catch (err) {
    handleFirestoreError(err, 'list', 'services');
  }

  // Fallback cache local
  const cached = localStorage.getItem(SERVICES_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  return DEFAULT_SERVICES;
}

/**
 * Salvar / Atualizar um serviço e seu preço
 */
export async function saveService(service: {
  id?: string | number;
  name: string;
  price: number;
  duration_minutes: number;
  active?: boolean;
}): Promise<ServiceItem> {
  const serviceId = service.id ? String(service.id) : `serv_${Date.now()}`;
  const payload = {
    name: service.name.trim(),
    price: Number(service.price),
    duration_minutes: Number(service.duration_minutes || 30),
    active: service.active !== false,
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'services', serviceId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'update', `services/${serviceId}`);
  }

  // Atualizar cache local
  const current = await fetchCachedServices();
  const index = current.findIndex(s => String(s.id) === serviceId);
  const updatedItem: ServiceItem = { id: serviceId, ...payload };

  let updatedList: ServiceItem[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = updatedItem;
  } else {
    updatedList = [...current, updatedItem];
  }

  localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('barbershop_services_updated', { detail: updatedList }));
  return updatedItem;
}

/**
 * Excluir serviço
 */
export async function removeService(serviceId: string | number): Promise<void> {
  const idStr = String(serviceId);
  try {
    await deleteDoc(doc(db, 'services', idStr));
  } catch (err) {
    handleFirestoreError(err, 'delete', `services/${idStr}`);
  }

  const current = await fetchCachedServices();
  const updatedList = current.filter(s => String(s.id) !== idStr);
  localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('barbershop_services_updated', { detail: updatedList }));
}

/**
 * Obter cache síncrono rápido
 */
export function fetchCachedServices(): ServiceItem[] {
  const cached = localStorage.getItem(SERVICES_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return DEFAULT_SERVICES;
}

/**
 * Obter horários disponíveis da barbearia (Firestore -> Cache Local -> Padrões)
 */
export async function fetchTimeSlots(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'schedule'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.slots) && data.slots.length > 0) {
        const sorted = sortTimeSlots(data.slots);
        localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(sorted));
        return sorted;
      }
    } else {
      // Se não existir, salvar os horários padrão
      try {
        await setDoc(doc(db, 'settings', 'schedule'), {
          slots: DEFAULT_TIME_SLOTS,
          updated_at: new Date().toISOString()
        });
      } catch {
        // fallback
      }
    }
  } catch (err) {
    handleFirestoreError(err, 'get', 'settings/schedule');
  }

  const cached = localStorage.getItem(SCHEDULE_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  return DEFAULT_TIME_SLOTS;
}

/**
 * Salvar horários disponíveis (Dono)
 */
export async function saveTimeSlots(slots: string[]): Promise<string[]> {
  const cleanSorted = sortTimeSlots(slots);
  try {
    await setDoc(
      doc(db, 'settings', 'schedule'),
      {
        slots: cleanSorted,
        updated_at: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, 'write', 'settings/schedule');
  }

  localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(cleanSorted));
  window.dispatchEvent(new CustomEvent('barbershop_schedule_updated', { detail: cleanSorted }));
  return cleanSorted;
}

/**
 * Obter slots rápidos do cache
 */
export function fetchCachedTimeSlots(): string[] {
  const cached = localStorage.getItem(SCHEDULE_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return DEFAULT_TIME_SLOTS;
}

/**
 * Função utilitária para ordenar horários (ex: 09:00, 09:40, 10:20...)
 */
export function sortTimeSlots(slots: string[]): string[] {
  const unique = Array.from(new Set(slots.map(s => s.trim()))).filter(Boolean);
  return unique.sort((a, b) => {
    const [hA, mA] = a.split(':').map(Number);
    const [hB, mB] = b.split(':').map(Number);
    if (hA !== hB) return hA - hB;
    return (mA || 0) - (mB || 0);
  });
}
