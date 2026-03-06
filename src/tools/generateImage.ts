export const generateImageDef = {
    type: 'function',
    function: {
        name: 'generate_image',
        description: 'Genera una imagen artística basada en una descripción (prompt) totalmente gratis.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Descripción detallada de la imagen que querés generar, preferentemente en inglés para mejor resultado (yo la traduzco si es necesario).'
                }
            },
            required: ['prompt'],
        },
    },
};

export async function generateImage(prompt: string): Promise<string> {
    // Usamos Pollinations.ai que es 100% gratuito y no requiere API KEY
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    return imageUrl;
}
