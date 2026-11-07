export const SITE_URL = 'https://portfolio-oleksandr-shpychka.vercel.app';

export const SITE = {
  url: SITE_URL,
  name: 'Oleksandr Shpychka',
  firstName: 'Oleksandr',
  shortName: 'OS',
  version: '2.0',
  role: 'Frontend & WordPress Developer',
  jobTitle: 'Frontend Developer',
  country: 'Ukraine',
  timeZone: 'Europe/Kyiv',
  city: 'Kyiv',
  status: 'available' as 'available' | 'busy',
  email: 'sasaspychka@gmail.com',
  cv: '/cv/Oleksandr-Shpychka-CV.pdf',
  links: {
    telegram: 'https://t.me/oshpychka',
    linkedin: 'https://www.linkedin.com/in/oleksandr-shpychka-a833a6309/',
    github: 'https://github.com/oshpychka',
  },
} as const;

export const NAV = [
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Contact', href: '/#contact' },
] as const;
