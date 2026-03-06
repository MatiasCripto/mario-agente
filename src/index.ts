import * as http from 'http';
import { bot } from './bot/index.js';
import './db/index.js';
import { connectToMcpServer } from './mcp/index.js';

async function bootstrap() {
    console.log('🚀 Iniciando Mario...');

    // Verificación de salud del Token antes de arrancar
    try {
        const me = await bot.api.getMe();
        console.log(`✅ Conexión con Telegram exitosa. Soy: @${me.username} (ID: ${me.id})`);
    } catch (err: any) {
        console.error('❌ ERROR CRÍTICO: No se pudo conectar con Telegram. ¿El Token es válido?');
        console.error('Detalle del error:', err.message);
        if (err.message?.includes('409')) {
            console.error('🔥 CONFLICTO: El bot ya está corriendo en otro lado. ¡Cerrá todas las otras consolas!');
        }
        process.exit(1);
    }

    // El MCP SQLite fue removido ya que ahora el agente utiliza Firebase Firestore
    // Podés agregar otros servidores MCP aquí usando `connectToMcpServer`

    // Levantamos un mini servidor web para que la Nube (Hugging Face / Render) no "duerma" a Mario
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mario Agent esta vivo y prestando atencion en Telegram\n');
    });
    const PORT = process.env.PORT || 7860;
    server.listen(PORT, () => {
        console.log(`🌍 Corazón web latiendo en el puerto ${PORT}...`);
    });

    console.log('📡 Iniciando polling de mensajes...');
    bot.start({
        onStart: (botInfo) => {
            console.log(`✨ Mario escuchando oficialmente en @${botInfo.username}`);
        }
    });

    process.once('SIGINT', () => {
        console.log('Apagando bot...');
        bot.stop();
    });
    process.once('SIGTERM', () => {
        console.log('Apagando bot...');
        bot.stop();
    });
}

bootstrap().catch(console.error);
