/*!
 * simulated-chat.js
 *
 * Client-side simulation of the AI front desk inside a WhatsApp Business-style frame.
 * Every message is scripted below: no network calls, no API keys, no LLM cost.
 *
 * Step types (see SCENARIOS):
 *   { log: "info", title, detail }            activity entry, shown instantly
 *   { check: "done" | "warn", title, detail } activity entry with a spinner that resolves
 *   { customer: "text" }                      customer types, then sends
 *   { customer: "label", tap: n }             customer taps quick-reply button n of the last AI message
 *   { agent: "text", buttons?, link? }        AI types, then replies
 *   { react: "emoji" }                        AI reacts to the customer's last message
 *   { advance: minutes }                      move the simulated clock forward
 *   { resolve: "text" }                       mark the conversation resolved
 *
 * Text supports *bold* and \n, plus {brand} / {studio} placeholders.
 */
(() => {
  "use strict";

  const root = document.querySelector("[data-chat-demo]");
  if (!root) return;

  const BRAND = root.dataset.brand || "Quietdesk";
  const STUDIO = root.dataset.studio || "Haven Yoga";
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTO_ADVANCE_DELAY = 6500;

  const SCENARIOS = [
    {
      id: "late-cancellation",
      day: "Fri",
      start: 21 * 60 + 18,
      contact: {
        name: "Priya S.",
        initials: "PS",
        color: "#c8643b",
        tag: "Member · 10-class pack",
        chips: ["4 credits left", "Member since 2024"],
      },
      steps: [
        { log: "info", title: "Studio closed", detail: "Front desk offline since 8:30 PM" },
        { customer: "Hi! I'm booked into Sunrise Vinyasa tomorrow at 7am but something came up at work 😩 Can I cancel?" },
        { check: "done", title: "Booking found", detail: "Sunrise Vinyasa · Sat 7:00 AM" },
        { check: "warn", title: "Inside 12-hour window", detail: "9h 42m until class → late cancel" },
        { check: "done", title: "Studio rule applied", detail: "Swaps allowed · credit protected" },
        {
          agent:
            "Hi Priya! 👋 Your class starts in *9h 42m*, which is inside our 12-hour cancellation window, so cancelling now would use your class credit.\n\nThe good news: you can *swap into another class* instead and keep your credit. Want me to find one?",
        },
        { advance: 1 },
        { customer: "Yes please! Anything tomorrow evening?" },
        { check: "done", title: "Live availability", detail: "2 evening classes with open spots" },
        {
          agent: "Here's what's open tomorrow evening:\n\n🧘 *Slow Flow* · 6:00 PM · 4 spots\n🌙 *Yin & Restore* · 7:30 PM · 2 spots",
          buttons: ["Slow Flow · 6:00 PM", "Yin & Restore · 7:30 PM"],
        },
        { customer: "Yin & Restore · 7:30 PM", tap: 1 },
        { check: "done", title: "Booking moved", detail: "Yin & Restore · Sat 7:30 PM" },
        { check: "done", title: "Waitlist notified", detail: "7:00 AM spot released" },
        {
          agent:
            "All set ✨ You're booked into *Yin & Restore* tomorrow at *7:30 PM* with Maya.\n\nYour 7am spot has gone to the next person on the waitlist, and your credit is untouched. See you on the mat!",
        },
        { advance: 1 },
        { customer: "Amazing, thank you!! 🙏" },
        { react: "❤️" },
        { resolve: "Rescheduled in 2 min · no staff needed" },
      ],
    },
    {
      id: "class-booking",
      day: "Mon",
      start: 12 * 60 + 6,
      contact: {
        name: "+1 (415) 555-0142",
        initials: "MT",
        color: "#3f6f8f",
        drawerName: "Marcus T.",
        tag: "New lead · first message",
        chips: ["Source: Instagram", "No account yet"],
      },
      steps: [
        { log: "info", title: "You're teaching", detail: "Power Flow · until 1:00 PM" },
        { customer: "Hey! Do you have any beginner classes this week? Never done yoga before 😅" },
        { check: "done", title: "New lead captured", detail: "Contact added to your CRM" },
        { check: "done", title: "Schedule checked", detail: "3 beginner-friendly classes this week" },
        {
          agent:
            "Welcome, Marcus! Everyone starts somewhere 😊 These are great first classes this week:\n\n• *Foundations* · Tue 6:30 PM · 6 spots\n• *Gentle Flow* · Thu 12:15 PM · 3 spots\n• *Foundations* · Sat 9:00 AM · 1 spot left\n\nNew students get *3 classes for $39*.",
        },
        { advance: 1 },
        { customer: "Tuesday works! Do I need to bring a mat?" },
        {
          agent: "Nope, mats, blocks and towels are free for first-timers. Shall I book you into *Foundations on Tuesday at 6:30 PM*?",
          buttons: ["Yes, book me in", "Show other times"],
        },
        { customer: "Yes, book me in", tap: 0 },
        { check: "done", title: "Booking created", detail: "Foundations · Tue 6:30 PM" },
        { check: "done", title: "Intro offer sent", detail: "3 classes for $39 · checkout link" },
        { check: "done", title: "Reminder scheduled", detail: "WhatsApp nudge 2h before class" },
        {
          agent:
            "You're booked ✅ *Foundations* · Tue 6:30 PM with Jonah.\n\nGrab your intro pass above to lock in your spot. Arrive 10 minutes early and we'll show you around!",
          link: { title: "New Student Intro · 3 classes", sub: "Secure checkout · $39" },
        },
        { advance: 1 },
        { customer: "Done! See you Tuesday 🙌" },
        { react: "🙌" },
        { resolve: "New student booked while you taught" },
      ],
    },
    {
      id: "membership-faq",
      day: "Sun",
      start: 22 * 60 + 52,
      contact: {
        name: "Elena R.",
        initials: "ER",
        color: "#5e7f69",
        tag: "Member · Unlimited Monthly",
        chips: ["Active", "2 guest passes"],
      },
      steps: [
        { log: "info", title: "After hours", detail: "Studio reopens 6:30 AM" },
        { customer: "Hi! Can I freeze my membership? I'm travelling for 3 weeks in October ✈️" },
        { check: "done", title: "Member found", detail: "Unlimited Monthly · active" },
        { check: "done", title: "Freeze policy", detail: "1–8 weeks · eligible · no fee" },
        {
          agent:
            "Hi Elena! Yes, Unlimited members can freeze for 1 to 8 weeks at no cost, and your billing date simply moves back.\n\nWhich dates will you be away?",
        },
        { advance: 1 },
        { customer: "Oct 6 to Oct 27. Also, do my guest passes expire?" },
        { check: "done", title: "Guest passes checked", detail: "2 remaining · valid to Dec 31" },
        {
          agent:
            "Here's the plan:\n\n❄️ *Freeze:* Oct 6 → Oct 27\n💳 *Next billing:* moves from Oct 15 to Nov 5\n🎟️ *Guest passes:* 2 left, valid until Dec 31. The freeze doesn't affect them.\n\nShall I confirm?",
          buttons: ["Confirm freeze", "Talk to the team"],
        },
        { customer: "Confirm freeze", tap: 0 },
        { check: "done", title: "Membership frozen", detail: "Oct 6 – Oct 27 · billing updated" },
        { check: "done", title: "Confirmation emailed", detail: "Receipt sent to member" },
        {
          agent: "Done ❄️ Your membership is frozen from *Oct 6 to Oct 27*, and a confirmation is on its way to your inbox. Safe travels, Elena!",
        },
        { advance: 1 },
        { customer: "You're the best, thank you!" },
        { react: "❤️" },
        { resolve: "Resolved in 2 min · no staff needed" },
      ],
    },
  ];

  const ICONS = {
    done: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.6v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="9.3" r="1" fill="currentColor"/></svg>',
    info: '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>',
    pending: "",
    tick: '<svg class="wa-tick" viewBox="0 0 18 11" aria-hidden="true"><path d="M1.2 5.9 4.3 9 11 2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path class="t2" d="M7.4 8.2 8.2 9 14.9 2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sparkle: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 7.3 4.7 11.2 6 7.3 7.3 6 11.2 4.7 7.3.8 6l3.9-1.3Z" fill="currentColor"/></svg>',
    reply: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4 2.5 8l4 4M3 8h6.5a4 4 0 0 1 4 4v.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ticket: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 7v10" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
    moon: '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" fill="currentColor"/></svg>',
    sun: '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    resolved: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor" opacity=".15"/><path d="M4.8 8.2 7 10.3l4.2-4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const q = (sel) => root.querySelector(sel);
  const els = {
    messages: q("[data-wa-messages]"),
    avatar: q("[data-wa-avatar]"),
    name: q("[data-wa-name]"),
    status: q("[data-wa-status]"),
    day: q("[data-wa-day]"),
    time: q("[data-wa-time]"),
    clockIcon: q("[data-wa-clock-icon]"),
    contactAvatar: q("[data-wa-contact-avatar]"),
    contactName: q("[data-wa-contact-name]"),
    contactTag: q("[data-wa-contact-tag]"),
    contactChips: q("[data-wa-contact-chips]"),
    log: q("[data-wa-log]"),
    resolution: q("[data-wa-resolution]"),
    toggle: q("[data-chat-toggle]"),
    replay: q("[data-chat-replay]"),
    tabs: Array.from(root.querySelectorAll("[data-scenario]")),
  };

  const state = {
    index: 0,
    token: 0,
    paused: false,
    visible: false,
    started: false,
    autoAdvance: !REDUCED_MOTION,
    clock: 0,
    lastSide: null,
    lastButtons: null,
    lastAgentPreview: "",
  };

  class Cancelled extends Error {}

  // ---------- Timing ----------

  /** Pausable, cancellable delay. Time only passes while playing, on-screen and in a visible tab. */
  function wait(ms, token) {
    return new Promise((resolve, reject) => {
      let elapsed = 0;
      let last = performance.now();
      const tick = () => {
        if (token !== state.token) return reject(new Cancelled());
        const now = performance.now();
        if (!state.paused && state.visible && !document.hidden) elapsed += now - last;
        last = now;
        if (elapsed >= ms) return resolve();
        setTimeout(tick, Math.max(16, Math.min(60, ms - elapsed)));
      };
      tick();
    });
  }

  const pace = (ms) => (REDUCED_MOTION ? 0 : ms);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // ---------- Text helpers ----------

  const fill = (s) => s.replace(/\{brand\}/g, BRAND).replace(/\{studio\}/g, STUDIO);
  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rich = (s) =>
    escapeHtml(fill(s))
      .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  const plain = (s) => fill(s).replace(/\*/g, "");

  function formatTime(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m % 60).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
  }

  // ---------- Rendering ----------

  // Follow new content unless the visitor has scrolled up to read. Scrolling is instant on purpose:
  // Chrome cancels an in-flight smooth scroll when another starts (e.g. the log vs. the chat, or a
  // page anchor jump), which would leave the chat stranded mid-conversation.
  function append(container, node) {
    const stickToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    container.appendChild(node);
    if (stickToBottom) scrollToEnd(container);
    return node;
  }

  function scrollToEnd(container) {
    container.scrollTop = container.scrollHeight;
  }

  function setClock(minutes, animate = true) {
    state.clock = minutes;
    const hour = Math.floor((((minutes % 1440) + 1440) % 1440) / 60);
    els.clockIcon.innerHTML = hour >= 20 || hour < 6 ? ICONS.moon : ICONS.sun;
    els.time.textContent = formatTime(minutes);
    if (animate && !REDUCED_MOTION) {
      els.time.classList.remove("is-ticking");
      void els.time.offsetWidth; // restart the animation
      els.time.classList.add("is-ticking");
    }
  }

  function setStatus(text, typing = false) {
    els.status.textContent = text;
    els.status.classList.toggle("is-typing", typing);
  }

  function setResolution(resolved, text) {
    els.resolution.classList.toggle("is-resolved", resolved);
    els.resolution.innerHTML = `${resolved ? ICONS.resolved : '<span class="pulse-dot"></span>'}<span>${escapeHtml(text)}</span>`;
  }

  function setTabProgress(fraction) {
    els.tabs.forEach((tab, i) => {
      const bar = tab.querySelector(".demo-tab-progress > span");
      if (bar) bar.style.width = i === state.index ? `${Math.round(fraction * 100)}%` : "0%";
    });
  }

  function newRow(side, { commit = true } = {}) {
    const row = document.createElement("div");
    row.className = `wa-row ${side}`;
    if (state.lastSide !== side) row.classList.add("tail");
    if (commit) state.lastSide = side;
    return row;
  }

  function showTyping(side) {
    const row = newRow(side, { commit: false });
    row.classList.add("wa-typing-row");
    row.innerHTML = '<div class="wa-stack"><div class="wa-bubble wa-typing" role="img" aria-label="typing"><i></i><i></i><i></i></div></div>';
    return append(els.messages, row);
  }

  function addMessage(side, text, { quote, buttons, link } = {}) {
    const row = newRow(side);
    let bubble = "";
    if (quote) bubble += `<div class="wa-quote"><b>You</b><span>${escapeHtml(quote)}</span></div>`;
    if (side === "out") bubble += `<span class="wa-ai-tag">${ICONS.sparkle}${escapeHtml(BRAND)} AI</span>`;
    if (link) {
      bubble += `<div class="wa-link"><span class="wa-link-thumb">${ICONS.ticket}</span><span class="wa-link-copy"><span class="wa-link-title">${escapeHtml(fill(link.title))}</span><span class="wa-link-sub">${escapeHtml(fill(link.sub))}</span></span></div>`;
    }
    bubble += `<div class="wa-text">${rich(text)}<span class="wa-spacer"></span></div>`;
    bubble += `<span class="wa-meta"><span>${formatTime(state.clock)}</span>${side === "out" ? ICONS.tick : ""}</span>`;
    const replies = (buttons || [])
      .map((label) => `<div class="wa-qr">${ICONS.reply}<span>${escapeHtml(fill(label))}</span></div>`)
      .join("");
    row.innerHTML = `<div class="wa-stack"><div class="wa-bubble">${bubble}</div>${replies}</div>`;
    if (side === "out") row.classList.add("is-sent");
    return append(els.messages, row);
  }

  function setTicks(row, tickState) {
    row.classList.remove("is-sent", "is-delivered", "is-read");
    row.classList.add(`is-${tickState}`);
  }

  function markAllRead() {
    els.messages.querySelectorAll(".wa-row.out.is-sent, .wa-row.out.is-delivered").forEach((row) => setTicks(row, "read"));
  }

  function addLog(kind, title, detail) {
    const item = document.createElement("li");
    item.className = `wa-log-item is-${kind}`;
    item.innerHTML =
      `<span class="wa-log-icon">${ICONS[kind]}</span>` +
      `<div><div class="wa-log-title">${escapeHtml(fill(title))}</div>` +
      (detail ? `<div class="wa-log-detail">${escapeHtml(fill(detail))}</div>` : "") +
      "</div>";
    return append(els.log, item);
  }

  function resolveLog(item, kind) {
    item.classList.remove("is-pending");
    item.classList.add(`is-${kind}`);
    item.querySelector(".wa-log-icon").innerHTML = ICONS[kind];
  }

  function reset(scenario) {
    const { contact } = scenario;
    els.messages.innerHTML = '<div class="wa-date">Today</div>';
    els.log.innerHTML = "";
    state.lastSide = null;
    state.lastButtons = null;

    for (const avatar of [els.avatar, els.contactAvatar]) {
      avatar.textContent = contact.initials;
      avatar.style.backgroundColor = contact.color;
    }
    els.name.textContent = contact.name;
    els.contactName.textContent = contact.drawerName || contact.name;
    els.contactTag.textContent = contact.tag;
    els.contactChips.innerHTML = contact.chips.map((chip) => `<span class="wa-chip">${escapeHtml(chip)}</span>`).join("");
    els.day.textContent = scenario.day;
    setClock(scenario.start, false);
    setStatus("online");
    setResolution(false, `${BRAND} is handling this chat`);

    els.tabs.forEach((tab, i) => {
      const selected = i === state.index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    setTabProgress(0);
  }

  // ---------- Step runners ----------

  async function customerSays(step, token) {
    if (step.tap != null && state.lastButtons) {
      await wait(pace(1100), token);
      markAllRead();
      const button = state.lastButtons[step.tap];
      button?.classList.add("is-tapped");
      await wait(pace(450), token);
      button?.classList.remove("is-tapped");
      addMessage("in", step.customer, { quote: state.lastAgentPreview });
      state.lastButtons = null;
      return wait(pace(500), token);
    }

    await wait(pace(900), token);
    markAllRead();
    setStatus("typing…", true);
    const typing = showTyping("in");
    await wait(pace(clamp(step.customer.length * 22, 1100, 2800)), token);
    typing.remove();
    setStatus("online");
    addMessage("in", step.customer);
    return wait(pace(500), token);
  }

  async function agentSays(step, token) {
    await wait(pace(350), token);
    const typing = showTyping("out");
    await wait(pace(clamp(step.agent.length * 7, 900, 2200)), token);
    typing.remove();
    const row = addMessage("out", step.agent, { buttons: step.buttons, link: step.link });
    state.lastAgentPreview = plain(step.agent).split("\n")[0];
    state.lastButtons = step.buttons ? Array.from(row.querySelectorAll(".wa-qr")) : null;
    await wait(pace(450), token);
    setTicks(row, "delivered");
    return wait(pace(600), token);
  }

  async function react(emoji, token) {
    await wait(pace(700), token);
    const rows = els.messages.querySelectorAll(".wa-row.in:not(.wa-typing-row)");
    const row = rows[rows.length - 1];
    if (!row) return;
    const badge = document.createElement("span");
    badge.className = "wa-reaction";
    badge.textContent = emoji;
    row.querySelector(".wa-bubble").appendChild(badge);
    row.classList.add("has-reaction");
    scrollToEnd(els.messages);
    return wait(pace(400), token);
  }

  async function runStep(step, token) {
    if (step.advance) {
      setClock(state.clock + step.advance);
      return wait(pace(250), token);
    }
    if (step.log) {
      addLog(step.log, step.title, step.detail);
      return wait(pace(500), token);
    }
    if (step.check) {
      const item = addLog("pending", step.title, step.detail);
      await wait(pace(step.ms || 850), token);
      resolveLog(item, step.check);
      return wait(pace(200), token);
    }
    if (step.customer) return customerSays(step, token);
    if (step.agent) return agentSays(step, token);
    if (step.react) return react(step.react, token);
    if (step.resolve) setResolution(true, fill(step.resolve));
  }

  async function play(index) {
    const token = ++state.token;
    state.index = index;
    const scenario = SCENARIOS[index];
    reset(scenario);

    try {
      await wait(pace(500), token);
      for (let i = 0; i < scenario.steps.length; i++) {
        await runStep(scenario.steps[i], token);
        setTabProgress((i + 1) / scenario.steps.length);
      }
      markAllRead();
      if (state.autoAdvance) {
        await wait(AUTO_ADVANCE_DELAY, token);
        play((index + 1) % SCENARIOS.length);
      }
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    }
  }

  // ---------- Controls ----------

  function setPaused(paused) {
    state.paused = paused;
    root.classList.toggle("is-paused", paused);
    els.toggle.setAttribute("aria-pressed", String(paused));
    els.toggle.setAttribute("aria-label", paused ? "Play demo" : "Pause demo");
    els.toggle.querySelector("[data-icon-pause]").hidden = paused;
    els.toggle.querySelector("[data-icon-play]").hidden = !paused;
  }

  els.toggle.addEventListener("click", () => setPaused(!state.paused));

  els.replay.addEventListener("click", () => {
    state.autoAdvance = false;
    setPaused(false);
    play(state.index);
  });

  els.tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      state.autoAdvance = false;
      state.started = true;
      setPaused(false);
      play(i);
    });
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = els.tabs[(i + step + els.tabs.length) % els.tabs.length];
      next.focus();
      next.click();
    });
  });

  // Start when the widget scrolls into view; time freezes while it's off-screen.
  reset(SCENARIOS[0]);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.visible = entry.isIntersecting;
          if (state.visible && !state.started) {
            state.started = true;
            play(0);
          }
        }
      },
      { threshold: 0.2 }
    ).observe(root);
  } else {
    state.visible = true;
    state.started = true;
    play(0);
  }
})();
