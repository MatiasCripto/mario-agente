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

    bot.on('message:voice', async (ctx: Context) => {
        if (!ctx.from || !ctx.message?.voice) return;

        const sessionId = String(ctx.from.id);

        try {
            await ctx.replyWithChatAction('typing'); // O 'record_voice' si quisiéramos mandar audio, pero respondemos con texto

            // 1. Conseguir info del archivo desde Telegram
            const file = await ctx.getFile();
            if (!file || !file.file_path) {
                return ctx.reply("Che, Telegram no me dejó leer ese audio.");
            }

            // 2. Descargarlo
            const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const fileResponse = await fetch(fileUrl);
            const arrayBuffer = await fileResponse.arrayBuffer();

            // 3. Guardarlo localmente por un segundito
            const tempFilePath = path.join(process.cwd(), `temp_${sessionId}_${Date.now()}.ogg`);
            fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

            // 4. Transcribir el audio usando el modelo Whisper de Groq
            const transcribedText = await transcribeAudio(tempFilePath);

            // 5. Borrar el archivo porque ya no sirve
            fs.unlinkSync(tempFilePath);

            if (!transcribedText || transcribedText.trim() === '') {
                return ctx.reply("Che, no pude escuchar o entender nada de ese audio. ¿Podés repetirlo?");
            }

            // (Opcional) Confirmarle al usuario lo que escuchamos para que vea que anduvo bien
            await ctx.reply(`_Escuché:_ "${transcribedText}"`, { parse_mode: "Markdown" });

            // 6. Pasarle el texto transcrito al cerebro (exactamente igual que si hubiera escrito)
            const response = await processUserMessage(sessionId, transcribedText);
            await sendAgentResponse(ctx, response);

        } catch (error) {
            console.error('[Bot Handler] Error procesando audio:', error);
            await ctx.reply('Che, se armó lío con el mensaje de voz. Mandamelo por texto por ahora.');
        }
    });
}
