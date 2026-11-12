# Orion — Personal AI Assistant

Orion is a responsive, voice-first assistant interface built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and the Vercel AI SDK. Conversations and contacts are stored in the browser on the current device. WhatsApp and email actions open a prefilled app/draft after explicit confirmation; Calendar opens Google Calendar for review. Orion does not silently send messages or schedule events.

## Features

- Streaming Gemini chat through the AI SDK.
- Browser speech recognition and speech synthesis when supported by the device/browser.
- Contact manager and local conversation history.
- Confirm-before-opening flow for email drafts, WhatsApp, and Calendar.
- Responsive PWA manifest and mobile-friendly layout.
- No paid runtime service required. Gemini API usage is governed by Google AI Studio's current free-tier quotas and terms; it is not guaranteed to remain free.

## Requirements

- Node.js 20.9 or newer.
- A Google AI Studio API key for Gemini chat. Browser-only features work without a key.

## Run locally

1. Clone the repository and install its dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio: https://aistudio.google.com/app/apikey
3. Start the development server with `npm run dev`.
4. Open http://localhost:3000.

Without a Gemini API key, chat returns a configuration error. The assistant does not need microphone permission unless you choose voice input; browser support varies.

## Contact and browser storage

Contacts and recent conversation history are stored in localStorage in the browser profile. They are not synchronized across devices and will be lost if that browser's site data is cleared. Do not save sensitive information in contacts on a shared device. Remove contacts from the Contacts dialog.

## External actions and integrations

The current app deliberately uses native zero-cost handoff links for email, WhatsApp, and Calendar. A user must confirm the handoff before it opens. An email handoff creates a draft in the user's configured mail application; WhatsApp uses the saved phone number and opens `wa.me`; Calendar opens the Google Calendar event editor. These handoffs do not provide inbox reading, automatic sending, incoming WhatsApp webhooks, or direct calendar synchronization. The Google OAuth variables in `.env.example` are reserved for a future OAuth-backed integration and are not consumed by this implementation. Do not add OAuth secrets to client code.

## GitHub and Vercel

Push the project to a GitHub repository, then import that repository in Vercel. Set `GOOGLE_GENERATIVE_AI_API_KEY` in the Vercel project's Environment Variables for the environments you use and redeploy. The Next.js App Router is detected automatically. Keep all keys server-side; do not use a `NEXT_PUBLIC_` prefix.

## Free-tier and privacy notes

Google may change free-tier availability, quotas, and terms. Voice quality and voice choices depend on the operating system and browser. Contact and chat data stays in that browser's local storage; messages sent to Gemini are processed by Google's API under its applicable terms. This project makes no claim that external providers offer permanent free service.
