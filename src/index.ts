import * as http from 'http';
import { bot } from './bot/index.js';
import './db/index.js';
import { connectToMcpServer } from './mcp/index.js';

async function bootstrap() {
    console.log('🚀 Iniciando Mario (Modo Simple)...');

    // 1. Servidor web para la salud de la nube
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mario Agent esta vivo\n');
    });
    const PORT = Number(process.env.PORT) || 7860;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌍 Corazón web en puerto ${PORT}`);
    });

    // 2. Intento de conexión directo
    try {
        console.log('📡 Llamando a Telegram...');
        const me = await bot.api.getMe();
        console.log(`✅ ¡CONECTADO! Soy @${me.username}`);

        console.log('✨ Mario empezando a escuchar...');
        await bot.start({
            onStart: (botInfo) => {
                console.log(`🎮 Bot oficial: @${botInfo.username}`);
            }
        });
    } catch (err: any) {
        console.error('❌ ERROR DE CONEXIÓN:', err.message);
        console.log('💡 Tip: Si ves "ENOTFOUND", la nube no encuentra a Telegram.');
        process.exit(1);
    }
}

bootstrap().catch(err => {
    console.error('💥 ERROR FATAL:', err);
    process.exit(1);
});
