import fs from 'fs';
import path from 'path';

/**
 * Genera audio usando Microsoft Edge Neural TTS.
 * Voz: es-AR-TomasNeural (masculina, acento argentino, muy natural).
 * Es completamente gratis y no requiere API key.
 */
export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando voz (Microsoft Tomas/AR) para sesión ${sessionId}...`);

    try {
        // Importamos dinámicamente para evitar problemas de ESM/CJS
        const { MsEdgeTTS, OUTPUT_FORMAT } = await import('edge-tts-node');

        const tts = new MsEdgeTTS();
        await tts.setMetadata(
            'es-AR-TomasNeural',          // Voz masculina argentina
            OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
        );

        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);

        await tts.toFile(filePath, text);

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            console.log(`[TTS] Audio guardado en ${filePath}`);
            return filePath;
        } else {
            console.error('[TTS] El archivo de audio quedó vacío.');
            return null;
        }
    } catch (error: any) {
        console.error('[TTS] Error con Microsoft Edge TTS:', error.message);
        // Fallback: Google Translate TTS si falla Microsoft
        return fallbackGoogleTTS(text, sessionId);
    }
}

async function fallbackGoogleTTS(text: string, sessionId: string): Promise<string | null> {
    console.log('[TTS] Usando fallback de Google TTS...');
    try {
        const cleanText = text.substring(0, 200);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=es&client=tw-ob`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_fallback_${Date.now()}.mp3`);
        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch {
        return null;
    }
}
