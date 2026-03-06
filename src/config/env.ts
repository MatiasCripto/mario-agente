import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, 'Token de Telegram es obligatorio'),
    TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, 'IDs permitidos son obligatorios'),
    GROQ_API_KEY: z.string().min(1, 'API Key de Groq es obligatoria'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openrouter/free'),
    DB_PATH: z.string().default('./memory.db'),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Error configurando variables de entorno:', _env.error.format());
    process.exit(1);
}

export const env = {
    ..._env.data,
    ALLOWED_USERS: _env.data.TELEGRAM_ALLOWED_USER_IDS.split(',').map(id => Number(id.trim())),
};
