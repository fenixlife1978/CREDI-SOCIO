import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";

export const firebaseConfig = {
  "projectId": "studio-5740654397-14205",
  "appId": "1:318145535367:web:031ea843239faee31c0722",
  "apiKey": "AIzaSyBJhRefj0XQmClLIytjATULHh7SI9ossfY",
  "authDomain": "studio-5740654397-14205.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "318145535367"
};

// Helper function to initialize Firebase, safe for both server and client.
export const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  } else {
    return getApp();
  }
};
