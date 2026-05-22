// GC Threads Frontend - Connected to Backend

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
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
const db = getFirestore(app);

console.log("🔥 Firebase initialized for GC Threads");

// Current user data
let currentUser = null;
let currentUsername = null;
let allHomePosts = []; // cached for search filtering

// Calendar data
let currentMonth = 1;
let currentYear = 2026;
let selectedDay = null;

// Mock events data
const events = [
    {
        id: 1,
        title: 'Final Exams Week',
        date: 'Feb 16-20, 2026',
        day: 16,
        time: '8:00 AM - 5:00 PM',
        location: 'Various Rooms',
        attendees: 450,
        color: '#ef4444'
    },
    {
        id: 2,
        title: 'Study Group - Math',
        date: 'Feb 15, 2026',
        day: 15,
        time: '7:00 PM - 9:00 PM',
        location: 'Library Room 3',
        attendees: 12,
        color: '#3b82f6'
    },
    {
        id: 3,
        title: 'Campus Career Fair',
        date: 'Feb 18, 2026',
        day: 18,
        time: '10:00 AM - 4:00 PM',
        location: 'Main Gymnasium',
        attendees: 89,
        color: '#a855f7'
    },
    {
        id: 4,
        title: 'Spring Festival',
        date: 'Feb 22, 2026',
        day: 22,
        time: '12:00 PM - 8:00 PM',
        location: 'Campus Grounds',
        attendees: 234,
        color: '#f97316'
    }
];

// ==================== AUTH STATE ====================

onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      currentUser = user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        currentUsername = userDoc.data().username;
      }
      console.log('✅ User logged in:', user.email);
      if (!currentUsername) {
        showPage('usernameSetupPage');
      } else {
        showPage('mainApp');
        loadHomePosts();
        loadConcerns();
        loadCalendar();
        updateProfile();
      }
    } else {
      console.log('📝 No user logged in, showing login page');
      showPage('loginPage');
    }
  } catch (error) {
    console.error('❌ Error in auth state:', error);
    showPage('loginPage');
  }
});

// ==================== UTILITY FUNCTIONS ====================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showAppPage(pageId) {
    document.querySelectorAll('.app-page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`);
    if (navItem) navItem.classList.add('active');
    
    const header = document.getElementById('appHeader');
    const bottomNav = document.getElementById('bottomNav');
    if (pageId === 'postPage') {
        header.style.display = 'none';
        bottomNav.style.display = 'none';
    } else {
        header.style.display = 'flex';
        bottomNav.style.display = 'flex';
    }
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    errorEl.classList.add('hidden');
}

function validateGCEmail(email) {
    return email.endsWith('@gordoncollege.edu.ph');
}

function validateUsername(username) {
    if (!username) return { valid: true };
    if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (username.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    return { valid: true };
}

// ==================== AUTHENTICATION ====================

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('loginError');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!validateGCEmail(email)) {
        showError('loginError', 'Please use your GC Domain email address (@gordoncollege.edu.ph)');
        return;
    }
    
    if (!password || password.length < 6) {
        showError('loginError', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        console.log('🔐 Attempting login with:', email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Login successful, email listed in Firebase:', user.email);
        // onAuthStateChanged will handle navigation
    } catch (error) {
        console.error('❌ Login error:', error.code, error.message);
        
        let errorMsg = error.message;
        if (error.code === 'auth/too-many-requests') {
            errorMsg = 'Too many login attempts. Please try again later or reset your password.';
        } else if (error.code === 'auth/user-not-found') {
            errorMsg = 'Email not found. Please register first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMsg = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'Invalid email address.';
        }
        
        showError('loginError', errorMsg);
    }
});

// Register Form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('registerError');
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!validateGCEmail(email)) {
        showError('registerError', 'Please use your GC Domain email address (@gordoncollege.edu.ph)');
        return;
    }
    
    if (password.length < 6) {
        showError('registerError', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        console.log('📝 Attempting registration with:', email);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            username: null,
            createdAt: serverTimestamp(),
        });
        
        console.log('✅ Registration successful, email listed in Firebase:', user.email);
        // onAuthStateChanged will handle navigation
    } catch (error) {
        console.error('❌ Registration error:', error.code, error.message);
        
        let errorMsg = error.message;
        if (error.code === 'auth/too-many-requests') {
            errorMsg = 'Too many registration attempts. Please try again later.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg = 'This email is already registered. Please login or use a different email.';
        } else if (error.code === 'auth/weak-password') {
            errorMsg = 'Password is too weak. Use at least 6 characters.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'Invalid email address.';
        }
        
        showError('registerError', errorMsg);
    }
});

// Toggle between login and register
document.getElementById('showRegisterBtn').addEventListener('click', () => {
    showPage('registerPage');
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
    showPage('loginPage');
});

// Username Setup
document.getElementById('usernameInput').addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const buttonText = document.getElementById('usernameButtonText');
    if (username) {
        buttonText.textContent = 'Continue with Username';
    } else {
        buttonText.textContent = 'Continue without Username';
    }
});

document.getElementById('usernameSetupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('usernameError');
    
    const username = document.getElementById('usernameInput').value.trim();
    
    if (username) {
        const validation = validateUsername(username);
        if (!validation.valid) {
            showError('usernameError', validation.message);
            return;
        }
    }
    
    try {
        const finalUsername = username || currentUser.email.split('@')[0];
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
            username: finalUsername,
        });
        
        currentUsername = finalUsername;
        
        console.log('✅ Username set:', finalUsername);
        showPage('mainApp');
        loadHomePosts();
        loadConcerns();
        loadCalendar();
        updateProfile();
    } catch (error) {
        console.error('❌ Username setup error:', error.message);
        showError('usernameError', error.message);
    }
});

document.getElementById('skipUsernameBtn').addEventListener('click', () => {
    document.getElementById('usernameInput').value = '';
    document.getElementById('usernameSetupForm').dispatchEvent(new Event('submit'));
});

// ==================== NAVIGATION ====================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        showAppPage(page + 'Page');
    });
});

document.getElementById('homeLogoBtn').addEventListener('click', () => {
    showAppPage('homePage');
});

document.getElementById('closePostBtn').addEventListener('click', () => {
    showAppPage('homePage');
    document.getElementById('postForm').reset();
});

// ==================== POSTS ====================

document.getElementById('submitPostBtn').addEventListener('click', async () => {
    hideError('postError');
    
    const category = document.getElementById('postCategory')?.value?.trim();
    const title = document.getElementById('postTitle')?.value?.trim();
    const content = document.getElementById('postContent')?.value?.trim();
    const location = document.getElementById('postLocation')?.value?.trim() || '';
    
    if (!category || !title || !content) {
        showError('postError', 'Please fill in all required fields (category, title, content)');
        return;
    }
    
    if (!currentUser) {
        showError('postError', 'You must be logged in to post');
        return;
    }
    
    try {
        console.log('📝 Creating post...');
        
        await addDoc(collection(db, 'posts'), {
            category,
            title,
            content,
            location,
            author: currentUsername || currentUser.email.split('@')[0],
            authorId: currentUser.uid,
            createdAt: serverTimestamp(),
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            trending: false,
            resolved: false,
        });
        
        await updateDoc(doc(db, 'users', currentUser.uid), { postsCount: increment(1) });
        
        console.log('✅ Post created');
        
        document.getElementById('postForm').reset();
        document.getElementById('postCategory').focus();
        showAppPage('homePage');
        await Promise.all([loadHomePosts(), loadConcerns(), updateProfile()]);
    } catch (error) {
        console.error('❌ Error creating post:', error.message);
        showError('postError', error.message || 'Error creating post. Please try again.');
    }
});

// Load Home Posts
async function loadHomePosts() {
    const container = document.getElementById('homePageContent');
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Loading posts...</div>';
    
    try {
        console.log('📥 Loading home posts...');
        
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        
        allHomePosts = [];
        container.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const post = { id: doc.id, ...doc.data() };
            allHomePosts.push(post);
            container.appendChild(createPostCard(post.id, post));
        });
        
        console.log(`✅ Loaded ${allHomePosts.length} posts`);
        
        if (allHomePosts.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">No posts yet. Be the first to post!</div>';
        }
    } catch (error) {
        console.error('❌ Error loading posts:', error.message);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">Error loading posts</div>';
    }
}

// Load Concerns
async function loadConcerns(category = 'All') {
    const container = document.getElementById('concernsPageContent');
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Loading concerns...</div>';
    
    try {
        console.log(`📥 Loading concerns for category: ${category}`);
        
        let q;
        if (category === 'All') {
            q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
        } else {
            q = query(collection(db, 'posts'), where('category', '==', category), orderBy('createdAt', 'desc'), limit(50));
        }
        
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Loaded ${posts.length} ${category} concerns`);
        document.getElementById('concernsCount').textContent = `${posts.length} ${category === 'All' ? 'Total' : category} Concerns`;
        
        if (posts.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">No concerns yet</div>';
            return;
        }
        
        container.innerHTML = '';
        posts.forEach(post => {
            container.appendChild(createConcernCard(post.id, post));
        });
    } catch (error) {
        console.error('❌ Error loading concerns:', error.message);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">Error loading concerns</div>';
    }
}

// Category filter
document.querySelectorAll('#categoryPills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('#categoryPills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        loadConcerns(pill.dataset.category);
    });
});

// ==================== POST CARDS ====================

function createPostCard(postId, post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    const timeAgo = post.createdAt ? getTimeAgo(new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt)) : 'Just now';
    const categoryClass = getCategoryClass(post.category);
    const avatar = post.author ? post.author[0].toUpperCase() : 'G';
    
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
    const isDisliked = post.dislikedBy && post.dislikedBy.includes(currentUser.uid);
    
    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${avatar}</div>
            <div class="post-info">
                <div class="post-author">
                    ${post.author}
                    ${post.trending ? '<svg class="trending-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : ''}
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
        </div>
        <div class="post-content-text">
            <h4>${post.title}</h4>
            <p>${post.content}</p>
        </div>
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${postId}')">
                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                </svg>
                <span>${post.likes || 0}</span>
            </button>
            <button class="action-btn ${isDisliked ? 'disliked' : ''}" onclick="dislikePost('${postId}')">
                <svg viewBox="0 0 24 24" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                </svg>
                <span>${post.dislikes || 0}</span>
            </button>
        </div>
    `;
    
    return card;
}

function createConcernCard(postId, post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    const timeAgo = post.createdAt ? getTimeAgo(new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt)) : 'Just now';
    const categoryClass = getCategoryClass(post.category);
    const avatar = post.author ? post.author[0].toUpperCase() : 'G';
    
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
    const isDisliked = post.dislikedBy && post.dislikedBy.includes(currentUser.uid);
    
    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${avatar}</div>
            <div class="post-info">
                <div class="post-author">${post.author}</div>
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
        </div>
        <div class="post-content-text">
            <h4>${post.title}</h4>
            <p>${post.content}</p>
        </div>
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${postId}')">
                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                </svg>
                <span>${post.likes || 0}</span>
            </button>
            <button class="action-btn ${isDisliked ? 'disliked' : ''}" onclick="dislikePost('${postId}')">
                <svg viewBox="0 0 24 24" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                </svg>
                <span>${post.dislikes || 0}</span>
            </button>
        </div>
    `;
    
    return card;
}

// Like/Dislike
async function likePost(postId) {
    if (!currentUser) return;
    
    try {
        console.log('👍 Attempting to like post:', postId);
        
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (!postDoc.exists()) return;
        
        const post = postDoc.data();
        const uid = currentUser.uid;
        let updateData = {};
        
        if ((post.likedBy || []).includes(uid)) {
            // Unlike
            updateData = {
                likes: increment(-1),
                likedBy: arrayRemove(uid),
            };
        } else {
            // Like
            updateData = {
                likes: increment(1),
                likedBy: arrayUnion(uid),
            };
            // Remove dislike if exists
            if ((post.dislikedBy || []).includes(uid)) {
                updateData.dislikes = increment(-1);
                updateData.dislikedBy = arrayRemove(uid);
            }
        }
        
        await updateDoc(postRef, updateData);
        
        console.log('✅ Like updated');
        refreshFeeds();
    } catch (error) {
        console.error('❌ Error liking post:', error.message);
        alert('Error liking post');
    }
}

async function dislikePost(postId) {
    if (!currentUser) return;
    
    try {
        console.log('👎 Attempting to dislike post:', postId);
        
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (!postDoc.exists()) return;
        
        const post = postDoc.data();
        const uid = currentUser.uid;
        let updateData = {};
        
        if ((post.dislikedBy || []).includes(uid)) {
            // Undislike
            updateData = {
                dislikes: increment(-1),
                dislikedBy: arrayRemove(uid),
            };
        } else {
            // Dislike
            updateData = {
                dislikes: increment(1),
                dislikedBy: arrayUnion(uid),
            };
            // Remove like if exists
            if ((post.likedBy || []).includes(uid)) {
                updateData.likes = increment(-1);
                updateData.likedBy = arrayRemove(uid);
            }
        }
        
        await updateDoc(postRef, updateData);
        
        console.log('✅ Dislike updated');
        refreshFeeds();
    } catch (error) {
        console.error('❌ Error disliking post:', error.message);
        alert('Error disliking post');
    }
}

async function refreshFeeds() {
    const activePill = document.querySelector('#categoryPills .pill.active');
    await Promise.all([
        loadHomePosts(),
        loadConcerns(activePill ? activePill.dataset.category : 'All'),
    ]);
}

window.likePost = likePost;
window.dislikePost = dislikePost;

// ==================== CALENDAR ====================

function loadCalendar() {
    generateCalendar('calendarGrid', false);
    generateCalendar('calendarGridFull', true);
    updateMonthDisplay();
    loadEvents();
}

function generateCalendar(containerId, isFull) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const date = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = date.getDay();
    
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('button');
        emptyDay.className = 'calendar-day empty';
        emptyDay.disabled = true;
        container.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayBtn = document.createElement('button');
        dayBtn.className = 'calendar-day';
        dayBtn.textContent = day;
        
        const hasEvent = events.some(e => e.day === day && currentMonth === 1);
        const isToday = day === 15 && currentMonth === 1 && currentYear === 2026;
        
        if (isToday) {
            dayBtn.classList.add('today');
        } else if (hasEvent) {
            dayBtn.classList.add('has-event');
        }
        
        if (isFull) {
            dayBtn.addEventListener('click', () => {
                selectedDay = day;
                generateCalendar('calendarGridFull', true);
                showSelectedDayEvents(day);
            });
            
            if (selectedDay === day) {
                dayBtn.classList.add('selected');
            }
        }
        
        container.appendChild(dayBtn);
    }
}

function updateMonthDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = `${monthNames[currentMonth]} ${currentYear}`;
    document.getElementById('currentMonthYear').textContent = monthYear;
    document.getElementById('currentMonthYearFull').textContent = monthYear;
}

function loadEvents() {
    try {
        console.log('📅 Loading calendar events...');
        
        const container = document.getElementById('eventsContainer');
        container.innerHTML = '';
        
        if (!events || events.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No events scheduled</p>';
            return;
        }
        
        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.style.borderLeftColor = event.color;
            
            eventCard.innerHTML = `
                <div class="event-content">
                    <div class="event-icon" style="background: ${event.color}">
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>${event.date}</span>
                        </div>
                        <div class="event-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>${event.time}</span>
                        </div>
                        <div class="event-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span>${event.location}</span>
                        </div>
                        <div class="event-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                <path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                            <span>${event.attendees} attending</span>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(eventCard);
        });
        
        console.log('✅ All events loaded');
    } catch (error) {
        console.error('❌ Error in loadEvents:', error.message);
    }
}

function showSelectedDayEvents(day) {
    try {
        console.log(`📅 Showing events for day: ${day}`);
        
        const dayEvents = events.filter(e => e.day === day && currentMonth === 1);
        const container = document.getElementById('selectedDayEvents');
        const title = document.getElementById('selectedDayTitle');
        const eventsContainer = document.getElementById('selectedDayEventsContainer');
        
        if (dayEvents.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `Events on ${monthNames[currentMonth]} ${day}`;
        
        eventsContainer.innerHTML = '';
        dayEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.style.borderLeftColor = event.color;
            eventCard.innerHTML = `
                <h4 style="font-size: 0.875rem; margin-bottom: 0.5rem;">${event.title}</h4>
                <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem;">${event.time}</p>
                <p style="font-size: 0.75rem; color: #64748b;">${event.location}</p>
            `;
            eventsContainer.appendChild(eventCard);
        });
        
        container.classList.remove('hidden');
    } catch (error) {
        console.error('❌ Error in showSelectedDayEvents:', error.message);
    }
}

// Calendar Navigation
document.getElementById('prevMonthBtn').addEventListener('click', () => {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    loadCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
    loadCalendar();
});

document.getElementById('prevMonthFullBtn').addEventListener('click', () => {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    loadCalendar();
});

document.getElementById('nextMonthFullBtn').addEventListener('click', () => {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
    loadCalendar();
});

document.getElementById('viewFullCalendarBtn').addEventListener('click', () => {
    showAppPage('fullCalendarPage');
});

document.getElementById('closeFullCalendarBtn').addEventListener('click', () => {
    showAppPage('calendarPage');
});

// ==================== PROFILE ====================

async function updateProfile() {
    if (!currentUser) return;
    
    try {
        console.log('📋 Updating user profile...');
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            document.getElementById('profileName').textContent = userData.username || 'Guest User';
            document.getElementById('profileEmail').textContent = userData.email;
            document.getElementById('profileAvatarText').textContent = (userData.username || 'G')[0].toUpperCase();
            // For posts count, we might need to query, but for now, set to 0
            document.getElementById('userPostsCount').textContent = 0;
            document.getElementById('userLikesCount').textContent = 0;
        }
        
        console.log('✅ Profile UI updated');
    } catch (error) {
        console.error('❌ Error updating profile:', error.message);
    }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        console.log('🔓 Attempting to logout...');
        
        await signOut(auth);
        
        console.log('✅ Logout successful');
        // onAuthStateChanged will handle showing login page
    } catch (error) {
        console.error('❌ Error signing out:', error.message);
        alert('Error logging out. Please try again.');
    }
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
    // Pre-fill current username
    const editInput = document.getElementById('editUsernameInput');
    if (editInput) editInput.value = currentUsername || '';
    hideError('editProfileError');
    document.getElementById('editProfileModal').classList.remove('hidden');
});

// Close modal
document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editProfileModal').classList.add('hidden');
});

// Close modal on backdrop click
document.getElementById('editProfileModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editProfileModal')) {
        document.getElementById('editProfileModal').classList.add('hidden');
    }
});

document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('editProfileError');
    
    const newUsername = document.getElementById('editUsernameInput').value.trim();
    if (!newUsername) {
        showError('editProfileError', 'Username is required');
        return;
    }
    
    const v = validateUsername(newUsername);
    if (!v.valid) {
        showError('editProfileError', v.message);
        return;
    }
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            username: newUsername,
        });
        currentUsername = newUsername;
        document.getElementById('editProfileModal').classList.add('hidden');
        updateProfile();
    } catch (error) {
        showError('editProfileError', error.message);
    }
});

// ==================== UTILITY FUNCTIONS ====================

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    
    return 'Just now';
}

function getCategoryClass(category) {
    const classes = {
        'Academics': 'category-academics',
        'Lost & Found': 'category-lost-found',
        'Events': 'category-events',
        'General': 'category-general'
    };
    return classes[category] || 'category-general';
}

function getDateFromFirestoreField(createdAt) {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    return new Date(createdAt);
}
