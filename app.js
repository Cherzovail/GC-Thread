// GC Threads — Fixed app.js
// Fixes applied:
//  1. Removed dead API_BASE / localhost fallback (no backend needed)
//  2. isToday uses real Date() instead of hardcoded day 15
//  3. hasEvent & showSelectedDayEvents use currentMonth/currentYear not hardcoded 1
//  4. likePost: likesGiven only increments on a NEW like, not on unlike
//  5. Added live search filtering on home feed
//  6. editProfileBtn opens modal with real username save
//  7. showAppPage skips nav highlight for fullCalendarPage (overlay-style)
//  8. onAuthStateChanged edge-case: setupCompleted=true but no username -> fix username then go to mainApp

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp, increment, arrayUnion, arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================== FIREBASE CONFIG ====================

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
try { getAnalytics(app); } catch { /* ignore ad-blocker errors */ }
const auth = getAuth(app);
const db   = getFirestore(app);

console.log("🔥 Firebase initialized for GC Threads");

// ==================== GLOBAL STATE ====================

let currentUser     = null;
let currentUsername = null;
let allHomePosts    = [];   // cached for search filtering

// FIX: Calendar initialises to real today, not hardcoded Feb 2026
const _today       = new Date();
let currentMonth   = _today.getMonth();
let currentYear    = _today.getFullYear();
let selectedDay    = null;

// Sample events – month/year aware so calendar works any month
const events = [
  { id: 1, title: "Final Exams Week",    month: 3,  day: 16, year: 2026, time: "8:00 AM – 5:00 PM", location: "Various Rooms",   attendees: 450, color: "#ef4444" },
  { id: 2, title: "Study Group – Math",  month: 3,  day: 15, year: 2026, time: "7:00 PM – 9:00 PM", location: "Library Room 3",  attendees: 12,  color: "#3b82f6" },
  { id: 3, title: "Campus Career Fair",  month: 3,  day: 18, year: 2026, time: "10:00 AM – 4:00 PM",location: "Main Gymnasium",  attendees: 89,  color: "#a855f7" },
  { id: 4, title: "Spring Festival",     month: 3,  day: 22, year: 2026, time: "12:00 PM – 8:00 PM",location: "Campus Grounds",  attendees: 234, color: "#f97316" },
];

// ==================== UTILITY FUNCTIONS ====================

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");
}

// FIX: fullCalendarPage is an overlay; don't update bottom-nav highlight for it
function showAppPage(pageId) {
  document.querySelectorAll(".app-page").forEach(p => p.classList.remove("active"));
  const pageEl = document.getElementById(pageId);
  if (pageEl) pageEl.classList.add("active");

  const isOverlay = pageId === "fullCalendarPage";

  if (!isOverlay) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    const navKey = pageId.replace("Page", "");
    const navItem = document.querySelector(`[data-page="${navKey}"]`);
    if (navItem) navItem.classList.add("active");
  }

  const header    = document.getElementById("appHeader");
  const bottomNav = document.getElementById("bottomNav");
  if (header && bottomNav) {
    const hideChrome = pageId === "postPage" || pageId === "fullCalendarPage";
    header.style.display    = hideChrome ? "none" : "flex";
    bottomNav.style.display = hideChrome ? "none" : "flex";
  }
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add("hidden");
}

function validateGCEmail(email) {
  return email.endsWith("@gordoncollege.edu.ph");
}

function validateUsername(username) {
  if (!username) return { valid: true };
  if (username.length < 3)  return { valid: false, message: "Username must be at least 3 characters" };
  if (username.length > 20) return { valid: false, message: "Username must be less than 20 characters" };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
  return { valid: true };
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    [31536000, "y"], [2592000, "mo"], [86400, "d"],
    [3600, "h"],     [60, "m"],
  ];
  for (const [s, label] of intervals) {
    const i = Math.floor(seconds / s);
    if (i >= 1) return `${i}${label} ago`;
  }
  return "Just now";
}

function getCategoryClass(category) {
  return {
    "Academics":   "category-academics",
    "Lost & Found":"category-lost-found",
    "Events":      "category-events",
    "General":     "category-general",
  }[category] || "category-general";
}

function getDateFromFirestoreField(createdAt) {
  if (!createdAt) return new Date();
  if (createdAt.toDate) return createdAt.toDate();
  return new Date(createdAt);
}

// ==================== AUTH STATE ====================

onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      currentUser = user;
      console.log("✅ Auth: logged in as", user.email);

      const userRef = doc(db, "users", user.uid);
      const snap    = await getDoc(userRef);

      if (!snap.exists()) {
        // Brand-new user — create their profile doc
        await setDoc(userRef, {
          email: user.email,
          createdAt: serverTimestamp(),
          postsCount: 0,
          likesGiven: 0,
          setupCompleted: false,
        });
        currentUsername = null;
        showPage("usernameSetupPage");
        return;
      }

      const data = snap.data();
      currentUsername = data.username || null;

      // FIX: edge-case — setupCompleted true but username somehow missing → re-prompt
      if (!data.setupCompleted || !currentUsername) {
        showPage("usernameSetupPage");
        return;
      }

      showPage("mainApp");
      loadCalendar();
      await Promise.all([loadHomePosts(), loadConcerns(), updateProfile()]);

    } else {
      currentUser     = null;
      currentUsername = null;
      showPage("loginPage");
    }
  } catch (error) {
    console.error("❌ Auth state error:", error.message);
    showPage("loginPage");
  }
});

// ==================== LOGIN ====================

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError("loginError");

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!validateGCEmail(email)) {
      showError("loginError", "Please use your GC Domain email (@gordoncollege.edu.ph)");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles the rest
    } catch (error) {
      console.error("❌ Login error:", error.code, error.message);
      const msgs = {
        "auth/invalid-credential":    "Invalid email or password. Register first if you don't have an account.",
        "auth/user-not-found":        "Account not found. Please register first.",
        "auth/wrong-password":        "Incorrect password. Please try again.",
        "auth/too-many-requests":     "Too many failed attempts. Please wait and try again.",
        "auth/operation-not-allowed": "Email/Password sign-in is disabled in Firebase Console.",
        "auth/network-request-failed":"Network error. Check your internet connection.",
      };
      showError("loginError", msgs[error.code] || error.message || "Login failed. Please try again.");
    }
  });
}

// ==================== REGISTER ====================

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError("registerError");

    const email    = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!validateGCEmail(email)) {
      showError("registerError", "Please use your GC Domain email (@gordoncollege.edu.ph)");
      return;
    }
    if (!password || password.length < 6) {
      showError("registerError", "Password must be at least 6 characters");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        createdAt: serverTimestamp(),
        postsCount: 0,
        likesGiven: 0,
        setupCompleted: false,
      });
      currentUser     = cred.user;
      currentUsername = null;
      showPage("usernameSetupPage");
    } catch (error) {
      console.error("❌ Register error:", error.code, error.message);
      const msgs = {
        "auth/email-already-in-use": "This email is already registered. Please sign in.",
        "auth/weak-password":        "Password is too weak. Use at least 6 characters.",
        "auth/invalid-email":        "Invalid email address.",
      };
      showError("registerError", msgs[error.code] || error.message || "Registration failed");
    }
  });
}

// Toggle login ↔ register
document.getElementById("showRegisterBtn")?.addEventListener("click", () => showPage("registerPage"));
document.getElementById("showLoginBtn")?.addEventListener("click",    () => showPage("loginPage"));

// ==================== USERNAME SETUP ====================

const usernameInput = document.getElementById("usernameInput");
if (usernameInput) {
  usernameInput.addEventListener("input", (e) => {
    const btn = document.getElementById("usernameButtonText");
    if (btn) btn.textContent = e.target.value.trim() ? "Continue with Username" : "Continue without Username";
  });
}

const usernameSetupForm = document.getElementById("usernameSetupForm");
if (usernameSetupForm) {
  usernameSetupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError("usernameError");

    if (!currentUser) { showError("usernameError", "You must be logged in"); return; }

    const username = usernameInput ? usernameInput.value.trim() : "";

    if (username) {
      const v = validateUsername(username);
      if (!v.valid) { showError("usernameError", v.message); return; }
    }

    try {
      const finalUsername = username || currentUser.email.split("@")[0];
      await updateDoc(doc(db, "users", currentUser.uid), {
        username: finalUsername,
        setupCompleted: true,
        updatedAt: serverTimestamp(),
      });
      currentUsername = finalUsername;

      showPage("mainApp");
      loadCalendar();
      await Promise.all([loadHomePosts(), loadConcerns(), updateProfile()]);
    } catch (error) {
      console.error("❌ Username setup error:", error.message);
      showError("usernameError", "Error saving username. Please try again.");
    }
  });
}

document.getElementById("skipUsernameBtn")?.addEventListener("click", () => {
  if (usernameInput) usernameInput.value = "";
  usernameSetupForm?.dispatchEvent(new Event("submit"));
});

// ==================== NAVIGATION ====================

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const page = item.dataset.page;
    if (page) showAppPage(page + "Page");
  });
});

document.getElementById("homeLogoBtn")?.addEventListener("click", () => showAppPage("homePage"));

// ==================== SEARCH (HOME FEED) ====================

// FIX: search input was wired to nothing — now filters cached posts live
document.getElementById("searchInput")?.addEventListener("input", (e) => {
  const term = e.target.value.trim().toLowerCase();
  const container = document.getElementById("homePageContent");
  if (!container) return;

  if (!term) {
    container.innerHTML = "";
    allHomePosts.forEach(p => container.appendChild(createPostCard(p.id, p)));
    return;
  }

  const filtered = allHomePosts.filter(p =>
    (p.title   || "").toLowerCase().includes(term) ||
    (p.content || "").toLowerCase().includes(term) ||
    (p.category|| "").toLowerCase().includes(term) ||
    (p.author  || "").toLowerCase().includes(term)
  );

  container.innerHTML = "";
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No results found</div>';
    return;
  }
  filtered.forEach(p => container.appendChild(createPostCard(p.id, p)));
});

// ==================== CREATE POST ====================

document.getElementById("closePostBtn")?.addEventListener("click", () => {
  showAppPage("homePage");
  document.getElementById("postForm")?.reset();
});

document.getElementById("submitPostBtn")?.addEventListener("click", async () => {
  hideError("postError");

  const category = document.getElementById("postCategory")?.value?.trim();
  const title    = document.getElementById("postTitle")?.value?.trim();
  const content  = document.getElementById("postContent")?.value?.trim();
  const location = document.getElementById("postLocation")?.value?.trim() || "";

  if (!category || !title || !content) {
    showError("postError", "Please fill in all required fields (category, title, content)");
    return;
  }
  if (!currentUser) {
    showError("postError", "You must be logged in to post");
    return;
  }

  try {
    const postData = {
      userId:     currentUser.uid,
      author:     currentUsername || currentUser.email.split("@")[0],
      category, 
      title, 
      content,
      location,
      likes: 0, 
      dislikes: 0,
      likedBy: [], 
      dislikedBy: [],
      createdAt: serverTimestamp(),
      trending: false,
      resolved: false,
    };

    const docRef = await addDoc(collection(db, "posts"), postData);
    await updateDoc(doc(db, "users", currentUser.uid), { postsCount: increment(1) });

    console.log("✅ Post created:", docRef.id);
    document.getElementById("postForm")?.reset();
    document.getElementById("postCategory")?.focus();
    showAppPage("homePage");
    await Promise.all([loadHomePosts(), loadConcerns(), updateProfile()]);
  } catch (error) {
    console.error("❌ Create post error:", error.message);
    showError("postError", "Error creating post. Please try again.");
  }
});

// ==================== LOAD POSTS ====================

async function loadHomePosts() {
  const container = document.getElementById("homePageContent");
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Loading posts…</div>';

  try {
    const q        = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);

    allHomePosts = [];
    snapshot.forEach(d => allHomePosts.push({ id: d.id, ...d.data() }));

    container.innerHTML = "";
    if (allHomePosts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No posts yet. Be the first to post!</div>';
      return;
    }
    allHomePosts.forEach(p => container.appendChild(createPostCard(p.id, p)));
  } catch (error) {
    console.error("❌ Load posts error:", error.message);
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#ef4444;">Error loading posts. Check your Firestore indexes.</div>';
  }
}

async function loadConcerns(category = "All") {
  const container = document.getElementById("concernsPageContent");
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Loading concerns…</div>';

  try {
    let q;
    if (category === "All") {
      q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    } else {
      // NOTE: this compound query requires a Firestore composite index:
      // Collection: posts | Fields: category ASC, createdAt DESC
      // Firebase will show a link in the console to create it automatically.
      q = query(
        collection(db, "posts"),
        where("category", "==", category),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    const posts    = [];
    snapshot.forEach(d => posts.push({ id: d.id, ...d.data() }));

    const label = category === "All" ? "Total Concerns" : `${category} Concerns`;
    const countEl = document.getElementById("concernsCount");
    if (countEl) countEl.textContent = `${posts.length} ${label}`;

    container.innerHTML = "";
    if (posts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No concerns yet</div>';
      return;
    }
    posts.forEach(p => container.appendChild(createConcernCard(p.id, p)));
  } catch (error) {
    console.error("❌ Load concerns error:", error.message);
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#ef4444;">Error loading concerns. Check Firestore indexes.</div>';
  }
}

// Category pills
document.querySelectorAll("#categoryPills .pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#categoryPills .pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    loadConcerns(pill.dataset.category);
  });
});

// ==================== CARD BUILDERS ====================

function buildCardHTML(postId, post, showStatus = false) {
  const timeAgo       = post.createdAt ? getTimeAgo(getDateFromFirestoreField(post.createdAt)) : "Just now";
  const categoryClass = getCategoryClass(post.category);
  const avatar        = post.author ? post.author[0].toUpperCase() : "G";
  const uid           = currentUser ? currentUser.uid : null;
  const isLiked       = uid && (post.likedBy    || []).includes(uid);
  const isDisliked    = uid && (post.dislikedBy || []).includes(uid);

  const statusHTML = showStatus
    ? `<span class="status-badge ${post.resolved ? "status-resolved" : "status-open"}">${post.resolved ? "Resolved" : "Open"}</span>`
    : "";

  return `
    <div class="post-header">
      <div class="post-avatar">${avatar}</div>
      <div class="post-info">
        <div class="post-author">
          ${post.author || "Anonymous"}
          ${post.trending ? `<svg class="trending-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` : ""}
        </div>
        <div class="post-meta">
          <span class="category-badge ${categoryClass}">${post.category}</span>
          <span class="post-time">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${timeAgo}
          </span>
        </div>
      </div>
      ${statusHTML}
    </div>
    <div class="post-content-text">
      <h4>${post.title || ""}</h4>
      <p>${post.content || ""}</p>
    </div>
    <div class="post-actions">
      <button class="action-btn ${isLiked ? "liked" : ""}" onclick="likePost('${postId}')">
        <svg viewBox="0 0 24 24" fill="${isLiked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
        </svg>
        <span>${post.likes || 0}</span>
      </button>
      <button class="action-btn ${isDisliked ? "disliked" : ""}" onclick="dislikePost('${postId}')">
        <svg viewBox="0 0 24 24" fill="${isDisliked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2-1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
        </svg>
        <span>${post.dislikes || 0}</span>
      </button>
    </div>`;
}

function createPostCard(postId, post) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.innerHTML = buildCardHTML(postId, post, false);
  return card;
}

function createConcernCard(postId, post) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.innerHTML = buildCardHTML(postId, post, true);
  return card;
}

// ==================== LIKE / DISLIKE ====================

async function likePost(postId) {
  if (!currentUser) { alert("Please log in to like posts."); return; }

  try {
    const uid     = currentUser.uid;
    const postRef = doc(db, "posts", postId);
    const snap    = await getDoc(postRef);
    if (!snap.exists()) { alert("Post not found"); return; }

    const post      = snap.data();
    const likedBy   = post.likedBy    || [];
    const dislikedBy= post.dislikedBy || [];

    if (likedBy.includes(uid)) {
      // Toggle off — unlike (do NOT decrement likesGiven)
      await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(uid) });
    } else {
      const updates = { likes: increment(1), likedBy: arrayUnion(uid) };
      if (dislikedBy.includes(uid)) {
        updates.dislikes   = increment(-1);
        updates.dislikedBy = arrayRemove(uid);
      }
      await updateDoc(postRef, updates);
      // FIX: likesGiven only increments on a NEW like, not on unlike
      await updateDoc(doc(db, "users", uid), { likesGiven: increment(1) });
    }

    await refreshFeeds();
  } catch (error) {
    console.error("❌ Like error:", error.message);
    alert("Error updating like");
  }
}

async function dislikePost(postId) {
  if (!currentUser) { alert("Please log in to dislike posts."); return; }

  try {
    const uid      = currentUser.uid;
    const postRef  = doc(db, "posts", postId);
    const snap     = await getDoc(postRef);
    if (!snap.exists()) { alert("Post not found"); return; }

    const post      = snap.data();
    const likedBy   = post.likedBy    || [];
    const dislikedBy= post.dislikedBy || [];

    if (dislikedBy.includes(uid)) {
      await updateDoc(postRef, { dislikes: increment(-1), dislikedBy: arrayRemove(uid) });
    } else {
      const updates = { dislikes: increment(1), dislikedBy: arrayUnion(uid) };
      if (likedBy.includes(uid)) {
        updates.likes   = increment(-1);
        updates.likedBy = arrayRemove(uid);
      }
      await updateDoc(postRef, updates);
    }

    await refreshFeeds();
  } catch (error) {
    console.error("❌ Dislike error:", error.message);
    alert("Error updating dislike");
  }
}

async function refreshFeeds() {
  const activePill = document.querySelector("#categoryPills .pill.active");
  await Promise.all([
    loadHomePosts(),
    loadConcerns(activePill ? activePill.dataset.category : "All"),
  ]);
}

window.likePost    = likePost;
window.dislikePost = dislikePost;

// ==================== CALENDAR ====================

// FIX: isToday and hasEvent are now dynamic based on real date and currentMonth/currentYear

function loadCalendar() {
  generateCalendar("calendarGrid",     false);
  generateCalendar("calendarGridFull", true);
  updateMonthDisplay();
  loadEvents();
}

function generateCalendar(containerId, isFull) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const now         = new Date();

  for (let i = 0; i < firstDay; i++) {
    const empty   = document.createElement("button");
    empty.className  = "calendar-day empty";
    empty.disabled   = true;
    container.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayBtn  = document.createElement("button");
    dayBtn.className  = "calendar-day";
    dayBtn.textContent = day;

    // FIX: isToday uses real current date, not hardcoded values
    const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
    // FIX: hasEvent compares against currentMonth and currentYear, not hardcoded 1
    const hasEvent = events.some(e => e.day === day && e.month === currentMonth && e.year === currentYear);

    if (isToday)       dayBtn.classList.add("today");
    else if (hasEvent) dayBtn.classList.add("has-event");

    if (isFull) {
      dayBtn.addEventListener("click", () => {
        selectedDay = day;
        generateCalendar("calendarGridFull", true);
        showSelectedDayEvents(day);
      });
      if (selectedDay === day) dayBtn.classList.add("selected");
    }

    container.appendChild(dayBtn);
  }
}

function updateMonthDisplay() {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const label = `${monthNames[currentMonth]} ${currentYear}`;
  const el1 = document.getElementById("currentMonthYear");
  const el2 = document.getElementById("currentMonthYearFull");
  if (el1) el1.textContent = label;
  if (el2) el2.textContent = label;
}

function loadEvents() {
  const container = document.getElementById("eventsContainer");
  if (!container) return;
  container.innerHTML = "";

  const monthEvents = events.filter(e => e.month === currentMonth && e.year === currentYear);

  if (monthEvents.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No events scheduled this month</p>';
    return;
  }

  monthEvents.forEach(event => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.style.borderLeftColor = event.color;
    card.innerHTML = `
      <div class="event-content">
        <div class="event-icon" style="background:${event.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="event-details">
          <h4>${event.title}</h4>
          <div class="event-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${event.time}</span>
          </div>
          <div class="event-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${event.location}</span>
          </div>
          <div class="event-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span>${event.attendees} attending</span>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

// FIX: showSelectedDayEvents uses currentMonth/currentYear not hardcoded 1
function showSelectedDayEvents(day) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayEvents  = events.filter(e => e.day === day && e.month === currentMonth && e.year === currentYear);

  const container       = document.getElementById("selectedDayEvents");
  const title           = document.getElementById("selectedDayTitle");
  const eventsContainer = document.getElementById("selectedDayEventsContainer");
  if (!container || !title || !eventsContainer) return;

  if (dayEvents.length === 0) { container.classList.add("hidden"); return; }

  title.textContent = `Events on ${monthNames[currentMonth]} ${day}, ${currentYear}`;
  eventsContainer.innerHTML = "";
  dayEvents.forEach(event => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.style.borderLeftColor = event.color;
    card.innerHTML = `
      <h4 style="font-size:0.875rem;margin-bottom:0.5rem;">${event.title}</h4>
      <p style="font-size:0.75rem;color:#64748b;margin-bottom:0.25rem;">${event.time}</p>
      <p style="font-size:0.75rem;color:#64748b;">${event.location}</p>`;
    eventsContainer.appendChild(card);
  });
  container.classList.remove("hidden");
}

// Calendar navigation helpers
function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  selectedDay = null;
  loadCalendar();
}

document.getElementById("prevMonthBtn")?.    addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonthBtn")?.    addEventListener("click", () => changeMonth(+1));
document.getElementById("prevMonthFullBtn")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonthFullBtn")?.addEventListener("click", () => changeMonth(+1));
document.getElementById("viewFullCalendarBtn")?.addEventListener("click", () => showAppPage("fullCalendarPage"));
document.getElementById("closeFullCalendarBtn")?.addEventListener("click", () => showAppPage("calendarPage"));

// ==================== PROFILE ====================

async function updateProfile() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (!snap.exists()) return;
    const data = snap.data();

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("profileName",      data.username || "Guest User");
    setEl("profileEmail",     data.email    || currentUser.email);
    setEl("profileAvatarText",(data.username || "G")[0].toUpperCase());
    setEl("userPostsCount",   data.postsCount || 0);
    setEl("userLikesCount",   data.likesGiven || 0);
  } catch (error) {
    console.error("❌ Update profile error:", error.message);
  }
}

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    currentUser     = null;
    currentUsername = null;
    showPage("loginPage");
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    alert("Error logging out. Please try again.");
  }
});

// ==================== EDIT PROFILE MODAL ====================
// FIX: was just alert("coming soon") — now opens a real modal with username save

const editProfileBtn   = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const closeEditModal   = document.getElementById("closeEditModal");
const editProfileForm  = document.getElementById("editProfileForm");

editProfileBtn?.addEventListener("click", async () => {
  // Pre-fill current username
  const editInput = document.getElementById("editUsernameInput");
  if (editInput) editInput.value = currentUsername || "";
  hideError("editProfileError");
  if (editProfileModal) editProfileModal.style.display = "flex";
});

closeEditModal?.addEventListener("click", () => {
  if (editProfileModal) editProfileModal.style.display = "none";
});

// Close modal on backdrop click
editProfileModal?.addEventListener("click", (e) => {
  if (e.target === editProfileModal) editProfileModal.style.display = "none";
});

editProfileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError("editProfileError");

  const newUsername = document.getElementById("editUsernameInput")?.value.trim();
  if (!newUsername) { showError("editProfileError", "Username cannot be empty"); return; }

  const v = validateUsername(newUsername);
  if (!v.valid) { showError("editProfileError", v.message); return; }

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      username: newUsername,
      updatedAt: serverTimestamp(),
    });
    currentUsername = newUsername;
    if (editProfileModal) editProfileModal.style.display = "none";
    await updateProfile();
    alert("✅ Profile updated!");
  } catch (error) {
    console.error("❌ Edit profile error:", error.message);
    showError("editProfileError", "Error saving profile. Please try again.");
  }
});

// ==================== INIT ====================

window.addEventListener("DOMContentLoaded", () => {
  console.log("🌐 GC Threads loaded — waiting for auth state…");
});
