import type { ProjectEntry } from './types';

export const projects: ProjectEntry[] = [
  {
    slug: 'barbershop-crm',
    title: 'CRM for Barbershop',
    year: 2024,
    type: 'personal',
    role: 'Full-stack Development',
    stack: ['React', 'TypeScript', 'Redux Toolkit', 'Express', 'Node.js', 'MongoDB', 'JWT'],
    summary:
      'Booking and staff system for a barbershop: appointments, client reviews and three access levels for employees, managers and admins.',
    cover: 'cover.png',
    codeUrl: 'https://github.com/oshpychka/CRM-for-barbershop',
    featured: true,
    order: 1,
    challenge:
      'A barbershop runs on bookings, staff and reputation. One tool has to hold all three, and not everyone on the team should see everything.',
    solution:
      'A REST API on Express and MongoDB with JWT authentication, refresh tokens, a persistent login and a rate limit on sign-in attempts. Three roles: employees work with bookings and reviews, managers and admins also manage staff. The React front end talks to the API through Redux Toolkit Query, so lists stay in sync after every edit.',
  },
  {
    slug: 'finance-app',
    title: 'Finance Management App',
    year: 2024,
    type: 'personal',
    role: 'Frontend Development',
    stack: ['React', 'TypeScript', 'Redux', 'Chart.js'],
    summary: 'An expense tracker. Add spending by category and date, filter it, and see where the money goes on a chart.',
    cover: 'cover.png',
    codeUrl: 'https://github.com/oshpychka/finance-management-app',
    featured: true,
    order: 2,
    challenge: 'Most people know they spend too much. Few know on what.',
    solution:
      'Every expense gets a title, an amount, a date and one of four categories. The list filters by category, and a doughnut chart built with Chart.js shows the share of each one next to the running total. State lives in Redux, data comes from a mock REST API on json-server.',
  },
  {
    slug: 'users-filter',
    title: 'Users Filter',
    year: 2024,
    type: 'personal',
    role: 'Frontend Development',
    stack: ['React', 'TypeScript', 'Redux Toolkit'],
    summary: 'A user directory that loads from an API and filters as you type, by name, username, email or phone.',
    cover: 'cover.png',
    codeUrl: 'https://github.com/oshpychka/users-filter',
    featured: true,
    order: 3,
    challenge: 'Finding one person in a list should take one field and no page reloads.',
    solution:
      'Users load from the JSONPlaceholder API through a Redux Toolkit async thunk with loading and error states. A single input filters the list on every keystroke, and a select switches the search between name, username, email and phone.',
  },
  {
    slug: 'football-helper',
    title: 'Football Helper App',
    year: 2024,
    type: 'personal',
    role: 'Frontend Development',
    stack: ['React', 'TypeScript', 'Redux Toolkit', 'React Router'],
    summary:
      'A match lineup viewer: both starting elevens placed on the pitch by formation, with coaches and team crests.',
    cover: 'cover.png',
    codeUrl: 'https://github.com/oshpychka/trainee-football-app-project',
    featured: true,
    order: 4,
    challenge: 'A lineup from a football API is a long JSON list. A coach or a fan wants to see it as a pitch.',
    solution:
      'The app takes lineup data in the API-Football format and places each starting player on the pitch by their grid position, so the formation reads at a glance. Both teams, their coaches and crests sit on one screen, and each match has its own route.',
  },
];
