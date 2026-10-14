const fs = require("fs");
const path = require("path");

function loadTemplate() {
  const candidates = [
    path.join(process.cwd(), "templates", "clinic-invite.html"),
    path.join(process.cwd(), "templates", "clinic_invite.html"),
    path.join(__dirname, "..", "templates", "clinic-invite.html"),
    path.join(__dirname, "..", "templates", "clinic_invite.html"),
    path.join(__dirname, "templates", "clinic-invite.html"),
    path.join(__dirname, "templates", "clinic_invite.html"),
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

function renderTemplate({ clinicName, adminName, inviterName, inviteUrl }) {
  const template = loadTemplate();
  if (!template) {
    return `<div style="font-family:sans-serif;padding:24px;"><h2>You've been invited to QueueFlow</h2><p>${escapeHtml(inviterName)} invited you to be Clinic Admin for <b>${escapeHtml(clinicName)}</b>.</p><p><a href="${escapeHtml(inviteUrl)}">Activate Your Account</a></p></div>`;
  }
  return template
    .replaceAll("{{CLINIC_NAME}}", escapeHtml(clinicName))
    .replaceAll("{{ADMIN_NAME}}", escapeHtml(adminName || "there"))
    .replaceAll("{{INVITER_NAME}}", escapeHtml(inviterName || "Alex Chen"))
    .replaceAll("{{INVITE_URL}}", escapeHtml(inviteUrl));
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
      service: "QueueFlow Clinic Admin Invite Service",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { clinicName, adminName, adminEmail, inviterName, inviteUrl } = req.body || {};

    if (!clinicName || !adminEmail || !inviteUrl) {
      return res.status(400).json({
        error: "Missing required fields. Provide clinicName, adminEmail, and inviteUrl.",
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(500).json({
        error: "Server configuration error: RESEND_API_KEY is not configured.",
      });
    }

    const from = process.env.EMAIL_FROM || "QueueFlow <hello@queueflow.com>";
    const replyTo = "support@queueflow.com";
    const subject = `You're invited to manage ${clinicName} on QueueFlow`;
    const cleanInviter = inviterName || "Alex Chen";

    const html = renderTemplate({
      clinicName,
      adminName,
      inviterName: cleanInviter,
      inviteUrl,
    });

    const text =
      `You've been invited to QueueFlow\n\n` +
      `${cleanInviter} has added ${clinicName} to QueueFlow and invited you to be its Clinic Admin.\n\n` +
      `Activate your account to start managing appointments, live queues, staff, and more by clicking this link:\n` +
      `${inviteUrl}\n\n` +
      `This link expires in 7 days.\n\n` +
      `— QueueFlow Support (support@queueflow.com)`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [adminEmail.trim()],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return res.status(500).json({
        error: `Failed to deliver email through Resend (${resendRes.status}): ${errText}`,
      });
    }

    const resData = await resendRes.json();
    return res.status(200).json({
      status: "sent",
      emailId: resData.id,
      to: adminEmail,
      clinic: clinicName,
    });
  } catch (err) {
    console.error("send-clinic-invite handler error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error while sending clinic invite.",
    });
  }
};
