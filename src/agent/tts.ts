import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const VOICE = 'es-AR-TomasNeural'; // Masculina, argentina, neural

function getEdgeTTSUrl(): string {
    const trustedClientToken = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${trustedClientToken}&ConnectionId=${randomUUID().replace(/-/g, '')}`;
    return wsUrl;
}

function buildSSML(text: string): string {
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-AR'>
        <voice name='${VOICE}'>
            <prosody rate='+0%' pitch='+0Hz'>${text.replace(/[<>&'"]/g, ' ')}</prosody>
        </voice>
    </speak>`;
}

function buildConfigMessage(): string {
    return `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
}

function buildSSMLMessage(requestId: string, ssml: string): string {
    return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
}

export async function textToSpeech(text: string, sessionId: string): Promise<string | null> {
    console.log(`[TTS] Generando voz (Microsoft ${VOICE}) para sesión ${sessionId}...`);

    return new Promise((resolve) => {
        const requestId = randomUUID().replace(/-/g, '');
        const audioChunks: Buffer[] = [];
        let timeout: NodeJS.Timeout;

        try {
            const ws = new WebSocket(getEdgeTTSUrl(), {
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                }
            });

            timeout = setTimeout(() => {
                console.error('[TTS] Timeout esperando respuesta de Microsoft.');
                ws.close();
                resolve(null);
            }, 15000);

            ws.on('open', () => {
                ws.send(buildConfigMessage());
                ws.send(buildSSMLMessage(requestId, buildSSML(text)));
            });

            ws.on('message', (data: Buffer | string) => {
                if (Buffer.isBuffer(data)) {
                    // Los mensajes binarios contienen audio después del header "Path:audio"
                    const separator = Buffer.from('Path:audio\r\n\r\n');
                    const idx = data.indexOf(separator);
                    if (idx !== -1) {
                        audioChunks.push(data.subarray(idx + separator.length));
                    }
                } else if (typeof data === 'string' && data.includes('Path:turn.end')) {
                    clearTimeout(timeout);
                    ws.close();

                    if (audioChunks.length === 0) {
                        console.error('[TTS] No se recibieron chunks de audio.');
                        resolve(null);
                        return;
                    }

                    const combined = Buffer.concat(audioChunks);
                    const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
                    const filePath = path.join(dir, `reply_${sessionId}_${Date.now()}.mp3`);
                    fs.writeFileSync(filePath, combined);
                    console.log(`[TTS] Audio Microsoft guardado (${combined.length} bytes): ${filePath}`);
                    resolve(filePath);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                console.error('[TTS] Error WebSocket Microsoft:', err.message);
                resolve(null);
            });

        } catch (error: any) {
            console.error('[TTS] Excepción general:', error.message);
            resolve(null);
        }
    });
}
