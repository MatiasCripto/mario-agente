export const triggerN8nDef = {
    type: 'function',
    function: {
        name: 'trigger_n8n_workflow',
        description: 'Dispara una automatización en n8n mediante un webhook. Útil para conectar con Google Sheets, mandar mails, o lo que sea.',
        parameters: {
            type: 'object',
            properties: {
                webhookUrl: {
                    type: 'string',
                    description: 'La URL del webhook de n8n (Production URL preferentemente).'
                },
                data: {
                    type: 'object',
                    description: 'Objeto JSON con los datos que le querés pasar al workflow.'
                }
            },
            required: ['webhookUrl', 'data'],
        },
    },
};

export async function triggerN8n(webhookUrl: string, data: any): Promise<string> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            return `Error de n8n: ${response.statusText}`;
        }

        return "Automatización de n8n disparada con éxito.";
    } catch (error: any) {
        return `Error conectando con n8n: ${error.message}`;
    }
}
