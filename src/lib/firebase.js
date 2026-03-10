import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyA20FrNmdIPE2Sb9r97s7cj2w6MLYgcB_M",
    authDomain: "flow-7ffad.firebaseapp.com",
    projectId: "flow-7ffad",
    storageBucket: "flow-7ffad.firebasestorage.app",
    messagingSenderId: "790402502704",
    appId: "1:790402502704:web:0be1cf358b26796ac75df5",
    measurementId: "G-PPC7ZZ6WMV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
