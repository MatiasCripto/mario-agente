import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando audio para la sesión ${sessionId}. Texto: "${text.substring(0, 30)}..."`);

    if (!env.ELEVENLABS_API_KEY) {
        console.warn('[TTS] No hay API Key de ElevenLabs configurada en el entorno.');
        return null;
    }

    const voiceId = env.ELEVENLABS_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS] Error de API ElevenLabs (Status ${response.status}): ${errorText}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determinar directorio temporal seguro
        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);

        console.log(`[TTS] Guardando audio en: ${filePath}`);
        fs.writeFileSync(filePath, buffer);

        if (fs.existsSync(filePath)) {
            console.log(`[TTS] Audio generado correctamente (${buffer.length} bytes).`);
            return filePath;
        } else {
            console.error('[TTS] Error: El archivo no se creó en el sistema.');
            return null;
        }
    } catch (error: any) {
        console.error('[TTS] Excepción en ElevenLabs:', error.message);
        return null;
    }
}
