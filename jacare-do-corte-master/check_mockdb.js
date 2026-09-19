// Script para verificar MockDB (localStorage)
console.log('🔍 Verificando MockDB (localStorage)...\n');

// Simular localStorage
const mockData = {
    'jacare_appointments': '[]',
    'jacare_users_status_v5': '{}',
    'jacare_pending_requests_v5': '[]'
};

console.log('📋 Chaves esperadas no localStorage:');
console.log('1. jacare_appointments - Agendamentos');
console.log('2. jacare_users_status_v5 - Status dos usuários');
console.log('3. jacare_pending_requests_v5 - Solicitações pendentes\n');

console.log('💡 INSTRUÇÕES PARA VERIFICAR NO NAVEGADOR:');
console.log('1. Abra o DevTools (F12)');
console.log('2. Vá na aba "Console"');
console.log('3. Digite: localStorage.getItem("jacare_appointments")');
console.log('4. Pressione Enter');
console.log('5. Copie o resultado e me envie\n');

console.log('Ou verifique na aba "Application" > "Local Storage" > "http://localhost:5173"');
