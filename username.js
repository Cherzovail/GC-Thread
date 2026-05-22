import { validateUsername, showError, hideError, getCleanUsername } from '../utils.js';
import { auth, db } from '../firestore.js';
import {
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function initUsernameSetup() {
  const input = document.getElementById('usernameInput');
  const buttonText = document.getElementById('usernameButtonText');
  const form = document.getElementById('usernameSetupForm');
  const skipButton = document.getElementById('skipUsernameBtn');

  if (input) {
    input.addEventListener('input', (event) => {
      const username = event.target.value.trim();
      if (buttonText) buttonText.textContent = username ? 'Save Username' : 'Continue without Username';
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError('usernameError');

    const user = auth.currentUser;
    if (!user) {
      showError('usernameError', 'You must be logged in to set username.');
      return;
    }

    const username = input ? (input.value.trim() || '') : '';

    if (username) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        showError('usernameError', validation.message);
        return;
      }
    }

    const finalUsername = username || getCleanUsername(user.email);

    try {
      // Ensure user doc exists (defensive)
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await updateDoc(userRef, {
          email: user.email,
          username: finalUsername,
          setupCompleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          username: finalUsername,
          setupCompleted: true,
          updatedAt: serverTimestamp(),
        });
      }

      window.location.href = 'app.html';
    } catch (error) {
      console.error('Username setup error:', error?.message || error);
      showError('usernameError', 'Error saving username. Please try again.');
    }
  });

  skipButton?.addEventListener('click', () => {
    if (input) input.value = '';
    form.dispatchEvent(new Event('submit'));
  });
}

