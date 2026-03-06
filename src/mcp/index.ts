import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Estructura para tener múltiples clientes MCP si el usuario lo quisiera a futuro
export const mcpClients: Record<string, Client> = {};

export async function connectToMcpServer(serverName: string, command: string, args: string[], env?: Record<string, string>) {
    console.log(`[MCP] Conectando al servidor MCP '${serverName}' vía stdio...`);

    const transport = new StdioClientTransport({
        command,
        args,
        env,
    });

    const client = new Client(
        { name: "mario-agent", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        mcpClients[serverName] = client;
        console.log(`✅ [MCP] Servidor '${serverName}' conectado!`);
        return client;
    } catch (error) {
        console.error(`❌ [MCP] Falló la conexión al servidor '${serverName}':`, error);
        throw error;
    }
}

// Mapeo interno para saber a qué servidor pertenece cada herramienta
const toolToServerMap: Record<string, string> = {};

export async function getMcpTools() {
    const allTools: any[] = [];

    for (const [serverName, client] of Object.entries(mcpClients)) {
        try {
            const response = await client.listTools();
            const formattedTools = (response.tools || []).map(tool => {
                // Guardamos el mapeo herramienta -> servidor
                toolToServerMap[tool.name] = serverName;

                return {
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description || `Herramienta MCP: ${tool.name}`,
                        parameters: tool.inputSchema || { type: 'object', properties: {} },
                    }
                };
            });

            allTools.push(...formattedTools);
        } catch (error) {
            console.error(`[MCP] Error listando tools de ${serverName}:`, error);
        }
    }

    return allTools;
}

export function getServerForTool(toolName: string): string | undefined {
    return toolToServerMap[toolName];
}

export async function executeMcpTool(serverName: string, toolName: string, args: any) {
    const client = mcpClients[serverName];
    if (!client) {
        throw new Error(`Servidor MCP '${serverName}' no está conectado.`);
    }

    console.log(`[MCP] Llamando herramienta '${toolName}' en '${serverName}'...`);
    const result = await client.callTool({
        name: toolName,
        arguments: args
    });

    // Convertimos la respuesta cruda de MCP a un string útil para el LLM
    if (result && Array.isArray(result.content) && result.content.length > 0) {
        // Concatenamos si hay varios bloques de texto
        return result.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => ('text' in c) ? c.text : JSON.stringify(c))
            .join('\\n');
    }
    return JSON.stringify(result);
}
