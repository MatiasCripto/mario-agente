import * as http from 'http';
import * as dns from 'dns';
import { bot } from './bot/index.js';
import './db/index.js';
import { connectToMcpServer } from './mcp/index.js';

// HACK SUPREMO: Bypass de DNS para Telegram
// Si el sistema no encuentra api.telegram.org, le damos la dirección IP a mano
const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (hostname: string, options: any, callback: any) => {
    if (hostname === 'api.telegram.org') {
        console.log('🔮 Bypass de DNS activado para Telegram...');
        return originalLookup('149.154.167.220', options, callback);
    }
    return originalLookup(hostname, options, callback);
};

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function bootstrap() {
    console.log('🚀 Iniciando Mario...');

    // Test rápido de internet general
    try {
        const testRes = await fetch('https://www.google.com', { signal: AbortSignal.timeout(5000) });
        console.log(`🌍 Test de internet: ${testRes.ok ? 'EXITOSO (Google)' : 'FALLIDO'}`);
    } catch (e: any) {
        console.error('❌ INTERNET CAÍDO:', e.message);
    }

    // Debug de variables
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    if (token) {
        console.log(`📡 Token detectado: ${token.substring(0, 5)}...${token.substring(token.length - 4)} (Largo: ${token.length})`);
    } else {
        console.error('❌ ERROR: No se detectó ningún Token.');
    }

    // 1. Servidor web inmediato para evitar el "Sleeping" de la nube
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mario Agent activo\n');
    });
    const PORT = Number(process.env.PORT) || 7860;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌍 Corazón web latiendo en el puerto ${PORT}...`);
    });

    // 2. DIAGNÓSTICO DE RED: Verificamos DNS e Internet básico
    console.log('🔍 Iniciando diagnóstico de red...');

    dns.lookup('api.telegram.org', (err, address) => {
        console.log(`🌐 DNS api.telegram.org -> ${address || 'FALLIDO'} (${err ? err.message : 'OK'})`);
    });

    // 3. Reintentos de conexión con backoff
    let connected = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!connected && attempts < maxAttempts) {
        attempts++;
        try {
            console.log(`📡 Conectando a Telegram (Intento ${attempts}/${maxAttempts})...`);
            const me = await bot.api.getMe();
            console.log(`✅ ¡ÉXITO! Bot conectado como @${me.username}`);
            connected = true;
        } catch (err: any) {
            console.error(`❌ Fallo intento ${attempts}: ${err.message}`);

            if (err.message?.includes('409')) {
                console.error('🔥 CONFLICTO: Otro bot está usando este token.');
                process.exit(1);
            }

            if (attempts < maxAttempts) {
                const waitTime = Math.min(2000 * attempts, 10000); // 2s, 4s, 6s... máx 10s
                console.log(`⏳ Reintentando en ${waitTime / 1000}s...`);
                await new Promise(r => setTimeout(r, waitTime));
            }
        }
    }

    if (!connected) {
        console.error('💀 Game Over: No hay conexión con Telegram.');
        process.exit(1);
    }

    console.log('🎮 Mario escuchando mensajes...');
    bot.start({
        onStart: (botInfo) => {
            console.log(`✨ Sesión oficialmente abierta para @${botInfo.username}`);
        }
    });

    process.once('SIGINT', () => { bot.stop(); process.exit(0); });
    process.once('SIGTERM', () => { bot.stop(); process.exit(0); });
}

bootstrap().catch(console.error);
