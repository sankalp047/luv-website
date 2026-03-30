# LUV 107.1 FM — Website v2

## Run it in 3 commands:

```bash
cd luv-project
npm install
npm run dev
```

Open **http://localhost:5173** — done.

---

## What's included:

- **GSAP ScrollTrigger** — smooth scroll-based reveal animations throughout
- **Three.js particle background** — floating red particles in the hero that react to mouse movement
- **Hero video background** — ready for your video (see below)
- **Google Sign-In** via Firebase (see below)
- **Live stream player** — shared between hero "Listen Live" button AND floating bottom-right player
- **3D tilt** on presenter image areas
- **Mailgun contact form** integration point

---

## Add your hero background video:

1. Drop your video file as `hero-bg.mp4` into the `/public` folder
2. Open `src/App.jsx`, search for `VIDEO BG` and **uncomment** the `<video>` tag
3. The dark overlay ensures your text stays readable over ANY video

---

## Set up Firebase (Google Sign-In):

1. Go to https://console.firebase.google.com
2. Create a project → Enable Authentication → Enable Google provider
3. Copy your config values
4. Open `src/firebase.js` and replace the placeholder values

---

## Set up Mailgun (contact form):

1. Search `src/App.jsx` for `MAILGUN`
2. Replace the placeholder with your Mailgun API call
3. **IMPORTANT:** For production, move the API call to a backend/serverless function

---

## Build for production:
```bash
npm run build
```
Upload the `dist/` folder to Netlify, Vercel, or Firebase Hosting.
