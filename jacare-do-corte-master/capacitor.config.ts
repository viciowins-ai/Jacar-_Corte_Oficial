import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'app.vercel.jacaredocorte.twa',
    appName: 'Jacaré do Corte',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
