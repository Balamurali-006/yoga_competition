# Ekadhma — International Yoga Competition Portal

A full-stack web application for managing an international Yoga competition. Covers public registration (individual & school/group), direct UPI payment instructions with UTR submission and manual admin verification, committee-based participant verification and scoring, a live leaderboard, and a complete admin back-office — all backed by Firebase.

## Current Project Status

The application has a separate UPI API in `upi-backend/`; the existing `server/` Razorpay backend is preserved and is no longer used by the updated registration/payment UI. UPI payments are not automatically verified: admins must match each submitted UTR and exact amount against trusted bank records before the backend confirms a registration and assigns serial numbers. Configure Firebase, UPI and (if screenshots are enabled) Firebase Storage credentials before running the new flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v6, Create React App |
| Styling | Tailwind CSS (utility classes), legacy custom CSS for some wrappers |
| Backend | Node.js + Express 5 |
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
- **Registration Status** (`/status`) — Legacy lookup by mobile number (10-digit validation). Calls the original backend `GET /registration-status?phone=...`.
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
- **Manage Users** (`/admin/users`) — Create new users via protected backend API `POST /admin/users` (creates both Firebase Auth account and Firestore user doc). Display-only for existing users — no edit/delete from UI.
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
| `PaymentButton` | Legacy / unused | Razorpay checkout component retained for the original payment flow |
| `SchoolRegistrationTable` | ✅ Functional | School info + dynamic student rows submitted to the isolated UPI API |

### Dead / Unused Code

These files exist in the codebase but are **not imported or used** by any active component:

| File | Issue |
|------|-------|
| `src/firebase/razorpay.js` | Legacy placeholder with `YOUR_PROJECT_ID` URL and an `axios` import. The active registration flow uses `upi-backend/`. |
| `src/firebase/storage.js` | Functional upload/download helpers, but no component uses file uploads yet. |
| `src/components/admin/EventForm.jsx` | Old skeleton — `handleSubmit` just calls `alert("Firebase Coming Soon")`. Actual event CRUD is in `ManageEvents.jsx`. |
| `src/components/committee/SerialVerification.jsx` | Skeleton with hardcoded mock data, references non-existent `ParticipantDetailsCard`. Actual verification is in `Verify.jsx`. |
| `src/pages/home.css` | Legacy homepage styles (brown `#7B5E57` theme). Not imported — current `Home.jsx` uses Tailwind. |
| `src/components/admin/AgeGroupForm.jsx` | Legacy skeleton form component |
| `src/components/admin/CategoryForm.jsx` | Legacy skeleton form component |
| `src/components/admin/LeaderboardTable.jsx` | Legacy skeleton component |
| `src/components/admin/ParticipantTable.jsx` | Legacy skeleton component |
| `src/components/admin/ScoringTemplateForm.jsx` | Legacy skeleton form component |
| `src/components/committee/ScoringForm.jsx` | Legacy skeleton component |

### Firebase Utilities

- **`firebaseConfig.js`** — Firebase app init using `REACT_APP_FIREBASE_*` env vars. Exports `auth`, `db`, `storage`.
- **`firestore.js`** — Two sets of CRUD helpers (newer: `subscribeToCollection`, `createCollectionDocument`, `updateCollectionDocument`, `deleteCollectionDocument` — used by admin pages; older: `createDocument`, `getDocument`, etc. — used elsewhere). Both functional.
- **`auth.js`** — `login()`, `logout()`, `subscribeToAuth()` (enriches Firebase user with Firestore role).

### Backend — Express Server (`server/server.js`)

Legacy Express 5 server on port 5000. It remains in the repository and is unchanged by the UPI implementation; its Razorpay endpoints are not used by the new registration UI:

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /create-order` | None | Creates Razorpay order, links to participant doc, generates receipt ID |
| `POST /verify-payment` | None | HMAC-SHA256 signature verification with `timingSafeEqual`, Firestore transaction for atomic update, generates serial number |
| `GET /registration-status` | None | Lookup by phone number |
| `GET /payment-receipt/:pid` | None | Verifies payment and returns receipt data |
| `GET /leaderboard` | None | Top 100 paid participants sorted by score |
| `POST /admin/users` | Firebase token + admin role | Creates Firebase Auth user + Firestore user doc |

**Middleware:** `requireFirebaseUser` (verifies Firebase ID tokens), `requireRole(role)` (checks Firestore user doc with role hierarchy support).

### Alternative UPI Backend (`upi-backend/`)

A separate Express 5 API on port 5001 supports individual and group registration, payment UTR submission, manual admin verification, transactional serial generation, signed QR check-in, and optional private screenshot storage. It uses the same Firestore project and Firebase Auth admin accounts as the existing application. See [upi-backend/README.md](./upi-backend/README.md) for environment variables, API routes, and setup.

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
├── server/
│   ├── server.js                   # Express + Razorpay + Firebase Admin backend
│   ├── package.json                # Server dependencies (express 5, firebase-admin 13.6, razorpay 2.9.6)
│   └── .env                        # Server environment variables
├── upi-backend/
│   ├── app.js                      # Isolated UPI and admin API routes
│   ├── server.js                   # Firebase Admin initialization and port 5001 listener
│   ├── domain.js                   # UTR, amount, and QR-token helpers
│   ├── .env.example                # UPI backend configuration template
│   └── README.md                   # UPI API, setup, and security notes
├── src/
│   ├── components/
│   │   ├── admin/                  # Admin form/table components (mostly legacy skeletons)
│   │   ├── committee/              # Committee components (SerialVerification is legacy)
│   │   ├── common/
│   │   │   ├── AdminRoute.jsx      # Admin auth guard
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Navbar.jsx          # Responsive nav with mobile menu
│   │   │   └── ProtectedRoute.jsx  # Committee auth guard
│   │   └── participant/
│   │       ├── PaymentButton.jsx   # Legacy Razorpay checkout component
│   │       ├── RegistrationForm.jsx    # Main registration form
│   │       └── SchoolRegistrationTable.jsx  # School bulk registration
│   ├── firebase/
│   │   ├── auth.js                 # Login, logout, auth state subscription
│   │   ├── firebaseConfig.js       # Firebase init (env-based config)
│   │   ├── upiApi.js               # UPI backend requests and participant access token
│   │   ├── firestore.js            # Generic Firestore CRUD helpers
│   │   ├── razorpay.js             # ⚠️ Unused placeholder
│   │   └── storage.js              # ⚠️ Functional but unused
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
│   │   │   └── ManageUsers.jsx     # Create only
│   │   ├── committee/
│   │   │   ├── CommitteeLogin.jsx
│   │   │   ├── ScoreEntry.jsx      # Serial lookup + 5-criteria scoring
│   │   │   └── Verify.jsx          # Search + mark verified
│   │   ├── Home.jsx                # Animated landing page (Tailwind)
│   │   ├── IndividualRegistration.jsx
│   │   ├── Leaderboard.jsx         # Podium + table + stats
│   │   ├── UpiPaymentPage.jsx      # UPI payment, participant status, and QR ticket
│   │   ├── RegistrationStatus.jsx
│   │   └── SchoolRegistration.jsx
│   ├── styles/
│   │   ├── form.css                # Legacy wrapper styles
│   │   └── schoolRegistration.css  # Legacy wrapper styles
│   └── App.js                      # Routing + global auth state
├── .env                            # Frontend env vars (Firebase config, UPI API URL)
├── .firebaserc                     # Firebase project: lenin-2e9d2
├── firebase.json                   # Firestore rules + Functions config
├── firestore.rules                 # Role-based security rules
├── package.json                    # Frontend dependencies
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- A Firebase project with Firestore and Authentication enabled
- Organization UPI ID and registration fee
- Firebase Storage bucket only if screenshot upload is enabled

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install legacy backend dependencies (optional)

```bash
cd server
npm install
```

### 3. Configure frontend environment

Create a `.env` file in the project root:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_UPI_API_BASE_URL=http://localhost:5001
```

### 4. Configure legacy backend environment

Create a `.env` file inside the `server/` folder:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Or place a `serviceAccountKey.json` file in the `server/` folder. The server is intentionally safe to import in local/test environments without these values, but live payment and admin routes require valid Firebase and Razorpay configuration.

### 5. Configure and run the UPI backend

The new registration flow uses the isolated backend. Configure `upi-backend/.env` from `upi-backend/.env.example`, including the Firebase service account, organization UPI ID, and real registration fee. Set `REACT_APP_UPI_API_BASE_URL=http://localhost:5001` in the project-root `.env`.

```powershell
Set-Location .\upi-backend
npm install
npm start
```

For screenshot uploads, also configure `FIREBASE_STORAGE_BUCKET`. Screenshots are optional and are treated as reference only. The backend cannot verify UTRs automatically; an admin must confirm them against actual bank transaction history.

### 6. Start the legacy backend (optional)

```bash
cd server
npm start
```

Backend runs at `http://localhost:5000`.

The original Razorpay backend can still be run separately if needed, but the updated registration flow does not call it.

### 7. Start the frontend

```bash
npm start
```

Frontend runs at `http://localhost:3000`.

---

## Known Limitations and Follow-up

| Item | Details |
|------|---------|
| Edit/Delete users from admin UI | `ManageUsers` can create users but not edit or delete existing ones |
| Edit scoring templates | `ManageTemplates` supports create and delete but no edit |
| Edit/delete participants from admin | `ManageParticipants` is read-only |
| Legacy browser storage helper | `src/firebase/storage.js` is not used; UPI screenshots use the backend Firebase Admin SDK |
| Dead code cleanup | Several legacy skeleton components and unused files should be removed |
| Verify.jsx scalability | Currently fetches entire `participants` collection for client-side search — needs server-side search at scale |
| School registration defaults | All school participants are hardcoded to `event: "district"`, `category: "group"` — no selection available |
| `razorpay.js` client helper | Placeholder file with wrong URL and missing `axios` dependency — should be removed (backend handles payments) |
| Bank verification integration | No bank/UPI provider API or statement import is configured; payments must be manually matched by an administrator |
| Distributed rate limiting | The new API's in-memory rate limiter is process-local; use shared storage before scaling to multiple instances |

Firestore collections are created lazily by the UPI backend; no relational migration is required. Deploy the updated Firestore rules/index and private screenshot Storage rules with `firebase deploy --only firestore:rules,firestore:indexes,storage`.

---

## License

Private project — Ekadhma Yoga Competition.
