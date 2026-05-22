export const state = {
  currentUser: null,
  currentUsername: null,
  allHomePosts: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDay: null,
  events: [
    {
      id: 1,
      title: 'Final Exams Week',
      month: 3,
      day: 16,
      year: 2026,
      time: '8:00 AM - 5:00 PM',
      location: 'Various Rooms',
      attendees: 450,
      color: '#ef4444'
    },
    {
      id: 2,
      title: 'Study Group - Math',
      month: 3,
      day: 15,
      year: 2026,
      time: '7:00 PM - 9:00 PM',
      location: 'Library Room 3',
      attendees: 12,
      color: '#3b82f6'
    },
    {
      id: 3,
      title: 'Campus Career Fair',
      month: 3,
      day: 18,
      year: 2026,
      time: '10:00 AM - 4:00 PM',
      location: 'Main Gymnasium',
      attendees: 89,
      color: '#a855f7'
    },
    {
      id: 4,
      title: 'Spring Festival',
      month: 3,
      day: 22,
      year: 2026,
      time: '12:00 PM - 8:00 PM',
      location: 'Campus Grounds',
      attendees: 234,
      color: '#f97316'
    }
  ]
};
