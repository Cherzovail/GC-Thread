import { state } from './state.js';
import { getNotifications, saveNotifications } from './storage.js';

export function createNotification(type, message, postId = null) {
  const notifications = getNotifications();
  const notification = {
    id: `notif-${Date.now()}`,
    type, // 'like', 'dislike', 'comment'
    message,
    postId,
    createdAt: new Date().toISOString(),
    read: false
  };
  
  notifications.unshift(notification);
  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications.pop();
  }
  
  saveNotifications(notifications);
  updateNotificationBadge();
  return notification;
}

export function markNotificationsAsRead() {
  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
  updateNotificationBadge();
}

export function clearAllNotifications() {
  saveNotifications([]);
  updateNotificationBadge();
  renderNotifications();
}

export function updateNotificationBadge() {
  const notifications = getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  
  if (unreadCount > 0) {
    badge?.classList.remove('hidden');
    badge.textContent = String(unreadCount);
  } else {
    badge?.classList.add('hidden');
  }
}

export function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;
  
  const notifications = getNotifications();
  container.innerHTML = '';
  
  if (notifications.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#64748b;">No notifications yet.</div>';
    return;
  }
  
  notifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
    const timestamp = new Date(notif.createdAt);
    const timeText = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
      <div class="notification-content">
        <p>${notif.message}</p>
        <span class="notification-time">${timeText}</span>
      </div>
    `;
    
    container.appendChild(item);
  });
  
  markNotificationsAsRead();
}

export function initNotifications() {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationPanel = document.getElementById('notificationPanel');
  const closeNotificationPanel = document.getElementById('closeNotificationPanel');
  const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
  
  updateNotificationBadge();
  
  notificationBtn?.addEventListener('click', () => {
    notificationPanel?.classList.toggle('hidden');
    if (!notificationPanel?.classList.contains('hidden')) {
      renderNotifications();
    }
  });
  
  closeNotificationPanel?.addEventListener('click', () => {
    notificationPanel?.classList.add('hidden');
  });
  
  clearNotificationsBtn?.addEventListener('click', () => {
    clearAllNotifications();
  });
  
  // Close panel when clicking outside
  document.addEventListener('click', (event) => {
    const isClickInsidePanel = notificationPanel?.contains(event.target);
    const isClickOnButton = notificationBtn?.contains(event.target);
    
    if (!isClickInsidePanel && !isClickOnButton && !notificationPanel?.classList.contains('hidden')) {
      notificationPanel?.classList.add('hidden');
    }
  });
}
