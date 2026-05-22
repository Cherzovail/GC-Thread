import { validateGCEmail, showError, hideError } from '../utils.js';
import { auth, db } from '../firestore.js';
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError('registerError');

    const email = document.getElementById('registerEmail')?.value.trim() || '';
    const password = document.getElementById('registerPassword')?.value || '';

    if (!validateGCEmail(email)) {
      showError('registerError', 'Please use a valid @gordoncollege.edu.ph email address.');
      return;
    }

    if (!password || password.length < 6) {
      showError('registerError', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        username: null,
        setupCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        postsCount: 0,
        likesGiven: 0,
      });

      window.location.href = 'username.html';
    } catch (error) {
      const code = error?.code;
      const msgs = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
      };
      showError('registerError', msgs[code] || error?.message || 'Registration failed');
    }
  });
}

