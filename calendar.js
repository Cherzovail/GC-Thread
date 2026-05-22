import { state } from '../state.js';

function hasEvent(day) {
  return state.events.some(event => event.month === state.currentMonth && event.year === state.currentYear && event.day === day);
}

function isToday(day) {
  const now = new Date();
  return now.getFullYear() === state.currentYear && now.getMonth() === state.currentMonth && now.getDate() === day;
}

export function generateCalendar(containerId, isFull) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();

  for (let i = 0; i < firstDayIndex; i++) {
    const placeholder = document.createElement('div');
    placeholder.className = 'calendar-day empty';
    container.appendChild(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if (isToday(day)) cell.classList.add('today');
    if (hasEvent(day)) cell.classList.add('has-event');
    if (state.selectedDay === day && !isFull) cell.classList.add('selected');

    cell.textContent = day;
    cell.tabIndex = 0;
    cell.addEventListener('click', () => {
      state.selectedDay = day;
      if (isFull) {
        showSelectedDayEvents(day);
      } else {
        const current = document.getElementById(containerId);
        if (current) {
          const children = current.querySelectorAll('.calendar-day');
          children.forEach(child => child.classList.remove('selected'));
          cell.classList.add('selected');
        }
      }
    });

    if (hasEvent(day)) {
      const dot = document.createElement('span');
      dot.className = 'event-dot';
      cell.appendChild(dot);
    }

    container.appendChild(cell);
  }
}

export function updateMonthDisplay() {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const label = `${monthNames[state.currentMonth]} ${state.currentYear}`;
  document.getElementById('currentMonthYear').textContent = label;
  document.getElementById('currentMonthYearFull').textContent = label;
}

export function loadEvents() {
  const container = document.getElementById('eventsContainer');
  if (!container) return;
  container.innerHTML = '';

  const monthEvents = state.events.filter(event => event.month === state.currentMonth && event.year === state.currentYear);
  if (monthEvents.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No events scheduled for this month.</div>';
    return;
  }

  monthEvents.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-content">
        <div class="event-icon" style="background:${event.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 7V3h8v4" />
            <rect x="3" y="7" width="18" height="14" rx="2" />
          </svg>
        </div>
        <div class="event-details">
          <h4>${event.title}</h4>
          <div class="event-info"><span>${event.date || `${event.month + 1}/${event.day}/${event.year}`}</span></div>
          <div class="event-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/></svg><span>${event.time}</span></div>
          <div class="event-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8c0 3.866 2.774 7.088 6.4 7.852"/></svg><span>${event.location}</span></div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

export function showSelectedDayEvents(day) {
  const dayEvents = state.events.filter(event => event.month === state.currentMonth && event.year === state.currentYear && event.day === day);
  const selectedDayEvents = document.getElementById('selectedDayEvents');
  const title = document.getElementById('selectedDayTitle');
  const container = document.getElementById('selectedDayEventsContainer');
  if (!selectedDayEvents || !title || !container) return;

  if (dayEvents.length === 0) {
    selectedDayEvents.classList.add('hidden');
    return;
  }

  selectedDayEvents.classList.remove('hidden');
  title.textContent = `Events for ${day} ${new Date(state.currentYear, state.currentMonth).toLocaleString('default', { month: 'long' })}`;
  container.innerHTML = '';

  dayEvents.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-content">
        <div class="event-icon" style="background:${event.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 7V3h8v4" />
            <rect x="3" y="7" width="18" height="14" rx="2" />
          </svg>
        </div>
        <div class="event-details">
          <h4>${event.title}</h4>
          <div class="event-info"><span>${event.time}</span></div>
          <div class="event-info"><span>${event.location}</span></div>
          <div class="event-info"><span>${event.attendees} attending</span></div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

export function changeMonth(delta) {
  state.currentMonth += delta;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  }
  if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  }
  generateCalendar('calendarGrid', false);
  generateCalendar('calendarGridFull', true);
  updateMonthDisplay();
  loadEvents();
}

export function initCalendar() {
  generateCalendar('calendarGrid', false);
  generateCalendar('calendarGridFull', true);
  updateMonthDisplay();
  loadEvents();
}
