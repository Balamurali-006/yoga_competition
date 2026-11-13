# Ekadhma — International Yoga Competition Portal

A full-stack web application for managing an international Yoga competition. Covers public registration (individual & school/group), Razorpay payment processing, committee-based participant verification and scoring, a live leaderboard, and a complete admin back-office — all backed by Firebase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v6, Create React App |
| Styling | Tailwind CSS (utility classes), legacy custom CSS for some wrappers |
| Backend | Node.js + Express 5 |
| Database | Cloud Firestore |
| Authentication | Firebase Auth (email/password) with role-based access via Firestore |
| Payments | Razorpay (client checkout + server-side HMAC signature verification) |
| File Storage | Firebase Storage (helpers ready, not yet used) |
| Notifications | react-toastify |
| Icons | react-icons |
| Firebase Project | `lenin-2e9d2` |

---

## What's Already Built

### Public Area (fully functional)

- **Home page** — Modern landing page with parallax hero image, animated background blobs, intersection-observer scroll animations, "2025 Edition" badge, stats counters (5000+ Participants, 150+ Events, 3 Levels), "Why Participate?" feature cards, and CTA buttons. All Tailwind CSS.
- **Individual Registration** (`/register`) — Renders the `RegistrationForm` component. 10-field form: Full Name, Email, Date of Birth, Age (auto-calculated), Institution Name, Instructor Name, Instructor Phone (10-digit validation), Event Type, Level (district/state/south-india/national), Category (forward/backward/twist/balance/standing). Saves to Firestore `participants` collection with `paymentStatus: "pending"`, then navigates to payment.
- **School / Group Registration** (`/school-registration`) — Collects school-level info (Institution, Instructor, Phone, Email) plus a dynamic table of student rows (Name, Age, Gender, Class). Uses Firestore `writeBatch` for atomic multi-participant creation. Shows per-participant `PaymentButton` after save. Responsive desktop table + mobile card views.
- **Payment Page** (`/pay/:pid`) — Gets participant ID from URL params and fee from `REACT_APP_REGISTRATION_FEE` env var (defaults to ₹2). Renders `PaymentButton` which creates a Razorpay order via the backend, opens the Razorpay checkout modal, verifies payment server-side (HMAC-SHA256 with `timingSafeEqual`), generates a serial number (`YYYY-LevelCode-ID`), and updates Firestore atomically via transaction.
- **Payment Success** (`/payment-success/:pid`) — Calls backend `GET /payment-receipt/:pid` to verify and display receipt with participant name and serial number.
- **Registration Status** (`/status`) — Lookup by mobile number (10-digit validation). Calls backend `GET /registration-status?phone=...` and displays matches with name, serial number, and payment status.
- **Leaderboard** (`/leaderboard`) — Fetches from backend `GET /leaderboard` (top 100 paid participants by score). Top-3 podium display (gold/silver/bronze with SVG stars), desktop table view, mobile card view. Stats footer with total participants, top score, and average score. Polished UI.

### Committee Area (fully functional, role-protected)

Routes are guarded by `ProtectedRoute` — allows `"committee"` or `"admin"` roles.

- **Committee Login** (`/committee/login`) — Firebase Auth login with role check. Committee users → `/committee/verify`, admin users → `/admin/dashboard`.
- **Participant Verification** (`/committee/verify`) — Free-text search across all participants (name, email, phone, serial, institution). Shows full participant details. "Mark Verified" button updates Firestore with `verificationStatus: "verified"` and `verifiedAt` timestamp.
- **Score Entry** (`/committee/score`) — Two-step flow: (1) find participant by serial number (must have `paymentStatus: "success"`), (2) enter 5 scores (0–10, step 0.5). Calculates total and updates the `participants` doc directly in Firestore.

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
| `LoadingSpinner` | ⚠️ Partial | Renders spinner div but `@keyframes spin` is commented out — won't animate unless added to CSS |
| `RegistrationForm` | ✅ Functional | Full 10-field form with validation, auto-age-calc, Firestore save, dev-mode test data helpers |
| `PaymentButton` | ✅ Functional | Razorpay checkout flow: create order → open modal → verify → navigate to success |
| `SchoolRegistrationTable` | ✅ Functional | School info + dynamic student rows, batch Firestore writes, responsive table/card views |

### Dead / Unused Code

These files exist in the codebase but are **not imported or used** by any active component:

| File | Issue |
|------|-------|
| `src/firebase/razorpay.js` | Placeholder with `YOUR_PROJECT_ID` URL, imports `axios` (not in dependencies). Payment flow uses `server/server.js` instead. |
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

Production-quality Express 5 server on port 5000:

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /create-order` | None | Creates Razorpay order, links to participant doc, generates receipt ID |
| `POST /verify-payment` | None | HMAC-SHA256 signature verification with `timingSafeEqual`, Firestore transaction for atomic update, generates serial number |
| `GET /registration-status` | None | Lookup by phone number |
| `GET /payment-receipt/:pid` | None | Verifies payment and returns receipt data |
| `GET /leaderboard` | None | Top 100 paid participants sorted by score |
| `POST /admin/users` | Firebase token + admin role | Creates Firebase Auth user + Firestore user doc |

**Middleware:** `requireFirebaseUser` (verifies Firebase ID tokens), `requireRole(role)` (checks Firestore user doc with role hierarchy support).

### Firestore Security Rules

Well-structured rules with helper functions (`signedIn()`, `userRole()`, `isAdmin()`, `isStaff()`):

| Collection | Read | Write |
|------------|------|-------|
| `participants` | Staff only | Anyone can CREATE (with restrictions); admin full update; committee can update scoring/verification fields only; admin can delete |
| `users` | Own doc or admin | Server-side only (Admin SDK) |
| `events`, `categories`, `ageGroups`, `scoringTemplates` | Admin only | Admin only |

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `participants` | All participant registrations (individual + school) |
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
│   │       ├── PaymentButton.jsx   # Razorpay checkout component
│   │       ├── RegistrationForm.jsx    # Main registration form
│   │       └── SchoolRegistrationTable.jsx  # School bulk registration
│   ├── firebase/
│   │   ├── auth.js                 # Login, logout, auth state subscription
│   │   ├── firebaseConfig.js       # Firebase init (env-based config)
│   │   ├── firestore.js            # Generic Firestore CRUD helpers
│   │   ├── razorpay.js             # ⚠️ Unused placeholder
│   │   └── storage.js              # ⚠️ Functional but unused
│   ├── pages/
│   │   ├── admin/
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
│   │   ├── PaymentPage.jsx
│   │   ├── PaymentSuccess.jsx
│   │   ├── RegistrationStatus.jsx
│   │   └── SchoolRegistration.jsx
│   ├── styles/
│   │   ├── form.css                # Legacy wrapper styles
│   │   └── schoolRegistration.css  # Legacy wrapper styles
│   └── App.js                      # Routing + global auth state
├── .env                            # Frontend env vars (Firebase config, fee)
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
- A Firebase project with Firestore, Auth, and Storage enabled
- Razorpay API keys

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

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
REACT_APP_REGISTRATION_FEE=500
```

### 4. Configure backend environment

Create a `.env` file inside the `server/` folder:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Or place a `serviceAccountKey.json` file in the `server/` folder.

### 5. Start the backend

```bash
cd server
npm start
```

Backend runs at `http://localhost:5000`.

### 6. Start the frontend

```bash
npm start
```

Frontend runs at `http://localhost:3000`.

---

## What's Still Remaining

| Item | Details |
|------|---------|
| `LoadingSpinner` animation | `@keyframes spin` is commented out — spinner doesn't animate |
| Edit/Delete users from admin UI | `ManageUsers` can create users but not edit or delete existing ones |
| Edit scoring templates | `ManageTemplates` supports create and delete but no edit |
| Edit/delete participants from admin | `ManageParticipants` is read-only |
| Firebase Storage integration | Helper functions exist (`storage.js`) but no component uses file uploads |
| Dead code cleanup | Several legacy skeleton components and unused files should be removed |
| Verify.jsx scalability | Currently fetches entire `participants` collection for client-side search — needs server-side search at scale |
| School registration defaults | All school participants are hardcoded to `event: "district"`, `category: "group"` — no selection available |
| `razorpay.js` client helper | Placeholder file with wrong URL and missing `axios` dependency — should be removed (backend handles payments) |

---

## License

Private project — Ekadhma Yoga Competition.
