import { Bot, Context, InputFile } from 'grammy';
import { processUserMessage } from '../agent/loop.js';
import { transcribeAudio } from '../agent/llm.js';
import { textToSpeech } from '../agent/tts.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

async function sendAgentResponse(ctx: Context, response: string, shouldVoice: boolean = false) {
    const sessionId = String(ctx.from?.id);

    // Si queremos respuesta de voz (ElevenLabs)
    if (shouldVoice && env.ELEVENLABS_API_KEY) {
        try {
            await ctx.replyWithChatAction('record_voice');
            const audioPath = await textToSpeech(response, sessionId);
            if (audioPath && fs.existsSync(audioPath)) {
                await ctx.replyWithVoice(new InputFile(audioPath));
                fs.unlinkSync(audioPath); // Borramos el temporal
            }
        } catch (err) {
            console.error('[Bot] Error enviando respuesta de voz:', err);
        }
    }

    // Respuesta de texto / media original
    if (response.includes('https://image.pollinations.ai')) {
        const urlMatch = response.match(/https:\/\/image\.pollinations\.ai[^\s]*/);
        if (urlMatch) {
            await ctx.replyWithPhoto(urlMatch[0], { caption: response.replace(urlMatch[0], '').trim() || '¡Acá tenés!' });
        } else {
            await ctx.reply(response);
        }
    } else if (response.includes('https://video.pollinations.ai')) {
        const urlMatch = response.match(/https:\/\/video\.pollinations\.ai[^\s]*/);
        if (urlMatch) {
            await ctx.replyWithVideo(urlMatch[0], { caption: response.replace(urlMatch[0], '').trim() || '¡Acá tenés el video!' });
        } else {
            await ctx.reply(response);
        }
    } else {
        await ctx.reply(response);
    }
}

export function setupHandlers(bot: Bot) {
    bot.command('start', async (ctx: Context) => {
        await ctx.reply('¡Qué onda! Soy Mario, tu agente de IA personal. Listo para laburar, ¿en qué andamos?');
    });

    bot.on('message:text', async (ctx: Context) => {
        if (!ctx.from || !ctx.message?.text) return;

        const sessionId = String(ctx.from.id);
        const userMessage = ctx.message.text;

        try {
            await ctx.replyWithChatAction('typing');

            // Llamamos al cerebro del agente
            const response = await processUserMessage(sessionId, userMessage);
            await sendAgentResponse(ctx, response);
        } catch (error) {
            console.error('[Bot Handler] Error procesando mensaje de texto:', error);
            await ctx.reply('Che, se me complicó procesar el mensaje. Probá de nuevo en un ratito.');
        }
    });

    // Manejador infalible para mensajes de VOZ y AUDIO
    bot.on([':voice', ':audio'], async (ctx: Context) => {
        console.log('[Bot] Recibido audio/voz');
        if (!ctx.from) return;

        const sessionId = String(ctx.from.id);
        let statusMsg;
        let tempFilePath = "";

        try {
            statusMsg = await ctx.reply("⏳ Escuchando audio...");
            await ctx.replyWithChatAction('typing');

            const file = await ctx.getFile();
            if (!file || !file.file_path) {
                return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "❌ Telegram no me pasó el archivo.");
            }

            const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const fileResponse = await fetch(fileUrl);
            const arrayBuffer = await fileResponse.arrayBuffer();

            // Usamos /tmp en nube, o carpeta local si falla
            const dir = fs.existsSync('/tmp') ? '/tmp' : process.cwd();
            tempFilePath = path.join(dir, `audio_${sessionId}_${Date.now()}.ogg`);

            fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

            await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "🧠 Procesando voz...");

            const transcribedText = await transcribeAudio(tempFilePath);

            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            if (!transcribedText || transcribedText.trim() === '') {
                return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "🤷‍♂️ No te entendí nada, che. ¿Podés repetir?");
            }

            await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
            await ctx.reply(`_Escuché:_ "${transcribedText}"`, { parse_mode: "Markdown" });

            const response = await processUserMessage(sessionId, transcribedText);
            await sendAgentResponse(ctx, response, true); // Devolvemos voz si nos mandaron voz

        } catch (error: any) {
            console.error('[Bot Handler] Error audio:', error);
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (statusMsg) {
                await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, `❌ Error: ${error.message || 'Desconocido'}`);
            }
        }
    });
}
