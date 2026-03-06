export const generateVideoDef = {
    type: 'function',
    function: {
        name: 'generate_video',
        description: 'Genera un pequeño clip de video animado basado en tu descripción, totalmente gratis.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Qué querés que pase en el video.'
                }
            },
            required: ['prompt'],
        },
    },
};

export async function generateVideo(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt);
    // Endpoint experimental de pollinations para video
    return `https://video.pollinations.ai/prompt/${encodedPrompt}`;
}
