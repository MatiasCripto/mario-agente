import { getCurrentTime, getCurrentTimeDef } from './getCurrentTime.js';
import { generateImage, generateImageDef } from './generateImage.js';
import { generateVideo, generateVideoDef } from './generateVideo.js';
import { triggerN8n, triggerN8nDef } from './n8n.js';
import { getMcpTools, executeMcpTool, getServerForTool } from '../mcp/index.js';

// Base tools that are purely local
export const localToolsDefinitions = [
    getCurrentTimeDef,
    generateImageDef,
    generateVideoDef,
    triggerN8nDef
];

export async function getAllToolsDefinitions() {
    const mcpTools = await getMcpTools();
    return [...localToolsDefinitions, ...mcpTools];
}

export async function executeTool(name: string, args: any): Promise<string> {
    switch (name) {
        case 'get_current_time':
            return getCurrentTime();
        case 'generate_image':
            return await generateImage(args.prompt);
        case 'generate_video':
            return await generateVideo(args.prompt);
        case 'trigger_n8n_workflow':
            return await triggerN8n(args.webhookUrl, args.data);
    }

    const serverName = getServerForTool(name);
    if (serverName) {
        return executeMcpTool(serverName, name, args);
    }

    return `Error: Herramienta no encontrada - ${name}`;
}
