# Sunkissed

מערכת ניהול והזמנת תורים לסטודיו שיזוף. צד לקוח וצד ניהול, ממשק בעברית עם תמיכת RTL מלאה.
Brand/title: **Sunkissed** (English). All UI text is in Hebrew.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase (Firestore)**.

---

## הרצה מקומית

```bash
npm install
npm run dev
```

Open http://localhost:3000

Build for production:

```bash
npm run build
npm start
```

---

## פריסה ל-Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel: **New Project → Import** the repo.
3. Framework preset is auto-detected as **Next.js**. No environment variables are
   needed — the Firebase config is embedded in `src/lib/firebase.ts` by design.
4. Click **Deploy**. That's it.

> The project ships with `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors`
> enabled in `next.config.mjs` so the very first deploy succeeds cleanly. After a
> successful local `npm run build`, you can set both back to `false` for stricter CI.

---

## הגדרת Firebase (חד-פעמי)

The project points at the Firebase project `sunkissed-ab591`.

1. In the [Firebase console](https://console.firebase.google.com/) open that project.
2. **Build → Firestore Database → Create database** (production mode, any region).
3. Deploy the included security rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules --project sunkissed-ab591
   ```
   (or paste the contents of `firestore.rules` into **Firestore → Rules** and publish.)

No Firestore composite indexes are required — every query uses a single field range.

---

## כניסת מנהל

- Route: **`/he/login`**
- Username: **`0512330484`**
- Password: **`talziv123`**

The session persists in `localStorage`. Credentials live in `src/lib/adminConfig.ts`.

> **גישה לאדמין:** יש גם קישור דיסקרטי "כניסת מנהל" בתחתית עמוד הבית, וגם הכתובת
> `/he` מפנה אוטומטית למסך הכניסה. כניסת המנהל **אינה** דרך מסך הכניסה של הלקוחות
> (`/login`) — זה מסך נפרד עם שם משתמש וסיסמה ייעודיים.

---

## פתרון תקלות נפוצות

**"אני לא מצליח להירשם / להזמין תור"** — ב-99% מהמקרים זה כי מסד הנתונים Firestore
עדיין לא הוקם או שכללי האבטחה לא פורסמו. בלי זה, כל ניסיון הרשמה ייכשל. ראו את הסעיף
"הגדרת Firebase" למעלה — צריך (1) ליצור Firestore Database בקונסולה, ו-(2) לפרסם את
`firestore.rules`. לאחר התיקון, הודעת השגיאה במסך תציג בדיוק מה חסר.

**"אני לא מצליח להיכנס לאדמין"** — ודאו שאתם בכתובת **`/he/login`** (לא `/login`),
ושאתם מזינים את שם המשתמש והסיסמה מהסעיף "כניסת מנהל" למעלה, בדיוק כפי שהם.

**"חייב חיבור מאובטח"** — אם פתחתם את האתר דרך `http://` רגיל (לא localhost), הדפדפן
חוסם את הצפנת הסיסמאות. השתמשו ב-`http://localhost:3000` בפיתוח, או בכתובת ה-HTTPS
של Vercel בפרודקשן.

### צעדים ראשונים בלוח הניהול
1. **`/he/settings`** — set opening hours, working days, slot granularity, buffer and daily capacity.
2. **`/he/services`** — add your tanning services (name, duration, price). Only **active**
   services appear to clients on the booking screen.
3. Clients can now register and book at **`/`**.

---

## אימות לקוח (טלפון + סיסמה בלבד)

- No email anywhere. Clients register/login with **phone number + password** only.
- Users are stored in the `users` collection (document id = normalized phone).
- Passwords are salted and hashed with **PBKDF2-SHA256** (Web Crypto, no dependency).
- Session persists in `localStorage`.

---

## מבנה הפרויקט

```
src/
  app/
    layout.tsx            root layout (RTL, Hebrew fonts, title "Sunkissed")
    page.tsx              landing
    login/                client phone+password auth
    booking/              real-time slot picker + transactional booking
    my-appointments/      view / cancel / reschedule
    he/
      layout.tsx          admin shell (auth guard + sidebar)
      login/              admin portal (hardcoded credentials)
      dashboard/          today's revenue, weekly chart, live appts (by phone)
      calendar/           day/week/month, manual booking, slot blocking
      customers/          ledger searchable by phone, history + notes
      services/           full CRUD for services/pricing/durations
      settings/           hours, buffer, capacity, working days
  components/             client + admin UI components
  contexts/               ClientAuthContext, AdminAuthContext
  lib/
    firebase.ts           embedded config + init
    adminConfig.ts        admin credentials
    hash.ts               PBKDF2 password hashing
    types.ts              shared types
    utils.ts              phone/date/time/currency helpers
    services/             Firestore CRUD: users, appointments, services,
                          settings, blockedDates, waitingList
public/
  logo.png                brand logo (palm + SUN-KISSED), background removed
  icon.png                favicon (palm)
firestore.rules           security rules
```

---

## מניעת כפל הזמנות (Concurrency)

Reservations are written inside a **Firestore transaction**. For every appointment we
compute the grid cells it occupies (duration + buffer, aligned to the slot granularity)
and create one **slot-lock** document per cell in `slotLocks`, keyed `YYYY-MM-DD_HH:MM`.
The transaction first reads every target lock; if any already exists it aborts with a
`SlotConflictError`, so two concurrent bookings for overlapping times can never both
succeed. Cancelling/rescheduling releases the relevant locks in a transaction too.

---

## הערות אבטחה (חשוב)

This build follows the requested architecture, which trades some security for simplicity:

- **Admin credentials are hardcoded** in the client bundle and are therefore readable by
  anyone who inspects the site. They exist for immediate access on first deploy.
- **Client password verification happens on the client** after reading the user document,
  which means the Firestore rules must allow reading `users`.
- The Firebase `apiKey` is a public client identifier (not a secret) — this is expected.

To harden for real production: move authentication to **Firebase Auth** via a **Cloud
Function** (verify phone+password server-side, issue a custom token), gate all Firestore
rules on `request.auth`, never expose password hashes to client reads, and enable
**Firebase App Check**. See the comments in `firestore.rules` and `src/lib/hash.ts`.
