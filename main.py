"""
Phase 1 landing page for the AI front-desk receptionist.

Serves a single Jinja template plus static assets. There are deliberately no LLM
or third-party API calls here: the hero chat is a client-side simulation
(static/js/simulated-chat.js), so the page costs nothing to run and exposes no keys.

Local dev:   uvicorn main:app --reload
Deploy:      vercel --prod   (see vercel.json)
"""

from __future__ import annotations

import hashlib
import logging
import os
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, EmailStr, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("landing")


def _asset_version() -> str:
    """Content hash of /static so every deploy busts browser caches automatically."""
    digest = hashlib.sha1()
    try:
        for path in sorted(STATIC_DIR.rglob("*")):
            if path.is_file():
                digest.update(path.relative_to(STATIC_DIR).as_posix().encode())
                digest.update(path.read_bytes())
    except OSError:
        return "1"
    return digest.hexdigest()[:10]


# Everything brand-specific lives here so copy changes don't require touching the template.
SITE = {
    "brand": os.getenv("BRAND_NAME", "Quietdesk"),
    "demo_studio": os.getenv("DEMO_STUDIO_NAME", "Haven Yoga"),
    # Set to a Calendly/SavvyCal link to send "Book a walkthrough" there instead of the modal.
    "walkthrough_url": os.getenv("WALKTHROUGH_URL", ""),
    # Your production URL (e.g. https://yourdomain.com), used for canonical/OG tags.
    "url": os.getenv("SITE_URL", "").rstrip("/"),
    "asset_version": _asset_version(),
    "year": date.today().year,
}

# The page only loads its own assets, Tailwind from jsDelivr, and Google Fonts.
# Tailwind's browser build injects <style> tags at runtime, hence 'unsafe-inline' for styles.
CONTENT_SECURITY_POLICY = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ]
)

app = FastAPI(
    title=f"{SITE['brand']} landing",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
# On Vercel, /static is served straight from the CDN (see vercel.json); this mount covers local dev.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if response.headers.get("content-type", "").startswith("text/html"):
        response.headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    return response


@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html", {"site": SITE})


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots() -> str:
    lines = ["User-agent: *", "Allow: /", "Disallow: /api/"]
    return "\n".join(lines) + "\n"


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


class DemoRegistration(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    studio_name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    intent: Literal["demo", "walkthrough"] = "demo"
    # Honeypot: hidden from humans, so any value here means a bot filled the form.
    website: str = Field(default="", max_length=200)


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


@app.post("/api/register-demo")
async def register_demo(payload: DemoRegistration) -> dict:
    """
    Phase 1 placeholder. Validates and acknowledges the sign-up without storing it.

    Phase 2: provision the 1-hour LLM playground session here (and persist the lead,
    e.g. to your CRM or a database) before returning the access details.
    """
    if payload.intent == "walkthrough":
        message = "Thanks! We'll email you shortly to pick a time for your walkthrough."
    else:
        message = "You're on the list. Your private 1-hour demo link is on its way to your inbox."

    if payload.website:
        logger.info("register-demo: honeypot filled, ignoring submission")
        return {"ok": True, "intent": payload.intent, "message": message}

    logger.info(
        "register-demo: intent=%s studio=%r email=%s",
        payload.intent,
        payload.studio_name,
        _mask_email(payload.email),
    )
    return {"ok": True, "intent": payload.intent, "message": message}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
