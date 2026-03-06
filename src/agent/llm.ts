import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import fs from 'fs';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const openRouter = env.OPENROUTER_API_KEY ? new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY,
}) : null;

export async function generateCompletion(
    messages: any[],
    tools?: any[]
): Promise<any> {
    const groqModel = 'llama-3.3-70b-versatile';

    try {
        const payload: any = {
            model: groqModel,
            messages,
            temperature: 0.1,
        };
        if (tools && tools.length > 0) {
            payload.tools = tools;
            payload.tool_choice = 'auto';
        }

        console.log(`[LLM] Enviando consulta (${messages.length} mensajes)...`);
        const response = await groq.chat.completions.create(payload);
        const choice = response.choices[0];
        console.log(`[LLM] Recibido: ${choice.message.tool_calls ? `Tool Call: ${choice.message.tool_calls[0].function.name}` : 'Respuesta de texto'}`);
        return choice.message;
    } catch (error: any) {
        if (error.status === 429 && openRouter) {
            console.warn('⚠️ Límite de Groq alcanzado. Usando OpenRouter como fallback...');
            const payload: any = {
                model: env.OPENROUTER_MODEL,
                messages,
                temperature: 0.2,
            };
            if (tools && tools.length > 0) {
                payload.tools = tools;
                payload.tool_choice = 'auto';
            }
            const response = await openRouter.chat.completions.create(payload);
            return response.choices[0].message;
        }
        console.error('❌ Error en el LLM:', error);
        throw error;
    }
}

export async function transcribeAudio(filePath: string): Promise<string> {
    console.log(`[Whisper] Transcribiendo archivo: ${filePath}...`);
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3-turbo",
            prompt: "El mensaje está en español, posiblemente rioplatense (Argentina).",
            language: "es",
            response_format: "json", // o 'text'
        });

        return transcription.text;
    } catch (error: any) {
        console.error('❌ Error transcribiendo audio con Groq:', error);
        return "";
    }
}
