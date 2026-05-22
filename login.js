import { validateGCEmail, showError, hideError, getCleanUsername } from '../utils.js';
import { auth } from '../firestore.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError('loginError');

    const email = document.getElementById('loginEmail')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';

    if (!validateGCEmail(email)) {
      showError('loginError', 'Please use your @gordoncollege.edu.ph email address.');
      return;
    }

    if (!password || password.length < 6) {
      showError('loginError', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'app.html';
    } catch (error) {
      const code = error?.code;
      const msgs = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'Account not found. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Email/Password sign-in is disabled. Enable it in Firebase Console.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/invalid-email': 'Invalid email address.',
      };
      showError('loginError', msgs[code] || error?.message || 'Login failed.');
    }
  });
}

