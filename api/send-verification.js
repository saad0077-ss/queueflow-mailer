const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawKey) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable in Vercel settings.");
  }

  let serviceAccount = null;

  // Extract first valid JSON block if multiple exist
  const jsonBlocks = rawKey.match(/\{[\s\S]*?\n\}/g) || [rawKey];
  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block);
      if (parsed.project_id && parsed.private_key) {
        serviceAccount = parsed;
        break;
      }
    } catch (_) {}
  }

  if (!serviceAccount) {
    try {
      serviceAccount = JSON.parse(rawKey);
    } catch (_) {
      try {
        const decoded = Buffer.from(rawKey, "base64").toString("utf8");
        serviceAccount = JSON.parse(decoded);
      } catch (_) {}
    }
  }

  if (!serviceAccount || !serviceAccount.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON. Please ensure it contains a single valid service account object.");
  }

  // Handle escaped newlines in private key if present
  if (serviceAccount.private_key && serviceAccount.private_key.includes("\\n")) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

function loadTemplate() {
  const candidates = [
    path.join(process.cwd(), "templates", "verify-email.html"),
    path.join(process.cwd(), "templates", "verify_email.html"),
    path.join(__dirname, "..", "templates", "verify-email.html"),
    path.join(__dirname, "..", "templates", "verify_email.html"),
    path.join(__dirname, "templates", "verify-email.html"),
    path.join(__dirname, "templates", "verify_email.html"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, "utf8");
    }
  }
  return "";
}

const escapeHtml = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renderTemplate({ name, email, link }) {
  const template = loadTemplate();
  if (!template) {
    return `<div style="font-family:sans-serif;padding:20px;"><h2>Verify your QueueFlow email</h2><p>Hi ${escapeHtml(name)},</p><p><a href="${escapeHtml(link)}">Click here to verify your account</a></p></div>`;
  }
  return template
    .replaceAll("{{NAME}}", escapeHtml(name))
    .replaceAll("{{EMAIL}}", escapeHtml(email))
    .replaceAll("{{LINK}}", escapeHtml(link));
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Health check
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "QueueFlow Patient Email Verification Service",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header." });
    }

    const firebaseAdmin = getFirebaseAdmin();
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const user = await firebaseAdmin.auth().getUser(decodedToken.uid);

    if (!user.email) {
      return res.status(400).json({ error: "User has no email." });
    }

    if (user.emailVerified) {
      return res.status(200).json({ status: "already-verified" });
    }

    // Rate limiting: 60 seconds
    const db = firebaseAdmin.firestore();
    const ref = db.collection("email_send_log").doc(user.uid);
    const snap = await ref.get();
    const last = snap.exists ? snap.get("lastSentAt")?.toMillis() : 0;
    if (last && Date.now() - last < 60000) {
      const wait = Math.ceil((60000 - (Date.now() - last)) / 1000);
      return res.status(429).json({ error: `Please wait ${wait}s before requesting another email.` });
    }

    // Generate real verification link
    const actionSettings = {
      url: "https://queueflow-db2e1.firebaseapp.com/email-verified",
      handleCodeInApp: false,
    };
    const link = await firebaseAdmin.auth().generateEmailVerificationLink(user.email, actionSettings);

    const name = user.displayName?.trim() || "there";
    const html = renderTemplate({ name, email: user.email, link });

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable in Vercel settings.");
    }

    const from = process.env.EMAIL_FROM || "QueueFlow <hello@queueflow.com>";
    const replyTo = "support@queueflow.com";
    const subject = "Verify your email for QueueFlow";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        reply_to: replyTo,
        subject,
        html,
        text: `Hi ${name},\n\nConfirm your email for QueueFlow by opening this link:\n${link}\n\nIf you didn't create a QueueFlow account, you can ignore this email.\n\n— QueueFlow`,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API response:", resendRes.status, errText);
      return res.status(500).json({ error: `Resend error (${resendRes.status}): ${errText}` });
    }

    await ref.set({ lastSentAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
