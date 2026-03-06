import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    if (!env.ELEVENLABS_API_KEY) {
        console.warn('[TTS] No hay API Key de ElevenLabs configurada.');
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
            const error = await response.text();
            console.error(`[TTS] Error de ElevenLabs: ${error}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tempDir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(tempDir, `reply_${sessionId}_${Date.now()}.mp3`);

        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (error) {
        console.error('[TTS] Error generando audio:', error);
        return null;
    }
}
