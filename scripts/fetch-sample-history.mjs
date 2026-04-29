import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../remotion/data/sample-history.json");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing Firebase Admin env vars. Run with: node --env-file=.env.local scripts/fetch-sample-history.mjs"
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

const preferredSlug = process.argv[2];
let snap;
if (preferredSlug) {
  const doc = await db.collection("histories").doc(preferredSlug).get();
  if (!doc.exists) {
    console.error(`No history found at histories/${preferredSlug}`);
    process.exit(2);
  }
  snap = doc;
} else {
  const query = await db.collection("histories").limit(5).get();
  if (query.empty) {
    console.error("histories collection is empty");
    process.exit(3);
  }
  const docs = query.docs;
  console.error(`Found ${docs.length} histories. Available:`);
  for (const d of docs) {
    const data = d.data();
    console.error(`  ${d.id}  →  ${data.headline}`);
  }
  snap = docs[0];
}

const data = snap.data();
const out = {
  id: snap.id,
  headline: data.headline,
  source: data.source ?? null,
  topic: data.topic,
  summary: data.summary,
  timeline: data.timeline ?? [],
  patterns: data.patterns ?? [],
  furtherReading: data.furtherReading ?? [],
  whyItMattersNow: data.whyItMattersNow,
};

await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
console.error(`\nWrote ${OUT_PATH}`);
console.error(`Used: ${out.headline}`);
