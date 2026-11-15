require("dotenv").config();

const admin = require("firebase-admin");
const path = require("path");
const { createApp } = require("./app");

const initializeFirebase = () => {
  if (admin.apps.length) return;

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
  });
};

try {
  initializeFirebase();
} catch (error) {
  console.error("Firebase Admin configuration is required. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json.");
  console.error(error.message);
  process.exit(1);
}

const db = admin.firestore();
const storage = process.env.FIREBASE_STORAGE_BUCKET ? admin.storage().bucket() : null;
const app = createApp({ db, admin, storage });
const port = Number(process.env.PORT) || 5001;

app.listen(port, () => {
  console.log(`UPI registration API listening on port ${port}`);
});
