# Digital Academic Twin — Web

> **التوأم الأكاديمي الرقمي**: بوابة للطالب والمرشد الأكاديمي، تُري الطالب **ثمن القرار** قبل أن يتخذه، مثل حذف مادة أو تخفيف العبء، وتساعد المرشد على الوصول للطالب المناسب في الوقت المناسب. عربي وإنجليزي، فاتح وداكن، ومتجاوبة مع الجوال.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

**Live demo:** [dat.ksa.moe](https://dat.ksa.moe) · **API:** [DAT-backend](https://github.com/jxccr07/DAT-backend)

This repository is the web app of the Digital Academic Twin: the student and advisor portal, built with Next.js on top of the Laravel API.

---

## Try it

Open [dat.ksa.moe](https://dat.ksa.moe) and use the one-click demo buttons on the sign-in pages:

- **Struggling student (full scenario):** see your status, then try to drop a course and watch the price of that decision.
- **On-track student:** the calm side of the portal.
- **Demo advisor:** priorities, decision alerts and the talk-before-the-deadline list.

Demo data is synthetic, and whatever visitors write is cleared automatically after a few minutes.

## Features

| Area | What you get |
|---|---|
| **Student** | Dashboard with academic status and a time machine to graduation · price of a decision before dropping a course · course registration · schedule · study plan · academic record with a GPA what-if · messages with the advisor · profile |
| **Advisor** | Students ranked by need · weekly priorities and a critical tier · decision alerts · talk-before-the-drop-deadline list · student file with private notes and messaging |
| **Everyone** | Arabic (RTL) and English · light and dark themes · mobile-first layout · a methodology page explaining how the twin works |

## Architecture

```
Browser ──▶ Next.js (this repo) ──▶ Laravel API ──▶ SQLite
            · Server Components and Server Actions
            · Sanctum token kept in an httpOnly cookie
            · the browser never sees the API address or the token
```

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, Partial Prerendering) |
| UI | React 19, Tailwind CSS 4, lucide-react |
| Language | TypeScript (strict) |
| Validation | zod |
| i18n | Typed Arabic/English dictionaries with RTL/LTR |

## Getting started

**Requirements:** Node.js 22+ and the [Laravel API](https://github.com/jxccr07/DAT-backend) running.

```bash
git clone https://github.com/jxccr07/DAT-frontend.git
cd DAT-frontend
cp .env.example .env.local     # set API_URL to the API, e.g. http://127.0.0.1:8000/api/v1
npm install
npm run dev                    # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

## Project structure

```
src/
  app/[lang]/
    (auth)/        student login, advisor login, terms
    (app)/         dashboard, twin, registration, schedule, plan, grades,
                   messages, profile, advisor
  components/      twin, advising, shell and UI primitives
  i18n/            Arabic and English dictionaries
  lib/
    api.ts         server-only client for the Laravel API
    session.ts     httpOnly session cookie
    dal.ts         authenticated data access and role checks
    actions.ts     Server Actions (validated with zod)
  proxy.ts         locale prefix (/ar, /en) and sign-in redirect
scripts/
  strip-version.mjs  runs after every build
```

## Security

- **Backend-for-frontend:** the browser only talks to Next.js; the API address and the session token stay on the server.
- Every Server Action re-checks the session and validates its input; the API validates and authorizes everything again.
- Students and advisors only see the pages of their own role.
- Strict security headers on every response, including a Content Security Policy, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS in production.

Found a security issue? Please report it privately through GitHub's **Report a vulnerability** button on this repository instead of opening a public issue.

## License

Licensed under the [Apache License 2.0](LICENSE).
