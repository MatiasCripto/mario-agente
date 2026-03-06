import fs from 'fs';
import path from 'path';

/**
 * Genera audio usando StreamElements TTS (Amazon Polly por detrás).
 * 100% gratuito, sin API key, voz masculina natural en español.
 */
export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando voz (StreamElements/Polly) para sesión ${sessionId}...`);

    try {
        const cleanText = cleanMarkdown(text).substring(0, 300);

        // Voces masculinas en español disponibles en StreamElements:
        // 'Miguel' (es-US), 'Enrique' (es-ES), 'Antonio' (es-MX)
        // Miguel suena más latinoamericano y natural
        const voice = 'Miguel';
        const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(cleanText)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            console.error(`[TTS] Error de StreamElements TTS (Status ${response.status})`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 500) {
            console.error(`[TTS] Audio demasiado pequeño (${buffer.length} bytes), posible error.`);
            return null;
        }

        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);
        fs.writeFileSync(filePath, buffer);

        console.log(`[TTS] Audio guardado OK (${buffer.length} bytes): ${filePath}`);
        return filePath;

    } catch (error: any) {
        console.error('[TTS] Excepción en StreamElements TTS:', error.message);
        return null;
    }
}

/**
 * Limpia el markdown del texto para que suene natural al leerlo en voz alta.
 */
function cleanMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')   // **negrita**
        .replace(/\*(.*?)\*/g, '$1')         // *cursiva*
        .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // `código`
        .replace(/#+\s/g, '')                // # Títulos
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // [links](url)
        .replace(/^\s*[-*]\s/gm, '')        // - listas
        .replace(/\n{2,}/g, '. ')           // doble salto -> pausa
        .replace(/\n/g, ' ')                // salto -> espacio
        .trim();
}
