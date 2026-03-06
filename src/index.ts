import * as http from 'http';
import { bot } from './bot/index.js';
import './db/index.js';
import { connectToMcpServer } from './mcp/index.js';

async function bootstrap() {
    console.log('🚀 Iniciando Mario...');

    // El MCP SQLite fue removido ya que ahora el agente utiliza Firebase Firestore
    // Podés agregar otros servidores MCP aquí usando \`connectToMcpServer\`

    // Levantamos un mini servidor web para que la Nube (Hugging Face / Render) no "duerma" a Mario
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mario Agent esta vivo y prestando atencion en Telegram\\n');
    });
    const PORT = process.env.PORT || 7860;
    server.listen(PORT, () => {
        console.log(`🌍 Corazón web latiendo en el puerto ${PORT}...`);
    });

    bot.start({
        onStart: (botInfo) => {
            console.log(`✅ Bot conectado correctamente como @${botInfo.username}`);
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
