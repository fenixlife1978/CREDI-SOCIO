import { initializeApp, getApps, App } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

let adminApp: App | undefined;

export function initializeAdminApp() {
    if (getApps().length > 0) {
        adminApp = getApps()[0];
    } else {
        adminApp = initializeApp({
            projectId: firebaseConfig.projectId,
        });
    }
    return adminApp;
}
