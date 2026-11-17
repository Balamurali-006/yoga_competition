# Ekadhma — International Yoga Competition Portal

A full-stack web application for managing an international Yoga competition. Covers public registration (individual & school/group), direct UPI payment instructions with UTR submission and manual admin verification, committee-based participant verification and scoring, a live leaderboard, and a complete admin back-office — all backed by Firebase.

## Current Project Status

The application uses `upi-backend/` as its only API and is configured for Vercel (frontend) and Render (API). UPI payments are not automatically verified: admins must match each submitted UTR and exact amount against trusted bank records before the backend confirms a registration and assigns serial numbers. Configure Firebase, UPI and (if screenshots are enabled) Firebase Storage credentials before deployment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v6, Create React App, Vercel |
| Styling | Tailwind CSS (utility classes), legacy custom CSS for some wrappers |
| Backend | Node.js + Express 5 on Render |
| Database | Cloud Firestore |
| Authentication | Firebase Auth (email/password) with role-based access via Firestore |
| Payments | Direct UPI instructions, transaction-reference submission, manual bank-record verification |
| File Storage | Firebase Storage Admin SDK for optional private payment screenshots |
| Notifications | react-toastify |
| Icons | react-icons |
| Firebase Project | `lenin-2e9d2` |

---

## What's Already Built

### Public Area (fully functional)

- **Home page** — Modern landing page with parallax hero image, animated background blobs, intersection-observer scroll animations, "2025 Edition" badge, stats counters (5000+ Participants, 150+ Events, 3 Levels), "Why Participate?" feature cards, and CTA buttons. All Tailwind CSS.
- **Individual Registration** (`/register`) — Renders the `RegistrationForm` component. Collects participant details and submits them to the UPI backend, which creates a pending Firestore registration and a session-scoped access token.
- **School / Group Registration** (`/school-registration`) — Collects school-level info plus a dynamic table of students. The UPI backend creates participants and one group payment with the server-configured per-participant fee.
- **UPI Payment and Participant Status** (`/upi-payment/:paymentId`) — Shows the organization UPI ID, configured fee, payment-specific UPI QR/deep link, and UTR submission form. Participants can check their payment status and, after admin verification, view serial numbers and signed check-in QR tickets.
- **Manual Admin Payment Review** (`/admin/upi-payments`) — Admin-only payment search, status filters, UTR/amount review, optional screenshot access, bank-record confirmation, approve/reject actions, internal notes, and audit history.
- **Competition Check-in** (`/admin/check-in`) — Admin QR scanner and manual serial-number fallback; backend accepts only verified registrations and prevents repeat check-ins.
- **Leaderboard** (`/leaderboard`) — Fetches verified participants from the UPI backend (top 100 scored entries). Top-3 podium display, desktop table view, mobile card view, and stats footer.

### Committee Area (fully functional, role-protected)

Routes are guarded by `ProtectedRoute` — allows `"committee"` or `"admin"` roles.

- **Committee Login** (`/committee/login`) — Firebase Auth login with role check. Committee users → `/committee/verify`, admin users → `/admin/dashboard`.
- **Participant Verification** (`/committee/verify`) — Free-text search across all participants (name, email, phone, serial, institution). Shows full participant details. "Mark Verified" button updates Firestore with `verificationStatus: "verified"` and `verifiedAt` timestamp.
- **Score Entry** (`/committee/score`) — Find a participant by serial number (payment must be `success` for legacy records or `VERIFIED` for UPI registrations), then enter five scores from 0–10. Calculates total and updates the `participants` doc directly in Firestore.

### Admin Area (fully functional, role-protected)

All admin routes are guarded by `AdminRoute` — checks Firebase Auth + `role === "admin"` from Firestore.

- **Admin Login** (`/admin/login`) — Firebase Auth with admin-role verification.
- **Admin Dashboard** (`/admin/dashboard`) — Live stat cards fetched from Firestore: total participants, users, events, categories. Quick-action navigation grid.
- **Manage Events** (`/admin/events`) — Full CRUD with real-time Firestore subscription. Fields: Event Name, Level (district/state/national), Location, Date.
- **Manage Categories** (`/admin/categories`) — Full CRUD with real-time subscription. Fields: Category Name, Code (auto-uppercased).
- **Manage Age Groups** (`/admin/age-groups`) — Full CRUD with real-time subscription. Fields: Group Name, Min Age, Max Age.
- **Manage Templates** (`/admin/templates`) — Create + Delete (no edit). Real-time subscription to `scoringTemplates`. Fields: Template Name, Criteria (comma-separated, displayed as pill tags).
- **Manage Participants** (`/admin/participants`) — Read-only view with real-time subscription. Table: Name, Institution, Event, Status (color-coded badge), Serial Number.
- **Manage Users** (`/admin/users`) — Creates Firebase Auth accounts through the protected UPI API. Profile editing and deletion are unavailable while user-document writes remain server-only.
- **Admin Leaderboard** (`/admin/leaderboard`) — Reads from Firestore `participants` collection. Filters for paid participants with scores, sorted by score descending. Table with rank, name, institution, score.

### Shared Components

| Component | Status | Description |
|-----------|--------|-------------|
| `Navbar` | ✅ Functional | Fixed navbar with scroll-triggered blur/shadow, 5 nav links with emoji icons, active-route gradient pill, "Join Now" CTA, animated mobile hamburger menu |
| `Footer` | ✅ Functional | Static copyright footer |
| `AdminRoute` | ✅ Functional | Auth guard — checks Firebase Auth + admin role from `subscribeToAuth` |
| `ProtectedRoute` | ✅ Functional | Auth guard — allows committee + admin roles |
| `LoadingSpinner` | ✅ Functional | Reusable loading spinner |
| `RegistrationForm` | ✅ Functional | Validated participant form, auto-age-calc, UPI API registration submission |
| `SchoolRegistrationTable` | ✅ Functional | School info + dynamic student rows submitted to the isolated UPI API |

### Legacy cleanup

Unused Razorpay pages, phone-based status lookup, unreferenced committee components, the default CRA logo, and the unused browser Storage helper were removed. Registration status is available from the participant's token-protected UPI payment link; optional screenshots are handled by the backend.

### Firebase Utilities

- **`firebaseConfig.js`** — Firebase app init using `REACT_APP_FIREBASE_*` env vars. Exports `auth` and `db`.
- **`firestore.js`** — Two sets of CRUD helpers (newer: `subscribeToCollection`, `createCollectionDocument`, `updateCollectionDocument`, `deleteCollectionDocument` — used by admin pages; older: `createDocument`, `getDocument`, etc. — used elsewhere). Both functional.
- **`auth.js`** — `login()`, `logout()`, `subscribeToAuth()` (enriches Firebase user with Firestore role).

### UPI Backend (`upi-backend/`)

The Express 5 API supports individual and group registration, payment UTR submission, manual admin verification, transactional serial generation, signed QR check-in, committee participant search, admin user creation, and optional private screenshot storage. It uses the same Firestore project and Firebase Auth admin accounts as the frontend. See [upi-backend/README.md](./upi-backend/README.md) for environment variables, API routes, and setup.

### Firestore Security Rules

Well-structured rules with helper functions (`signedIn()`, `userRole()`, `isAdmin()`, `isStaff()`):

| Collection | Read | Write |
|------------|------|-------|
| `participants` | Staff only | Server/Admin SDK only; admin and committee client updates cannot change UPI payment status, serial numbers, or check-in data; admin can delete |
| `users` | Own doc or admin | Server-side only (Admin SDK) |
| `events`, `categories`, `ageGroups`, `scoringTemplates` | Admin only | Admin only |

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `participants` | Registrations; UPI status, serials, and check-in values are server-managed |
| `upiPayments` | Payment details and verification state per individual/group payment |
| `upiUtrClaims` | Hash-keyed UTR claims for duplicate prevention |
| `paymentAuditLogs` | Payment submission, status, and admin-note audit history |
| `serialCounters` | Transactional per-year serial-number counters |
| `checkInAuditLogs` | Successful admin check-in events |
| `users` | User accounts with roles (`admin` / `committee`) |
| `events` | Competition events with level, location, date |
| `categories` | Yoga categories with name and code |
| `ageGroups` | Age group definitions (name, min/max age) |
| `scoringTemplates` | Scoring criteria templates |

---

## Project Structure

```
clean-yoga/
├── public/                         # Static assets + index.html
├── upi-backend/
│   ├── app.js                      # UPI, admin, and committee API routes
│   ├── server.js                   # Firebase Admin initialization and API listener
│   ├── domain.js                   # UTR, amount, and QR-token helpers
│   ├── .env.example                # UPI backend configuration template
│   └── README.md                   # UPI API, setup, and security notes
├── src/
│   ├── components/
│   │   ├── admin/                  # Admin pages and components
│   │   ├── committee/              # Committee pages and components
│   │   ├── common/
│   │   │   ├── AdminRoute.jsx      # Admin auth guard
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Navbar.jsx          # Responsive nav with mobile menu
│   │   │   └── ProtectedRoute.jsx  # Committee auth guard
│   │   └── participant/
│   │       ├── RegistrationForm.jsx    # Main registration form
│   │       └── SchoolRegistrationTable.jsx  # School bulk registration
│   ├── firebase/
│   │   ├── auth.js                 # Login, logout, auth state subscription
│   │   ├── firebaseConfig.js       # Firebase init (env-based config)
│   │   ├── upiApi.js               # UPI backend requests and participant access token
│   │   └── firestore.js            # Generic Firestore CRUD helpers
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminUpiPayments.jsx # Payment review and audit history
│   │   │   ├── AdminCheckIn.jsx     # QR and serial-number check-in
│   │   │   ├── AdminDashboard.jsx  # Stats + navigation
│   │   │   ├── AdminLeaderboard.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── ManageAgeGroups.jsx # Full CRUD
│   │   │   ├── ManageCategories.jsx # Full CRUD
│   │   │   ├── ManageEvents.jsx    # Full CRUD
│   │   │   ├── ManageParticipants.jsx # Read-only view
│   │   │   ├── ManageTemplates.jsx # Create + Delete
│   │   │   └── ManageUsers.jsx     # Create accounts; profile writes are server-only
│   │   ├── committee/
│   │   │   ├── ScoreEntry.jsx      # Serial lookup + 5-criteria scoring
│   │   │   └── Verify.jsx          # Search + mark verified
│   │   ├── Home.jsx                # Animated landing page (Tailwind)
│   │   ├── IndividualRegistration.jsx
│   │   ├── Leaderboard.jsx         # Podium + table + stats
│   │   ├── UpiPaymentPage.jsx      # UPI payment, participant status, and QR ticket
│   │   └── SchoolRegistration.jsx
│   ├── styles/
│   │   ├── form.css                # Legacy wrapper styles
│   │   └── schoolRegistration.css  # Legacy wrapper styles
│   └── App.js                      # Routing + global auth state
├── .env.example                    # Frontend environment variable template
├── .firebaserc                     # Firebase project: lenin-2e9d2
├── firebase.json                   # Firestore and Storage rules
├── firestore.rules                 # Role-based security rules
├── package.json                    # Frontend dependencies
├── REMOVED_ITEMS.md                # Removed legacy items and restore command
├── render.yaml                     # Render backend service definition
├── vercel.json                     # Vercel SPA routing
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- A Firebase project with Firestore and Authentication enabled
- Organization UPI ID and registration fee
- Firebase Storage bucket only if backend screenshot upload is enabled

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Configure frontend environment

Create a local `.env` from the tracked example:

```powershell
Copy-Item .env.example .env
```

### 3. Configure and run the UPI backend

Configure `upi-backend/.env` from `upi-backend/.env.example`, including the Firebase service account, organization UPI ID, and real registration fee. Set `REACT_APP_UPI_API_BASE_URL=http://localhost:5001` in the project-root `.env`.

```powershell
Set-Location .\upi-backend
npm install
npm start
```

For screenshot uploads, also configure `FIREBASE_STORAGE_BUCKET`. Screenshots are optional and are treated as reference only. The backend cannot verify UTRs automatically; an admin must confirm them against actual bank transaction history.

### 4. Start the frontend

```bash
npm start
```

Frontend runs at `http://localhost:3000`.

## Deployment

### Vercel frontend

Import the repository into Vercel and use the repository root as the project root. Vercel builds with `npm run build`; `vercel.json` routes direct page requests to the React app. Configure the `REACT_APP_FIREBASE_*` values and `REACT_APP_UPI_API_BASE_URL` in the Vercel project environment. Set the API URL to the deployed Render service URL (for example, `https://<service>.onrender.com`) and redeploy after changing environment variables.

### Render API

Create a Render Blueprint from `render.yaml`, or create a Web Service with `upi-backend/` as its root directory, `npm install` as the build command, and `npm start` as the start command. Set the backend environment values from `upi-backend/.env.example` in Render; keep Firebase service-account and SMTP credentials in Render's secret environment settings, not in the repository. Set `CORS_ORIGIN` to the exact Vercel production origin (scheme and hostname, no path). Add preview origins only if they are intended to access the API.

The frontend's `REACT_APP_*` values are included in the browser bundle at build time. Do not put backend secrets in Vercel variables with a `REACT_APP_` prefix.

Deploy Firestore and Storage rules separately from the repository root:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## Known Limitations and Follow-up

| Item | Details |
|------|---------|
| User profile edit/delete | Firestore rules allow only server-side user writes; these profile actions need API support |
| Edit scoring templates | `ManageTemplates` supports create and delete but no edit |
| Edit/delete participants from admin | `ManageParticipants` is read-only |
| Verify.jsx scalability | Committee search and the instructor roster read participant data; add pagination or targeted queries at scale |
| School registration defaults | All school participants are hardcoded to `event: "district"`, `category: "group"` — no selection available |
| Bank verification integration | No bank/UPI provider API or statement import is configured; payments must be manually matched by an administrator |
| Distributed rate limiting | The new API's in-memory rate limiter is process-local; use shared storage before scaling to multiple instances |

Firestore collections are created lazily by the UPI backend; no relational migration is required.

---

## License

Private project — Ekadhma Yoga Competition.
