import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { authMiddleware } from './auth.js';
import { setupHandlers } from './handlers.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.use(async (ctx, next) => {
    console.log(`[Telegram] Evento entrante de ${ctx.from?.id} (@${ctx.from?.username}) - Tipo: ${ctx.message ? Object.keys(ctx.message).join(',') : 'desconocido'}`);
    await next();
});

// Comando de emergencia para ver si el bot está VIVO (antes de cualquier seguridad)
bot.command('test', async (ctx) => {
    console.log('[Test] Recibido comando /test');
    await ctx.reply('🚀 ¡MARIO ESTÁ VIVO Y CONECTADO!');
});

// Proteger todas las rutas con el whitelist
bot.use(authMiddleware);

setupHandlers(bot);

console.log('🏁 Configuración de manejadores completada.');

bot.catch((err) => {
    console.error('❌ [Telegram Bot Error] Error en grammy:', err);
});
