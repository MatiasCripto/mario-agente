import { Context, NextFunction } from 'grammy';
import { env } from '../config/env.js';

export async function authMiddleware(ctx: Context, next: NextFunction) {
    if (!ctx.from) return;

    if (env.ALLOWED_USERS.includes(ctx.from.id)) {
        await next();
    } else {
        console.warn(`[Auth] Intento de acceso bloqueado del usuario: ${ctx.from.id} (@${ctx.from.username || 'sin_usuario'})`);
        // Para máxima seguridad, ignoramos silenciosamente a usuarios no autorizados
    }
}
