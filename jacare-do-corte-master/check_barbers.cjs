
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lezvjadkobrakzynnfty.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlenZqYWRrb2JyYWt6eW5uZnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTg3MzYsImV4cCI6MjA3ODc3NDczNn0.InGWuCenmVubzlXdpXo8bzQkXVtY-oDIgpSlh6n5yY8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBarbers() {
    const { data, error } = await supabase
        .from('barbers')
        .select('*');

    if (error) {
        console.error('Erro ao buscar barbeiros:', error);
        return;
    }

    console.log('Barbeiros encontrados:', data);

    // Atualizar avatar se estiver nulo ou vazio
    const jacare = data.find(b => b.name === 'Jacaré');
    if (jacare) {
        if (!jacare.avatar_url || jacare.avatar_url.trim() === '') {
            console.log('Atualizando avatar do Jacaré...');
            const { error: updateError } = await supabase
                .from('barbers')
                .update({ avatar_url: '/logo_jacare.jpg' })
                .eq('id', jacare.id);

            if (updateError) {
                console.error('Erro ao atualizar:', updateError);
            } else {
                console.log('Avatar atualizado com sucesso!');
            }
        } else {
            console.log('Avatar do Jacaré já está definido como:', jacare.avatar_url);

            // Se já está definido mas não é o logo correto, vamos forçar a atualização
            if (jacare.avatar_url !== '/logo_jacare.jpg') {
                console.log('Forçando atualização para /logo_jacare.jpg');
                const { error: forceUpdateError } = await supabase
                    .from('barbers')
                    .update({ avatar_url: '/logo_jacare.jpg' })
                    .eq('id', jacare.id);

                if (forceUpdateError) console.error('Erro ao forçar update:', forceUpdateError);
                else console.log('Avatar forçado para o logo correto!');
            }
        }
    } else {
        console.log('Barbeiro Jacaré não encontrado! Criando...');
        const { error: insertError } = await supabase
            .from('barbers')
            .insert([{ name: 'Jacaré', avatar_url: '/logo_jacare.jpg' }]);

        if (insertError) console.error('Erro ao criar Jacaré:', insertError);
        else console.log('Jacaré criado com sucesso!');
    }
}

checkBarbers();
