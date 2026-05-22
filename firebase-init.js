import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8gzhb0f-VkRIEZTdmN-kQuEGJqcaoXVo",
  authDomain: "road-to-fargo.firebaseapp.com",
  projectId: "road-to-fargo",
  storageBucket: "road-to-fargo.firebasestorage.app",
  messagingSenderId: "544957385745",
  appId: "1:544957385745:web:22cceaa7db85af5822f5b0"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
