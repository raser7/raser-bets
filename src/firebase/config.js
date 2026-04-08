import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTsZKzKskNWGCKXvdTdouJjUYyNJu1dT4",
  authDomain: "raseraserbets.firebaseapp.com",
  projectId: "raseraserbets",
  storageBucket: "raseraserbets.firebasestorage.app",
  messagingSenderId: "732686054285",
  appId: "1:732686054285:web:1de7b92633970be17903c4"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
