import fs from 'fs';
import path from 'path';

/**
 * Genera un audio usando Google Translate TTS (100% Gratis y sin bloqueos de IP)
 */
export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando audio gratis (Google) para sesión ${sessionId}...`);

    try {
        // Limitamos a 200 caracteres para evitar errores de Google Translate TTS
        const cleanText = text.substring(0, 200);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=es-AR&client=tw-ob`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`[TTS] Error de Google TTS (Status ${response.status})`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);

        fs.writeFileSync(filePath, buffer);
        console.log(`[TTS] Audio de Google guardado en: ${filePath}`);
        return filePath;
    } catch (error: any) {
        console.error('[TTS] Excepción en Google TTS:', error.message);
        return null;
    }
}
