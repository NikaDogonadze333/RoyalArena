import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyADBhJDnI08MxaXyG-IBH5RK6mYf0xKxMY",
    authDomain: "royal-arenamlbb.firebaseapp.com",
    projectId: "royal-arenamlbb",
    storageBucket: "royal-arenamlbb.firebasestorage.app",
    messagingSenderId: "75648732962",
    appId: "1:75648732962:web:d1093dc2e03f67ad281f7b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirestore = getFirestore(app);

export { auth, dbFirestore };