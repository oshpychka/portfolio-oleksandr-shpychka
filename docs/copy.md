# Тексты сайта — v2, согласовано (этап 1)

Тексты сайта на английском, пояснения для согласования на русском.
Варианты выбраны, вопросы закрыты. Это источник текстов для этапа 2.

Источники фактов: REDESIGN.md, старый сайт (`_legacy/index.html`) и код четырёх репозиториев на GitHub.
Описания проектов со старого сайта («real-time analytics», «live match tracking», «smart sorting») в коде не подтверждаются, поэтому я их не использую.

---

## 1. Мета и SEO

| Страница | title | description |
|---|---|---|
| `/` | Oleksandr Shpychka — Frontend & WordPress Developer | Frontend developer from Ukraine building websites and web apps with React, Next.js and WordPress, plus GSAP and Three.js motion. Open to freelance and full-time work. |
| `/work` | All work — Oleksandr Shpychka | Every project in one list: client sites and personal builds, with stack, role and source code. |
| `/work/[slug]` | {title} — case study — Oleksandr Shpychka | {summary} |
| `/404` | Blueprint not found — Oleksandr Shpychka | This page isn't on the drawing board. |

JSON-LD `Person`: name `Oleksandr Shpychka`, jobTitle `Frontend Developer`, sameAs: GitHub, LinkedIn, Telegram.
OG-картинка: сетка, логотип OS, `Oleksandr Shpychka`, `Frontend & WordPress Developer`.

---

## 2. Лоадер и экран входа

```
BOOTING OS v2.0…
LOADING TYPE          ← шрифты
LOADING WORK          ← обложки
LOADING SCENE         ← 3D
SYSTEM READY
```

- Кнопка: `[ ENTER ]`
- Ссылка под ней: `enter without sound`
- Подсказка мелко: `Sound is quiet and can be turned off anytime.`

---

## 3. Header

- Логотип: `OS` (aria-label: `Oleksandr Shpychka — home`)
- Навигация: `WORK` `ABOUT` `EXPERIENCE` `CONTACT`
- Звук: `SOUND ON` / `SOUND OFF` (для скринридера: `Sound`)
- Статус: `● AVAILABLE`
- Круглая кнопка меню: `Menu` / `Close` (aria-label: `Open menu` / `Close menu`)
- Ссылка для клавиатуры: `Skip to content`

Статус `AVAILABLE` подтверждён. Значение лежит в конфиге одной строкой.

---

## 4. Hero

**h1:** `Oleksandr Shpychka`

**Фраза под именем:**

> Frontend developer. I take a design and ship it as a fast, animated website or web app, from WordPress themes to React and Three.js.

**Ряд фактов (моно):**

```
3+ YEARS IN WEB
FREELANCE & FULL-TIME
BASED IN UKRAINE
```

**Кнопки:** `START A PROJECT` → к контактам · `DOWNLOAD CV` → PDF

**Системные подписи:** `STATUS: AVAILABLE` · `SYS.TIME 14:32 KYIV` · `SCROLL TO EXPLORE`

---

## 5. About

**Подпись слева:** `01` / `About`

**Заголовок:** I write the part of the site people actually touch.

**Текст:**

> I'm Oleksandr, a frontend developer. Since 2023 I've been building websites and web apps for my own clients. From 2024 to 2025 I also worked at Bato Web Agency, where I made custom WordPress themes, 3D scenes animated with GSAP and interactive UI demos for CodePen.
>
> I like work where design and code meet: a layout that holds up on every screen, an animation that explains instead of decorating, a CMS the client can use without calling me.
>
> I'm based in Ukraine and open to both freelance projects and full-time roles.

**Три коротких пункта под текстом** (моно-подпись + строка):

- `FROM FIGMA` — Layouts built to the pixel and responsive down to 360px.
- `WITH MOTION` — GSAP and Three.js where they help, nothing where they don't.
- `FOR HANDOFF` — WordPress themes the client can edit on their own.

**alt фото:** `Portrait of Oleksandr Shpychka`

---

## 6. Selected Work

**Подпись слева:** `02` / `Selected work`
**Заголовок:** `Selected work`

Строка проекта: название крупно, справа роль и год. На тач-устройствах карточка с кнопкой `View case`.
Кнопка внизу: `ALL WORK ⁴` (число подставляется автоматически).

### Данные проектов

| slug | year | role | stack |
|---|---|---|---|
| barbershop-crm | 2024 | Full-stack Development | React, TypeScript, Redux Toolkit, Express, Node.js, MongoDB, JWT |
| finance-app | 2024 | Frontend Development | React, TypeScript, Redux, Chart.js |
| users-filter | 2024 | Frontend Development | React, TypeScript, Redux Toolkit |
| football-helper | 2024 | Frontend Development | React, TypeScript, Redux Toolkit, React Router |

### summary (для списка)

- **CRM for Barbershop** — Booking and staff system for a barbershop: appointments, client reviews and three access levels for employees, managers and admins.
- **Finance Management App** — An expense tracker. Add spending by category and date, filter it, and see where the money goes on a chart.
- **Users Filter** — A user directory that loads from an API and filters as you type, by name, username, email or phone.
- **Football Helper App** — A match lineup viewer: both starting elevens placed on the pitch by formation, with coaches and team crests.

---

## 7. Страница кейса

**Мета-строка:** `YEAR` · `ROLE` · `TYPE` · `STACK`
**Кнопки:** `LIVE SITE ↗` (только если есть ссылка) · `SOURCE CODE ↗`
**Блоки:** `01 — Challenge` · `02 — Solution` · `03 — Result`
**Низ:** `NEXT PROJECT` + крупное название · `← ALL WORK`

Тексты кейсов написаны по коду проектов. Блок Result пустой и на сайте не показывается.

### CRM for Barbershop

- **Challenge.** A barbershop runs on bookings, staff and reputation. One tool has to hold all three, and not everyone on the team should see everything.
- **Solution.** A REST API on Express and MongoDB with JWT authentication, refresh tokens, a persistent login and a rate limit on sign-in attempts. Three roles: employees work with bookings and reviews, managers and admins also manage staff. The React front end talks to the API through Redux Toolkit Query, so lists stay in sync after every edit.

### Finance Management App

- **Challenge.** Most people know they spend too much. Few know on what.
- **Solution.** Every expense gets a title, an amount, a date and one of four categories. The list filters by category, and a doughnut chart built with Chart.js shows the share of each one next to the running total. State lives in Redux, data comes from a mock REST API on json-server.

### Users Filter

- **Challenge.** Finding one person in a list should take one field and no page reloads.
- **Solution.** Users load from the JSONPlaceholder API through a Redux Toolkit async thunk with loading and error states. A single input filters the list on every keystroke, and a select switches the search between name, username, email and phone.

### Football Helper App

- **Challenge.** A lineup from a football API is a long JSON list. A coach or a fan wants to see it as a pitch.
- **Solution.** The app takes lineup data in the API-Football format and places each starting player on the pitch by their grid position, so the formation reads at a glance. Both teams, their coaches and crests sit on one screen, and each match has its own route.

---

## 8. Stack

**Подпись слева:** `03` / `Stack`
**Заголовок:** `Stack`
**Подсказка (моно, только на десктопе с JS):** `GRAB A WORD. THROW IT.`
**На тач-устройствах:** `TAP AND DRAG`

Слова: HTML & CSS · JavaScript · TypeScript · React · Next.js · Redux · WordPress · GSAP · Three.js · REST APIs · Node.js · Express · MongoDB · Git & GitHub · Figma

---

## 9. Experience

**Подпись слева:** `04` / `Experience`
**Заголовок:** `Experience`

Узлы на линии идут сверху вниз по времени:

**2023 — NOW · Self-employed**
Frontend / WordPress Developer
Websites and web apps for clients in different industries, from the first brief to launch.

**2024 — 2025 · Bato Web Agency**
Frontend / WordPress Developer
- Built single- and multi-page WordPress sites on custom themes.
- Made interactive 3D objects and scroll animations with GSAP.
- Created UI animations and interactive demos for CodePen.
- Built web apps with React and Next.js.

**Узел в конце линии:** `NOW — open to freelance & full-time`

---

## 10. Contact + Footer

**Огромно:** `LET'S TALK`

**Под ним:** Have a site, an app or an animation in mind? A short message is enough to start.

**Почта:** `sasaspychka@gmail.com`
**Подсказка:** `CLICK TO COPY` → после клика `COPIED`

**Ссылки:** `TELEGRAM ↗` · `LINKEDIN ↗` · `GITHUB ↗` · `CV ↓`

**Время:**
```
LOCAL TIME 14:32 · KYIV
usually replies within a day
```

**Футер:**
- `OS v2.0 — built by hand, not from a template.`
- `© 2026 Oleksandr Shpychka`
- `BLUEPRINT MODE` (кнопка) · `BACK TO TOP ↑`

**Режим чертежа:** `BLUEPRINT MODE: ON · PRESS B TO EXIT`

---

## 11. Страница `/work`

**h1:** `All work`
**Подзаголовок:** Client sites and personal builds, newest first.
**Фильтр:** `ALL` · `COMMERCIAL` · `PERSONAL` (с числом в верхнем индексе)
**Пустой фильтр:** `Nothing here yet. Client work is on the way.`

Фильтр без проектов не показывается. Сейчас все проекты personal, поэтому кнопки COMMERCIAL не будет, пока не появится первый коммерческий проект.

---

## 12. Страница 404

**h1:** `Blueprint not found`
**Текст:** This page fell off the drawing board. Put the modules back in place, or skip the puzzle.
**Кнопка:** `BACK HOME`
**После сборки:** `ASSEMBLED. SYSTEM RESTORED.`
**Мелко:** `ERROR 404 · OS v2.0`

---

## Открытые TODO

- PDF резюме: `public/cv/Oleksandr-Shpychka-CV.pdf`.
- Ссылки на Bato, CodePen и коммерческие проекты — позже, по решению владельца.
- Результаты кейсов — по желанию владельца.
