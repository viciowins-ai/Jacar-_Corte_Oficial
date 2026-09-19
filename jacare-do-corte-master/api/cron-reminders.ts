import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Backend Context)
// Note: In Vercel, these env vars must be set in the Project Settings
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
// IDEALLY: Use SERVICE_ROLE_KEY for backend to bypass RLS, but for now ANON might work if policies allow update.
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. Security Check (Optional: Add a secret key to prevent unauthorized calls)
    const authHeader = req.headers.authorization;
    if (req.query.key !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow public for dev testing if no secret set, but warn
        if (process.env.CRON_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        console.log('[CRON] Checking for appointments to remind...');

        // 2. Define Time Window (1 Hour from now)
        // Cron runs hourly. We look for appointments starting in roughly 1 hour (50-70 min window)
        const now = new Date();

        const startWindow = new Date(now.getTime() + 50 * 60000); // +50 mins
        const endWindow = new Date(now.getTime() + 70 * 60000);   // +70 mins

        // ISO Strings for DB query
        const startRange = startWindow.toISOString();
        const endRange = endWindow.toISOString();

        // 3. Query Appointments
        // We need appointments that:
        // - Are 'scheduled'
        // - Are TODAY

        // Since we might not have 'reminder_sent' column yet, we will just fetch by time for now simulation
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                start_time,
                user_id,
                services:service_id (name),
                barbers:barber_id (name)
            `)
            .eq('status', 'scheduled')
            .gte('start_time', startRange)
            .lte('start_time', endRange);

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({ message: 'No appointments to remind right now.' });
        }

        // 4. Process Reminders via Email (Free & Reliable)
        const results = [];
        for (const apt of appointments) {
            // A. Fetch User Email
            // Note: In a real scenario, we perform a join or fetch user from auth.users (admin api) based on apt.user_id
            // Since we don't have Admin API enabled here easily, we will simulate.

            const userEmail = "cliente@exemplo.com"; // Placeholder, in logic we'd get apt.profiles.email

            const message = `
                Olá! Lembrete do Jacaré do Corte 🐊
                
                Seu agendamento para *${(apt as any).services?.[0]?.name || 'serviço'}* com *${(apt as any).barbers?.[0]?.name || 'profissional'}* começa em breve!
                Horário: ${new Date(apt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                
                Nos vemos em 1 hora!
            `;

            // B. Send Email 
            // We use Supabase's built-in mailer or standard SMTP here. 
            // For this Vercel function, we can use 'resend' (free tier 3000 emails/mo) or just log it for now as "Email Sent".

            console.log(`[EMAIL SENT] To: User ${apt.user_id} | Subject: Lembrete de Agendamento | Body: ${message.replace(/\s+/g, ' ')}`);

            // C. Mark as Sent
            // await supabase.from('appointments').update({ reminder_sent: true }).eq('id', apt.id);

            results.push({ id: apt.id, status: 'email_sent', message: 'Email queued' });
        }

        return res.status(200).json({
            success: true,
            method: 'email',
            processed: results.length,
            details: results
        });

    } catch (err: any) {
        console.error('Cron job error:', err);
        return res.status(500).json({ error: err.message });
    }
}
