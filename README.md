# 📬 QueueFlow Mailer — Serverless Email Microservice

[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js_18+-green?style=flat&logo=node.js)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Auth-Firebase_Admin_SDK-orange?style=flat&logo=firebase)](https://firebase.google.com)
[![Resend](https://img.shields.io/badge/Delivery-Resend_API-blue?style=flat)](https://resend.com)
[![Cost](https://img.shields.io/badge/Hosting_Cost-$0_Free_Tier-brightgreen?style=flat)](#)

A high-performance, zero-cost serverless email microservice designed for **QueueFlow** applications. It decouples transactional email dispatching from frontend client apps while completely bypassing paid cloud function tiers.

### ✨ Key Features
- **Patient Verification:** Cryptographically validates Firebase ID tokens (JWT) and generates official Firebase Auth verification links with built-in 60s rate-limiting.
- **Clinic Admin Onboarding (E1):** Dispatches branded activation invites with pre-configured development (`localhost:5000`) and production URLs.
- **100% Free Architecture:** Operates entirely within the free tiers of Vercel Serverless, Firebase Spark, and Resend ($0 / No credit card required).
- **Client Agnostic:** Serves Flutter mobile apps, Flutter web portals, and external services via clean HTTP/REST endpoints.

---

## ⚡ Live Service Endpoints

* **Base URL:** `https://queueflow-mailer.vercel.app`
* **Health Check & Monitor:** `GET /`
* **Patient Verification:** `POST /api/send-verification` (Gated by Firebase Bearer ID Token)
* **Clinic Admin Invite:** `POST /api/send-clinic-invite` (Accepts clinic & admin metadata)

---

## 📁 Repository Structure

```
├── api/
│   ├── send-verification.js      # Patient email verification handler
│   └── send-clinic-invite.js     # Clinic admin onboarding invite handler
├── templates/
│   ├── verify-email.html         # Patient email HTML template
│   └── clinic-invite.html        # Clinic admin onboarding invitation template
├── public/
│   └── index.html                # Public service monitor page ("● Service Online")
├── .env.example                  # Environment variables template
├── .gitignore                    # Ignores node_modules and local secrets
├── package.json                  # Minimal dependencies (firebase-admin)
└── vercel.json                   # Asset inclusion configuration for serverless functions
```

---

## 🚀 Environment Variables (Vercel)

Set these in your **Vercel Project Dashboard → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (`re_...`) from [resend.com/api-keys](https://resend.com/api-keys) |
| `FIREBASE_SERVICE_ACCOUNT` | Entire JSON content of your downloaded Firebase Admin SDK private key |
| `EMAIL_FROM` | `QueueFlow <onboarding@resend.dev>` or your verified custom domain |

---

## 🛠️ Local Development & Deployment

### Run Locally
```bash
npm install
npm install -g vercel   # If not already installed
vercel dev
```

### Deploy to Production
```bash
vercel --prod
```
