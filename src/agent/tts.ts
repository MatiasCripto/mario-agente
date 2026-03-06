import fs from 'fs';
import path from 'path';

/**
 * Genera audio usando Google Translate TTS (gratuito, funciona en Render).
 * Limita a 200 caracteres para no superar el límite de la API.
 */
export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando audio (Google) para sesión ${sessionId}...`);

    try {
        // Limitar el texto a ~200 chars para respetar límite de Google TTS
        const snippedText = smartTruncate(text, 200);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(snippedText)}&tl=es&client=tw-ob&ttsspeed=0.9`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://translate.google.com/',
            }
        });

        if (!response.ok) {
            console.error(`[TTS] Error de Google TTS (Status ${response.status})`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 100) {
            console.error('[TTS] Audio recibido demasiado pequeño, descartando.');
            return null;
        }

        const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
        const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);
        fs.writeFileSync(filePath, buffer);

        console.log(`[TTS] Audio guardado (${buffer.length} bytes): ${filePath}`);
        return filePath;
    } catch (error: any) {
        console.error('[TTS] Excepción en Google TTS:', error.message);
        return null;
    }
}

/**
 * Corta el texto en el último punto o coma antes del límite,
 * para que la oración no quede cortada a la mitad.
 */
function smartTruncate(text: string, maxChars: number): string {
    // Eliminar markdown antes de convertir a audio
    const clean = text
        .replace(/\*\*(.*?)\*\*/g, '$1')  // negrita
        .replace(/\*(.*?)\*/g, '$1')       // cursiva
        .replace(/`(.*?)`/g, '$1')         // código
        .replace(/#+\s/g, '')              // títulos
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
        .trim();

    if (clean.length <= maxChars) return clean;

    // Intentar cortar en el último punto antes del límite
    const cutPoint = clean.lastIndexOf('.', maxChars);
    if (cutPoint > 50) return clean.substring(0, cutPoint + 1);

    // Si no hay punto, cortar en el último espacio
    const spacePoint = clean.lastIndexOf(' ', maxChars);
    if (spacePoint > 50) return clean.substring(0, spacePoint) + '...';

    return clean.substring(0, maxChars) + '...';
}
