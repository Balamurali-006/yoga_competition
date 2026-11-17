# Removed items and recovery

The following legacy items were removed because the frontend now uses the UPI API:

- `server/` — the retired Razorpay backend and its tracked dependencies (5,716 tracked files total).
- `src/components/participant/PaymentButton.jsx`, `src/pages/PaymentPage.jsx`, and `src/pages/PaymentSuccess.jsx` — unused Razorpay checkout flow.
- `src/pages/RegistrationStatus.jsx` and the `/status` route — phone-based lookup depended on the retired API; participant status remains available through the token-protected UPI payment link.
- The Razorpay checkout script in `public/index.html`.
- `src/components/committee/ParticipantDetailsCard.jsx` and `src/pages/committee/CommitteeLogin.jsx` — unreferenced components; committee login is handled by `Verify.jsx`.
- `src/firebase/storage.js`, the unused browser Storage initialization, and `src/logo.svg` — no active code referenced these helpers/assets; screenshots use backend Firebase Admin SDK.
- The unused Firebase Functions configuration in `firebase.json` (there is no Functions source directory; the API is deployed to Render).

The ignored, untracked `server/.env` was copied to a private backup outside the repository. Git does not contain this file.

The tracked source before these removals is commit `5e48df161268ce9b61080c5e6a69617259541a73`. To restore the deleted code and old runtime configuration without reverting the deployment documentation, run:

```powershell
git restore --source=5e48df161268ce9b61080c5e6a69617259541a73 --staged --worktree -- server/ src/components/participant/PaymentButton.jsx src/pages/PaymentPage.jsx src/pages/PaymentSuccess.jsx src/pages/RegistrationStatus.jsx src/components/committee/ParticipantDetailsCard.jsx src/pages/committee/CommitteeLogin.jsx src/firebase/storage.js src/logo.svg src/App.js src/firebase/firebaseConfig.js public/index.html firebase.json
```

The private `.env` backup must be restored separately; it is not part of the Git restore command.
