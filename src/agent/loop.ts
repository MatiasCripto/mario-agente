import { generateCompletion } from './llm.js';
import { getAllToolsDefinitions, executeTool } from '../tools/registry.js';
import { getMessages, saveMessage } from '../db/index.js';

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Sos Mario, mi agente de IA personal avanzado. 
REGLAS DE ORO MANDATORIAS:
1. Hablá SIEMPRE en español rioplatense (Argentina), usá "vos", "che", "viste", pero mantené la utilidad y clase.
2. SOS UN AGENTE DE ACCIÓN. Si el usuario te PIED EXPLÍCITAMENTE usar una herramienta, simplemente EJECUTALA en el primer turno.
3. Si el usuario solo quiere charlar o te hace una pregunta general, charlá normal. NO INVENTES llamadas a herramientas si no son necesarias.
4. TUS PODERES ACTUALES: Podés leer texto, podés generar imágenes explícitamente usando 'generate_image', y PODÉS ESCUCHAR AUDIOS DE VOZ. Todo mensaje de voz que el usuario te mande por Telegram será transcrito automáticamente a texto para que lo leas. Nunca digas que no podés escuchar audios.
5. Tus respuestas finales tienen que ser naturales y directas. No seas un asistente aburrido, tené personalidad.`;

export async function processUserMessage(sessionId: string, userMessage: string): Promise<string> {
    const userMsgObj = { role: 'user', content: userMessage };
    await saveMessage(sessionId, userMsgObj);

    const history = await getMessages(sessionId);

    const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history
    ];

    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
        iterations++;

        try {
            // Obtenemos toooooodas las herramientas (locales y de MCP) antes de cada llamada
            const currentTools = await getAllToolsDefinitions();

            const llmMessage = await generateCompletion(messages, currentTools);
            messages.push(llmMessage);
            await saveMessage(sessionId, llmMessage);

            if (llmMessage.tool_calls && llmMessage.tool_calls.length > 0) {
                for (const toolCall of llmMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

                    console.log(`[Agente] Ejecutando: ${toolName}`, toolArgs);

                    let result;
                    try {
                        result = await executeTool(toolName, toolArgs);
                    } catch (e: any) {
                        result = `Error: ${e.message}`;
                    }

                    const toolMsg = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: String(result)
                    };
                    messages.push(toolMsg);
                    await saveMessage(sessionId, toolMsg);
                }
            } else {
                if (llmMessage.content) {
                    return llmMessage.content;
                } else {
                    return "Che, hubo un problema y la respuesta vino vacía.";
                }
            }
        } catch (error) {
            console.error('[Agent Loop] Error:', error);
            return "Perdón, me mandé una macana o falló la conexión con el modelo. Bancá un toque y volvé a intentar.";
        }
    }

    return "Llegué al límite de iteraciones sin poder darte una respuesta final. Revisemos esto después.";
}
