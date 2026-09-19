// Debug script - Verificar agendamentos no Supabase
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não encontradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAppointments() {
    console.log('🔍 Verificando agendamentos no Supabase...\n');

    try {
        // Teste 1: Buscar todos os agendamentos (sem JOIN)
        console.log('📋 Teste 1: Buscando agendamentos básicos...');
        const { data: basicData, error: basicError } = await supabase
            .from('appointments')
            .select('*')
            .order('start_time', { ascending: true });

        if (basicError) {
            console.error('❌ Erro:', basicError.message);
        } else {
            console.log(`✅ Encontrados ${basicData?.length || 0} agendamentos`);
            if (basicData && basicData.length > 0) {
                console.log('\nPrimeiro agendamento:');
                console.log(JSON.stringify(basicData[0], null, 2));
            }
        }

        // Teste 2: Tentar com JOIN (sintaxe antiga)
        console.log('\n📋 Teste 2: Tentando JOIN com sintaxe antiga (profiles:user_id)...');
        const { data: oldJoinData, error: oldJoinError } = await supabase
            .from('appointments')
            .select(`
                *,
                profiles:user_id (full_name, phone),
                services:service_id (name, price),
                barbers:barber_id (name)
            `)
            .order('start_time', { ascending: true });

        if (oldJoinError) {
            console.error('❌ Erro:', oldJoinError.message);
        } else {
            console.log(`✅ Sucesso! ${oldJoinData?.length || 0} agendamentos`);
        }

        // Teste 3: Tentar com JOIN (sintaxe nova)
        console.log('\n📋 Teste 3: Tentando JOIN com sintaxe nova (profiles!user_id)...');
        const { data: newJoinData, error: newJoinError } = await supabase
            .from('appointments')
            .select(`
                *,
                profiles!user_id (full_name, phone),
                services!service_id (name, price),
                barbers!barber_id (name)
            `)
            .order('start_time', { ascending: true });

        if (newJoinError) {
            console.error('❌ Erro:', newJoinError.message);
        } else {
            console.log(`✅ Sucesso! ${newJoinData?.length || 0} agendamentos`);
            if (newJoinData && newJoinData.length > 0) {
                console.log('\nPrimeiro agendamento com JOIN:');
                console.log(JSON.stringify(newJoinData[0], null, 2));
            }
        }

        // Teste 4: Verificar tabelas relacionadas
        console.log('\n📋 Teste 4: Verificando tabelas relacionadas...');

        const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone').limit(3);
        console.log(`Profiles: ${profiles?.length || 0} registros`);

        const { data: services } = await supabase.from('services').select('id, name, price').limit(3);
        console.log(`Services: ${services?.length || 0} registros`);

        const { data: barbers } = await supabase.from('barbers').select('id, name').limit(3);
        console.log(`Barbers: ${barbers?.length || 0} registros`);

        // Teste 5: Verificar agendamentos de hoje
        console.log('\n📋 Teste 5: Agendamentos de HOJE...');
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

        const { data: todayData, error: todayError } = await supabase
            .from('appointments')
            .select('*')
            .gte('start_time', startOfDay)
            .lt('start_time', endOfDay);

        if (todayError) {
            console.error('❌ Erro:', todayError.message);
        } else {
            console.log(`✅ Agendamentos de hoje: ${todayData?.length || 0}`);
            if (todayData && todayData.length > 0) {
                todayData.forEach((apt, i) => {
                    console.log(`  ${i + 1}. ${apt.start_time} - Status: ${apt.status}`);
                });
            }
        }

    } catch (err) {
        console.error('❌ Erro geral:', err);
    }
}

debugAppointments();
