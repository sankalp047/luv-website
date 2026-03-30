const { onRequest } = require("firebase-functions/v2/https");
const formData = require("form-data");
const Mailgun = require("mailgun.js");

const MAILGUN_DOMAIN = "luv1071.com";
const TO_EMAIL = "sales@luv1071.com";

exports.sendContactEmail = onRequest(
  {
    region: "asia-south1",
    secrets: ["MAILGUN_API_KEY"],
  },
  (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { name, email, company, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ error: "Name, email, and message are required" });
      return;
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    });

    mg.messages.create(MAILGUN_DOMAIN, {
      from: `LUV 107.1 FM Website <noreply@${MAILGUN_DOMAIN}>`,
      to: TO_EMAIL,
      subject: `Advertising Inquiry from ${name}${company ? ` (${company})` : ""}`,
      "h:Reply-To": email,
      text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "N/A"}\n\nMessage:\n${message}`,
      html: `<h2>New Advertising Inquiry</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Company:</strong> ${company || "N/A"}</p><hr/><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br/>")}</p><hr/><p style="color:#888;font-size:12px;">Sent from luv1071.com contact form</p>`,
    })
    .then(() => {
      res.json({ success: true });
    })
    .catch((error) => {
      console.error("Mailgun error:", error);
      res.status(500).json({ error: "Failed to send email" });
    });
  }
);