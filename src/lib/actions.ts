'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from './firebase-admin';

interface UpdateEmailParams {
    uid: string;
    newEmail: string;
}

interface ActionResult {
    success: boolean;
    error?: string;
}

export async function updateUserEmail(params: UpdateEmailParams): Promise<ActionResult> {
    const { uid, newEmail } = params;

    if (!uid || !newEmail) {
        return { success: false, error: 'UID y nuevo correo son requeridos.' };
    }

    try {
        await initializeAdminApp();
        await getAuth().updateUser(uid, {
            email: newEmail,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating user email:", error);
        let errorMessage = 'Ocurrió un error al actualizar el correo.';

        switch (error.code) {
            case 'auth/email-already-exists':
                errorMessage = 'El nuevo correo electrónico ya está en uso por otra cuenta.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No se encontró ningún usuario con el UID proporcionado.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'El formato del nuevo correo electrónico no es válido.';
                break;
            case 'auth/internal-error':
                 errorMessage = 'Error interno del servidor de autenticación. Inténtelo más tarde.';
                 break;
        }

        return { success: false, error: errorMessage };
    }
}
