import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDX200E09uTOVctNB5ps91o9h0H83Wd-iI",
  authDomain: "gcthreads-d9efe.firebaseapp.com",
  projectId: "gcthreads-d9efe",
  storageBucket: "gcthreads-d9efe.firebasestorage.app",
  messagingSenderId: "81060637803",
  appId: "1:81060637803:web:178dccf0be13762082d52e",
  measurementId: "G-W9TBGL7R0X",
};

const app = initializeApp(firebaseConfig);
try {
  getAnalytics(app);
} catch (_) {
  // ignore analytics init issues (e.g. ad blockers)
}

export const auth = getAuth(app);
export const db = getFirestore(app);

