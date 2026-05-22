function getData(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error('Storage read failed for', key, error);
    return fallback;
  }
}

function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage write failed for', key, error);
  }
}

export function getUsers() {
  return getData('gcthreads_users', []);
}

export function saveUsers(users) {
  setData('gcthreads_users', users);
}

export function getPosts() {
  return getData('gcthreads_posts', []);
}

export function savePosts(posts) {
  setData('gcthreads_posts', posts);
}

export function getNotifications() {
  return getData('gcthreads_notifications', []);
}

export function saveNotifications(notifications) {
  setData('gcthreads_notifications', notifications);
}

export function getSession() {
  return getData('gcthreads_session', null);
}

export function saveSession(session) {
  setData('gcthreads_session', session);
}

export function clearSession() {
  localStorage.removeItem('gcthreads_session');
}

export function getCurrentUser() {
  const session = getSession();
  if (!session?.email) return null;
  return getUsers().find(user => user.email === session.email) || null;
}

export function persistCurrentUser(user) {
  const users = getUsers();
  const existingIndex = users.findIndex(item => item.email === user.email);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  saveUsers(users);
  saveSession({ email: user.email });
}

export function initializeDefaultData() {
  if (getData('gcthreads_posts', null) === null) {
    savePosts([
      {
        id: 'sample-1',
        category: 'Academics',
        title: 'Library hours during finals',
        content: 'Can the library open earlier on exam days?',
        author: 'Student Council',
        authorEmail: 'studentcouncil@gordoncollege.edu.ph',
        createdAt: new Date().toISOString(),
        likes: 12,
        dislikes: 2,
        likedBy: [],
        dislikedBy: [],
        trending: true,
        resolved: false
      },
      {
        id: 'sample-2',
        category: 'Lost & Found',
        title: 'Found black backpack',
        content: 'A black backpack was found near the main gate.',
        author: 'Campus Security',
        authorEmail: 'security@gordoncollege.edu.ph',
        createdAt: new Date().toISOString(),
        likes: 5,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        trending: false,
        resolved: true
      },
      {
        id: 'sample-3',
        category: 'Events',
        title: 'Volunteer tutors needed',
        content: 'Looking for students to help run free tutoring sessions.',
        author: 'Guidance Office',
        authorEmail: 'guidance@gordoncollege.edu.ph',
        createdAt: new Date().toISOString(),
        likes: 8,
        dislikes: 1,
        likedBy: [],
        dislikedBy: [],
        trending: false,
        resolved: false
      }
    ]);
  }
  if (getData('gcthreads_users', null) === null) {
    saveUsers([]);
  }
}
