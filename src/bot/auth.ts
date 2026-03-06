import { Context, NextFunction } from 'grammy';
import { env } from '../config/env.js';

export async function authMiddleware(ctx: Context, next: NextFunction) {
    if (!ctx.from) return;

    const userId = ctx.from.id;
    console.log(`[Auth] Verificando usuario ${userId}. Lista permitida: ${env.ALLOWED_USERS.join(', ')}`);

    if (env.ALLOWED_USERS.includes(userId)) {
        await next();
    } else {
        console.warn(`[Auth] BLOQUEADO: ${userId} no está en la lista.`);
        await ctx.reply(`Che, perdón pero tu ID (${userId}) no está en mi lista de permitidos. Avisale al dueño.`);
    }
}
