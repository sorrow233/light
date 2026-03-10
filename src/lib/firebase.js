import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

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
const analytics = getAnalytics(app);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
