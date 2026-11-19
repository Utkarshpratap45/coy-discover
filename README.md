# Coy Discover

A mobile-first, standalone swipe-discovery demo built with React, Vite, and Express. It assumes one logged-in user and persists swipe decisions in a local JSON file.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The Express API runs on port 3001. To build and serve the production app:

```bash
npm run build
NODE_ENV=production npm start
```

The app starts with 32 mock profiles. A swipe is written to `server/state.json`, so it survives reloads and server restarts. To reset the demo, stop the server and remove that generated file. Likes and passes are not reversible in the UI.

## API

- `GET /feed` returns only profiles not yet swiped on.
- `POST /swipe` accepts `{ "profileId": "p01", "action": "like" }` (or `"pass"`), persists the decision, and reports a match only when the like is mutual.
- `GET /matches` returns mutual matches only.

Profiles that have liked the demo user are deliberately omitted from feed and swipe responses. Their incoming-like state is used only by the server to determine a mutual match. This demo uses a single-user local JSON store, not production-grade multi-user persistence.

## Assignment: two core feature suggestions

These are suggestions based on the assignment's described Coy flows and privacy promise; OTP-gated screens could not be explored without an account and phone access.

1. **Private mutual-crush reveal.** Let people privately name a crush and reveal the connection only when interest is mutual. This makes the product's central promise clear, reduces the social risk of expressing interest, and gives users a concrete reason to invite the people they already have in mind.
2. **Invite and verification status.** Give users a simple, privacy-conscious view of invite progress and verified status, with clear controls to resend or revoke an invite. Invites and email verification are important trust/onboarding steps; making their status understandable helps users know what to do next without exposing another person's private activity.

## Publish to GitHub

The project can be published by committing and pushing changes to the `main` branch:

```bash
git add .
git commit -m "Build Coy Discover demo"
git push -u origin main
```

Profile photos are served from Unsplash and require an internet connection.
