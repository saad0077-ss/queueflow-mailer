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
