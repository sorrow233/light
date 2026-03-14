import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCrwCk7d5msWwhavu_kni8wpR07Km0GjIQ",
    authDomain: "light-7b409.firebaseapp.com",
    projectId: "light-7b409",
    storageBucket: "light-7b409.firebasestorage.app",
    messagingSenderId: "399784725490",
    appId: "1:399784725490:web:44055473e0f220025db96b",
    measurementId: "G-MJ0M15H9NV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

const scheduleAnalyticsInit = () => {
    if (typeof window === 'undefined') return;

    const runWhenIdle = window.requestIdleCallback
        ? window.requestIdleCallback.bind(window)
        : (callback) => window.setTimeout(callback, 1200);

    runWhenIdle(async () => {
        try {
            const analyticsModule = await import('firebase/analytics');
            const isAnalyticsSupported = await analyticsModule.isSupported();
            if (!isAnalyticsSupported) return;

            analyticsModule.getAnalytics(app);
        } catch (error) {
            console.warn('[Firebase] Analytics init skipped:', error);
        }
    });
};

scheduleAnalyticsInit();

export default app;
