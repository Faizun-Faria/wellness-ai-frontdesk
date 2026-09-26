# wellness-ai-frontdesk

AI Front Desk Agent for Wellness Studios. This is Phase 1: the public landing page for
**FrontDesk AI by Zyran**, built with FastAPI + Jinja + Tailwind (CDN) + vanilla JS and deployed on Vercel.

**Phase 1 makes no LLM or third-party API calls.** The hero's WhatsApp demo is a scripted,
client-side simulation, so the page costs nothing to run and holds no secrets.

## Structure

```
main.py                     FastAPI app: page, /api/register-demo placeholder, security headers
templates/index.html        The whole page (hero, practices strip, features, controls, ROI, how it works, CTA, modal)
static/js/simulated-chat.js WhatsApp-style demo engine + the three scenario scripts
static/js/app.js            Nav, registration modal, feature tabs, ROI calculator
static/css/site.css         Design tokens and component styles (Tailwind handles layout utilities)
vercel.json                 Python function for pages/API, static files straight from Vercel's CDN
```

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000.

## Configuration (environment variables)

| Variable           | Default        | Purpose                                                                |
| ------------------ | -------------- | ---------------------------------------------------------------------- |
| `BRAND_NAME`       | `FrontDesk AI` | Product name used across the page and demo                             |
| `COMPANY_NAME`     | `Zyran`        | Parent company, shown under the logo, in the footer and page metadata  |
| `DEMO_STUDIO_NAME` | `Haven Yoga`   | Fictional studio shown in the WhatsApp demo                            |
| `WALKTHROUGH_URL`  | *(empty)*      | Calendly/SavvyCal link. If empty, "Book a walkthrough" opens the modal |
| `SITE_URL`         | *(empty)*      | Public URL (e.g. `https://<project>.vercel.app`) for canonical/OG tags |

Set these in Vercel under Project → Settings → Environment Variables.

## Deploy to Vercel

The project is imported from GitHub at vercel.com/new (framework preset: **Other**; `vercel.json`
handles the build). Every push to `main` redeploys production automatically, and other branches get
preview URLs. The site is served on its free `*.vercel.app` address; a custom domain can be added later
under Project → Settings → Domains.

`/static/*` is served by Vercel's CDN with long-lived caching. Asset URLs carry a content hash
(`?v=...`, computed in `main.py`), so each deploy busts browser caches automatically.

## Editing the demo conversations

All scenarios live in the `SCENARIOS` array at the top of `static/js/simulated-chat.js`. Each is a
list of steps (`customer`, `agent`, `check`, `log`, `react`, `advance`, `resolve`); the step types are
documented at the top of the file. The scenario tab labels are in `templates/index.html`.

## Phase 2 hook

The modal posts JSON to `POST /api/register-demo`:

```json
{ "name": "Jordan Lee", "studio_name": "Lotus Room Yoga", "email": "jordan@example.com", "intent": "demo" }
```

`intent` is `"demo"` or `"walkthrough"`. The endpoint validates the payload, drops bot submissions
(honeypot field `website`), logs a masked email and returns `{ "ok": true, "message": "..." }`.
**Nothing is stored yet.** Phase 2 should persist the lead and provision the 1-hour playground
inside `register_demo()` in `main.py`. Keep the LLM key server-side (a Vercel env var) and consider
rate limiting that endpoint before it can trigger paid calls.

## Notes before launch

- Tailwind is loaded from the CDN browser build, as requested. It works, but Tailwind recommends a
  compiled stylesheet for production (smaller download, no flash of unstyled content). Switching is a
  build step with the Tailwind CLI; the markup doesn't change.
- The Content-Security-Policy in `main.py` only allows this site, jsDelivr and Google Fonts. Add
  hosts there if you add analytics or a scheduler embed.
- The footer's Terms / Privacy / Security links are placeholders. You're collecting emails, so publish
  a privacy policy before going live.
