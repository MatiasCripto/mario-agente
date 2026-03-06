import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { authMiddleware } from './auth.js';
import { setupHandlers } from './handlers.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.use(async (ctx, next) => {
    if (ctx.from && ctx.message?.text) {
        console.log(`[Telegram] Mensaje entrante de ${ctx.from.id}`);
    }
    await next();
});

// Proteger todas las rutas con el whitelist
bot.use(authMiddleware);

setupHandlers(bot);

bot.catch((err) => {
    console.error('❌ [Telegram Bot Error] Error en grammy:', err);
});
