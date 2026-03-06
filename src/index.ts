import * as http from 'http';
import { bot } from './bot/index.js';
import './db/index.js';
import { connectToMcpServer } from './mcp/index.js';

async function bootstrap() {
    console.log('🚀 Iniciando Mario...');

    // 1. Levantamos el servidor web AL TOQUE para que la nube no nos mate por "unhealthy"
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mario Agent esta vivo y prestando atencion en Telegram\n');
    });
    const PORT = Number(process.env.PORT) || 7860;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌍 Corazón web latiendo en el puerto ${PORT}...`);
    });

    // 2. Intentamos conectar con Telegram con reintentos (paciencia para la nube)
    let connected = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!connected && attempts < maxAttempts) {
        attempts++;
        try {
            console.log(`📡 Intentando conectar con Telegram (Intento ${attempts}/${maxAttempts})...`);
            const me = await bot.api.getMe();
            console.log(`✅ ¡Conexión exitosa! Soy: @${me.username}`);
            connected = true;
        } catch (err: any) {
            console.error(`❌ Intento ${attempts} falló: ${err.message}`);
            if (err.message?.includes('409')) {
                console.error('🔥 CONFLICTO: El bot ya está corriendo en otro lado. ¡Cerrá todo!');
                process.exit(1);
            }
            if (attempts < maxAttempts) {
                console.log('⏳ Esperando 5 segundos para reintentar...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    if (!connected) {
        console.error('💀 No se pudo conectar a Telegram después de varios intentos. Muriendo...');
        process.exit(1);
    }

    console.log('✨ Iniciando Mario en modo polling...');
    bot.start({
        onStart: (botInfo) => {
            console.log(`🎮 Mario escuchando oficialmente en @${botInfo.username}`);
        }
    });

    process.once('SIGINT', () => { bot.stop(); process.exit(0); });
    process.once('SIGTERM', () => { bot.stop(); process.exit(0); });
}

bootstrap().catch(console.error);
