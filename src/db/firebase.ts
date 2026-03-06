import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '../config/env.js';

// Prevenimos inicializar múltiples veces en dev
if (getApps().length === 0) {
    // Usamos el archivo de cuentas de servicio local
    // OJO: Este archivo NO debe subirse a GitHub
    initializeApp({
        credential: cert(env.GOOGLE_APPLICATION_CREDENTIALS)
    });
}

export const db = getFirestore();
