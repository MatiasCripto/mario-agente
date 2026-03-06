export const getCurrentTimeDef = {
    type: 'function',
    function: {
        name: 'get_current_time',
        description: 'Obtiene la fecha y hora actual del sistema. Útil cuando el usuario pregunta qué hora es, qué día es o pide información temporal.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
};

export function getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}
