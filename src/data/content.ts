export const hero = {
  line: 'Frontend developer. I take a design and ship it as a fast, animated website or web app, from WordPress themes to React and Three.js.',
  facts: ['3+ years in web', 'Freelance & full-time', 'Based in Ukraine'],
};

export const about = {
  heading: 'I write the part of the site people actually touch.',
  paragraphs: [
    "I'm Oleksandr, a frontend developer. Since 2023 I've been building websites and web apps for my own clients. From 2024 to 2025 I also worked at Bato Web Agency, where I made custom WordPress themes, 3D scenes animated with GSAP and interactive UI demos for CodePen. Since January 2025 I've been building WordPress sites, payment integrations and custom plugins at Consultant LM LLC.",
    'I like work where design and code meet: a layout that holds up on every screen, an animation that explains instead of decorating, a CMS the client can use without calling me.',
    "I'm based in Ukraine and open to both freelance projects and full-time roles.",
  ],
  points: [
    { label: 'From Figma', text: 'Layouts built to the pixel and responsive down to 360px.' },
    { label: 'With motion', text: "GSAP and Three.js where they help, nothing where they don't." },
    { label: 'For handoff', text: 'WordPress themes the client can edit on their own.' },
  ],
  photoAlt: 'Portrait of Oleksandr Shpychka',
};

export interface Skill {
  name: string;
  core?: boolean;
}

export const stack: Skill[] = [
  { name: 'WordPress', core: true },
  { name: 'PHP', core: true },
  { name: 'HTML & CSS', core: true },
  { name: 'JavaScript', core: true },
  { name: 'TypeScript' },
  { name: 'React' },
  { name: 'Next.js' },
  { name: 'Redux' },
  { name: 'GSAP' },
  { name: 'Three.js' },
  { name: 'REST APIs' },
  { name: 'Node.js' },
  { name: 'Express' },
  { name: 'MongoDB' },
  { name: 'Git & GitHub' },
  { name: 'Figma' },
];

export interface Job {
  from: string;
  to: string;
  company: string;
  role: string;
  text?: string;
  points?: string[];
}

export const experience: Job[] = [
  {
    from: '2023',
    to: 'Now',
    company: 'Self-employed',
    role: 'Frontend / WordPress Developer',
    text: 'Websites and web apps for clients in different industries, from the first brief to launch.',
  },
  {
    from: '2024',
    to: '2025',
    company: 'Bato Web Agency',
    role: 'Frontend / WordPress Developer',
    points: [
      'Built single- and multi-page WordPress sites on custom themes.',
      'Made interactive 3D objects and scroll animations with GSAP.',
      'Created UI animations and interactive demos for CodePen.',
      'Built web apps with React and Next.js.',
    ],
  },
  {
    from: 'Jan 2025',
    to: 'Nov 2026',
    company: 'Consultant LM LLC',
    role: 'WordPress Developer',
    points: [
      'Built WordPress sites and custom websites for clients.',
      'Connected online payments.',
      'Developed custom WordPress plugins.',
    ],
  },
];

export const experienceEnd = 'Open to freelance & full-time';

export const contact = {
  heading: "Let's talk",
  line: 'Have a site, an app or an animation in mind? A short message is enough to start.',
  replies: 'usually replies within a day',
  footer: 'OS v2.0 — built by hand, not from a template.',
};

export const meta = {
  home: {
    title: 'Oleksandr Shpychka — Frontend & WordPress Developer',
    description:
      'Frontend developer from Ukraine building websites and web apps with React, Next.js and WordPress, plus GSAP and Three.js motion. Open to freelance and full-time work.',
  },
  work: {
    title: 'All work — Oleksandr Shpychka',
    description: 'Every project in one list: client sites and personal builds, with stack, role and source code.',
  },
  notFound: {
    title: 'Blueprint not found — Oleksandr Shpychka',
    description: "This page isn't on the drawing board.",
  },
};
