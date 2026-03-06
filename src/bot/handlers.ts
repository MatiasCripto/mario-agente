import { Bot, Context } from 'grammy';
import { processUserMessage } from '../agent/loop.js';
import { transcribeAudio } from '../agent/llm.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

async function sendAgentResponse(ctx: Context, response: string) {
    // Si la respuesta contiene una URL de imagen o video de las que generamos, la mandamos correctamente
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

    // Manejador para mensajes de VOZ y AUDIO
    bot.on(['message:voice', 'message:audio'], async (ctx: Context) => {
        console.log('[Bot] Recibido mensaje de audio/voz');
        if (!ctx.from) return;

        const sessionId = String(ctx.from.id);
        let statusMsg;

        try {
            statusMsg = await ctx.reply("⏳ Bajando el audio...");
            await ctx.replyWithChatAction('typing');

            // 1. Conseguir info del archivo
            const file = await ctx.getFile();
            if (!file || !file.file_path) {
                return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "❌ No pude localizar el archivo en Telegram.");
            }

            // 2. Descargarlo
            const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
                return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "❌ Error al descargar el audio de los servidores de Telegram.");
            }
            const arrayBuffer = await fileResponse.arrayBuffer();

            // 3. Guardarlo en /tmp
            const tempFilePath = path.join('/tmp', `audio_${sessionId}_${Date.now()}.ogg`);
            fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

            await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "🧠 Transcribiendo con Groq Whisper...");

            // 4. Transcribir el audio
            const transcribedText = await transcribeAudio(tempFilePath);

            // 5. Borrar el archivo
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            if (!transcribedText || transcribedText.trim() === '') {
                return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "🤷‍♂️ No entendí nada del audio. ¿Está muy bajito?");
            }

            // Avisamos qué escuchamos y borramos el mensaje de estado
            await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
            await ctx.reply(`_Escuché:_ "${transcribedText}"`, { parse_mode: "Markdown" });

            // 6. Pasarle el texto transcrito al cerebro
            const response = await processUserMessage(sessionId, transcribedText);
            await sendAgentResponse(ctx, response);

        } catch (error: any) {
            console.error('[Bot Handler] Error procesando audio:', error);
            if (statusMsg) {
                await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, `❌ Error: ${error.message || 'Desconocido'}`);
            } else {
                await ctx.reply('Che, se armó lío con el audio. Mandámelo por texto mejor.');
            }
        }
    });
}
