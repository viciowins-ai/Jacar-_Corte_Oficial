import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface WhatsAppTemplates {
  confirmation: string;
  reminder2h: string;
  return20d: string;
}

export interface WhatsAppSettings {
  autoSendViaWebhook: boolean;
  webhookUrl: string;
  webhookToken: string;
  instanceName?: string;
  barberPhone: string;
  templates: WhatsAppTemplates;
}

export const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  confirmation: `Fala {nome}! ✂️\nSeu horário no *Jacaré do Corte* foi confirmado com sucesso!\n\n📅 *Data:* {data}\n⏰ *Horário:* {horario}\n💈 *Serviço:* {servico}\n💰 *Valor:* {valor}\n📍 *Barbeiro:* Jacaré\n\nTe esperamos! Se precisar reagendar ou tiver alguma dúvida, avise por aqui.`,
  
  reminder2h: `Fala {nome}, beleza? ✂️\nPassando para lembrar que seu horário no *Jacaré do Corte* é hoje às *{horario}*!\n\n💈 *Serviço:* {servico}\n📍 *Local:* Jacaré do Corte\n\nContamos com sua presença! Caso tenha algum imprevisto, nos avise com antecedência. Até já! 🚀`,
  
  return20d: `Fala {nome}, tudo na paz? ✂️\nJá se passaram mais de 20 dias desde o seu último corte no *Jacaré do Corte*!\n\nQue tal renovar o visual e dar aquele trato na régua esta semana?\n\n📲 *Agende seu horário online em menos de 1 minuto:* {link_agendamento}\n\nOu responda aqui com o dia que você prefere vir!`
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  autoSendViaWebhook: false,
  webhookUrl: '',
  webhookToken: '',
  instanceName: 'jacare-barber',
  barberPhone: '5579998887777', // Default placeholder or Jacare phone
  templates: DEFAULT_TEMPLATES
};

const STORAGE_KEY = 'jacare_whatsapp_settings';

export function getCachedWhatsAppSettings(): WhatsAppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...parsed,
        templates: {
          ...DEFAULT_TEMPLATES,
          ...(parsed.templates || {})
        }
      };
    }
  } catch (err) {
    console.error('Error reading cached WhatsApp settings:', err);
  }
  return DEFAULT_WHATSAPP_SETTINGS;
}

export async function fetchWhatsAppSettings(): Promise<WhatsAppSettings> {
  const cached = getCachedWhatsAppSettings();
  try {
    const ref = doc(db, 'settings', 'whatsapp_automation');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Partial<WhatsAppSettings>;
      const merged: WhatsAppSettings = {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...data,
        templates: {
          ...DEFAULT_TEMPLATES,
          ...(data.templates || {})
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch WhatsApp settings from Firestore, using cache:', err);
  }
  return cached;
}

export async function saveWhatsAppSettings(settings: WhatsAppSettings): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  try {
    const ref = doc(db, 'settings', 'whatsapp_automation');
    await setDoc(ref, settings, { merge: true });
  } catch (err) {
    console.warn('Could not save WhatsApp settings to Firestore, saved to local cache:', err);
  }
}

/** Formata número para formato internacional limpo (apenas dígitos com DDI 55) */
export function sanitizePhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export interface MessageVariables {
  nome?: string;
  data?: string;
  horario?: string;
  servico?: string;
  valor?: string;
  link_agendamento?: string;
}

export function renderMessage(template: string, vars: MessageVariables): string {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jacare-do-corte.web.app';
  const defaults: MessageVariables = {
    nome: vars.nome || 'Amigo',
    data: vars.data || 'Hoje',
    horario: vars.horario || '14:00',
    servico: vars.servico || 'Cabelo',
    valor: vars.valor || 'R$ 30,00',
    link_agendamento: vars.link_agendamento || `${currentOrigin}/agendar`
  };

  let rendered = template;
  for (const [key, value] of Object.entries(defaults)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
  }
  return rendered;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = sanitizePhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/** Envio automático via webhook/API se configurado pelo dono */
export async function sendViaWebhook(settings: WhatsAppSettings, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!settings.autoSendViaWebhook || !settings.webhookUrl) {
    return { success: false, error: 'Robô de WhatsApp não está ativo ou sem URL configurada.' };
  }

  try {
    const cleanPhone = sanitizePhone(phone);
    const res = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.webhookToken ? { 'Authorization': `Bearer ${settings.webhookToken}` } : {})
      },
      body: JSON.stringify({
        number: cleanPhone,
        phone: cleanPhone,
        message: message,
        text: message
      })
    });

    if (res.ok) {
      return { success: true };
    } else {
      return { success: false, error: `Servidor retornou status ${res.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão com o Webhook' };
  }
}

/** Registro de lembretes enviados no localStorage para evitar spam */
export function markReminderSent(appointmentId: string, type: 'confirmation' | 'reminder2h' | 'return20d') {
  try {
    const key = `sent_wa_${type}_${appointmentId}`;
    localStorage.setItem(key, new Date().toISOString());
  } catch (err) {
    console.error(err);
  }
}

export function isReminderSent(appointmentId: string, type: 'confirmation' | 'reminder2h' | 'return20d'): boolean {
  try {
    const key = `sent_wa_${type}_${appointmentId}`;
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}
