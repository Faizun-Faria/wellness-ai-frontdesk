/*!
 * app.js: page interactions. Sticky nav, demo registration modal, feature tabs, ROI calculator.
 * The hero chat lives in simulated-chat.js.
 */
(() => {
  "use strict";

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Sticky nav hairline ----------
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---------- Registration modal ----------
  const dialog = document.getElementById("demo-modal");
  if (dialog) initModal(dialog);

  function initModal(dialog) {
    const form = dialog.querySelector("form");
    const views = {
      form: dialog.querySelector("[data-view='form']"),
      success: dialog.querySelector("[data-view='success']"),
    };
    const ui = {
      title: dialog.querySelector("[data-modal-title]"),
      sub: dialog.querySelector("[data-modal-sub]"),
      submit: form.querySelector("[type='submit']"),
      submitLabel: form.querySelector("[data-submit-label]"),
      spinner: form.querySelector("[data-submit-spinner]"),
      formError: form.querySelector("[data-form-error]"),
      successTitle: dialog.querySelector("[data-success-title]"),
      successBody: dialog.querySelector("[data-success-body]"),
      successEmail: dialog.querySelector("[data-success-email]"),
    };

    const COPY = {
      demo: {
        title: "Try the interactive 1-hour demo",
        sub: "Get a private AI front desk trained on a sample studio and throw your trickiest student questions at it. We'll email your access link.",
        submit: "Get my demo link",
      },
      walkthrough: {
        title: "Book a walkthrough",
        sub: "A 20-minute call to see how it would work with your schedule, your policies and your studio software.",
        submit: "Request a walkthrough",
      },
    };
    const FIELDS = {
      name: "Please tell us your name.",
      studio_name: "Which studio is this for?",
      email: "Enter a valid email address.",
    };

    function showView(name) {
      views.form.hidden = name !== "form";
      views.success.hidden = name !== "success";
    }

    function setFieldError(name, message) {
      const input = form.elements[name];
      const slot = form.querySelector(`[data-error-for="${name}"]`);
      input.setAttribute("aria-invalid", message ? "true" : "false");
      slot.textContent = message;
      slot.hidden = !message;
    }

    function clearErrors() {
      Object.keys(FIELDS).forEach((name) => setFieldError(name, ""));
      ui.formError.hidden = true;
    }

    function showFormError(message) {
      ui.formError.textContent = message;
      ui.formError.hidden = false;
    }

    function setLoading(loading) {
      ui.submit.disabled = loading;
      ui.spinner.hidden = !loading;
    }

    function validate() {
      let firstInvalid = null;
      for (const [name, message] of Object.entries(FIELDS)) {
        const input = form.elements[name];
        input.value = input.value.trim();
        const valid = input.checkValidity();
        setFieldError(name, valid ? "" : message);
        if (!valid && !firstInvalid) firstInvalid = input;
      }
      firstInvalid?.focus();
      return !firstInvalid;
    }

    function open(intent) {
      const key = intent in COPY ? intent : "demo";
      form.elements.intent.value = key;
      ui.title.textContent = COPY[key].title;
      ui.sub.textContent = COPY[key].sub;
      ui.submitLabel.textContent = COPY[key].submit;
      clearErrors();
      showView("form");
      document.documentElement.classList.add("modal-open");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function close() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      document.documentElement.classList.remove("modal-open");
    }

    function showSuccess(payload, data) {
      const firstName = payload.name.split(/\s+/)[0];
      ui.successTitle.textContent = payload.intent === "walkthrough" ? `Thanks, ${firstName}!` : `You're in, ${firstName}!`;
      ui.successBody.textContent = data.message || "We'll be in touch shortly.";
      ui.successEmail.textContent = payload.email;
      form.reset();
      showView("success");
      views.success.querySelector("[data-close-modal]").focus();
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-open-modal]");
      if (!trigger) return;
      event.preventDefault();
      open(trigger.dataset.openModal);
    });
    dialog.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", close));
    // A click that lands on the <dialog> itself (not its content) is a click on the backdrop.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("close", () => document.documentElement.classList.remove("modal-open"));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors();
      if (!validate()) return;

      const payload = Object.fromEntries(new FormData(form).entries());
      setLoading(true);
      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          showSuccess(payload, data);
        } else if (response.status === 422 && Array.isArray(data.detail)) {
          data.detail.forEach((error) => {
            const field = error.loc?.[error.loc.length - 1];
            if (field in FIELDS) setFieldError(field, FIELDS[field]);
          });
        } else {
          showFormError("Something went wrong on our side. Please try again in a moment.");
        }
      } catch {
        showFormError("We couldn't reach the server. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    });
  }

  // ---------- Feature tabs (auto-rotating) ----------
  const featureRoot = document.querySelector("[data-feature-tabs]");
  if (featureRoot) initFeatureTabs(featureRoot);

  function initFeatureTabs(root) {
    const tabs = Array.from(root.querySelectorAll("[role='tab']"));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    const bars = tabs.map((tab) => tab.querySelector(".feature-progress > span"));
    const DURATION = 7000;
    let active = 0;
    let elapsed = 0;
    let last = 0;
    let autoplay = !REDUCED_MOTION;
    let held = false; // hovered or focused
    let inView = false;

    function select(index) {
      active = index;
      elapsed = 0;
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        bars[i].style.width = selected && !autoplay ? "100%" : "0%";
      });
      panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
    }

    function frame(now) {
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      if (!autoplay) return;
      if (!held && inView) elapsed += dt;
      const progress = Math.min(1, elapsed / DURATION);
      bars[active].style.width = `${progress * 100}%`;
      if (progress >= 1) select((active + 1) % tabs.length);
      requestAnimationFrame(frame);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        autoplay = false;
        select(i);
      });
      tab.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = (i + step + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
    root.addEventListener("mouseenter", () => (held = true));
    root.addEventListener("mouseleave", () => (held = false));
    root.addEventListener("focusin", () => (held = true));
    root.addEventListener("focusout", () => (held = false));

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => entries.forEach((e) => (inView = e.isIntersecting)), { threshold: 0.3 }).observe(root);
    } else {
      inView = true;
    }

    select(0);
    if (autoplay) requestAnimationFrame(frame);
  }

  // ---------- ROI calculator ----------
  const roiRoot = document.querySelector("[data-roi]");
  if (roiRoot) initRoi(roiRoot);

  function initRoi(root) {
    const WEEKS_PER_MONTH = 4.33;
    const AUTOMATED_SHARE = 0.7; // share of routine admin handled end to end (stated on the page)
    const money = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: root.dataset.currency || "USD",
      maximumFractionDigits: 0,
    });
    const inputs = Array.from(root.querySelectorAll("input[type='range']"));
    const out = (key) => root.querySelector(`[data-roi-out="${key}"]`);
    const display = (key) => root.querySelector(`[data-roi-display="${key}"]`);
    const formats = {
      missed: (v) => `${v} / week`,
      rate: (v) => `${v}%`,
      value: (v) => money.format(v),
      hours: (v) => `${v} h / week`,
    };

    function tween(el, target, format) {
      const from = Number(el.dataset.value ?? target);
      el.dataset.value = String(target);
      if (REDUCED_MOTION || from === target) {
        el.textContent = format(target);
        return;
      }
      const start = performance.now();
      const step = (now) => {
        if (el.dataset.value !== String(target)) return; // a newer update took over
        const t = Math.min(1, (now - start) / 320);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(from + (target - from) * eased);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function update() {
      const v = {};
      for (const input of inputs) {
        const value = Number(input.value);
        v[input.name] = value;
        const fill = ((value - input.min) / (input.max - input.min)) * 100;
        input.style.setProperty("--fill", `${fill}%`);
        display(input.name).textContent = formats[input.name](value);
      }
      const bookings = v.missed * (v.rate / 100) * WEEKS_PER_MONTH;
      const revenue = bookings * v.value;
      const hours = v.hours * WEEKS_PER_MONTH * AUTOMATED_SHARE;

      tween(out("revenue"), Math.round(revenue), (n) => money.format(n));
      tween(out("hours"), Math.round(hours), (n) => `${Math.round(n)}h`);
      out("bookings").textContent = String(Math.round(bookings));
      out("annual").textContent = money.format(Math.round(revenue * 12));
    }

    inputs.forEach((input) => input.addEventListener("input", update));
    update();
  }

  // ---------- Control & guardrails ----------
  const fallbackRoot = document.querySelector("[data-fallback]");
  if (fallbackRoot) initFallback(fallbackRoot);
  const scheduleRoot = document.querySelector("[data-schedule]");
  if (scheduleRoot) initSchedule(scheduleRoot);
  const overrideRoot = document.querySelector("[data-override]");
  if (overrideRoot) initOverride(overrideRoot);

  function formatClock(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    return `${h24 % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
  }

  /** Fallback timer: staff get N minutes to reply before the AI steps in. */
  function initFallback(root) {
    const MESSAGE_AT = 14 * 60 + 41; // example incoming message at 2:41 PM
    const MIN = 1;
    const MAX = 15;
    let minutes = Number(root.dataset.fallbackDefault) || 3;
    const output = root.querySelector("[data-fallback-value]");
    const windowLabel = root.querySelector("[data-fallback-window]");
    const endLabel = root.querySelector("[data-fallback-end]");
    const less = root.querySelector('[data-fallback-step="-1"]');
    const more = root.querySelector('[data-fallback-step="1"]');

    function render() {
      output.textContent = `${minutes} min`;
      windowLabel.textContent = `${minutes} min`;
      endLabel.textContent = formatClock(MESSAGE_AT + minutes);
      less.disabled = minutes <= MIN;
      more.disabled = minutes >= MAX;
    }

    [less, more].forEach((button) =>
      button.addEventListener("click", () => {
        minutes = Math.min(MAX, Math.max(MIN, minutes + Number(button.dataset.fallbackStep)));
        render();
      })
    );
    render();
  }

  /** Weekly schedule: presets, plus tap/drag painting of individual hours. */
  function initSchedule(root) {
    // Days are 0 = Mon … 6 = Sun. Front-desk team hours for the default preset:
    // weekdays 8am–12pm and 1–5pm, Saturday 9am–1pm, Sunday 10am–12pm.
    const teamAtDesk = (d, h) => {
      if (d < 5) return (h >= 8 && h < 12) || (h >= 13 && h < 17);
      if (d === 5) return h >= 9 && h < 13;
      return h >= 10 && h < 12;
    };
    const PRESETS = {
      peak: (d, h) => !teamAtDesk(d, h),
      after: (d, h) => (d < 5 ? h < 8 || h >= 20 : h < 9 || h >= 17),
      always: () => true,
    };
    const grid = root.querySelector("[data-sched-grid]");
    const cells = Array.from(root.querySelectorAll(".sched-cell"));
    const presets = Array.from(root.querySelectorAll("[data-preset]"));
    const summary = root.querySelector("[data-sched-summary]");
    const detail = root.querySelector("[data-sched-detail]");

    function refresh() {
      const aiHours = cells.filter((cell) => cell.classList.contains("is-ai")).length;
      summary.textContent = `${aiHours} h / week`;
      detail.textContent = `The AI covers ${aiHours} of 168 hours a week; your team covers ${168 - aiHours}.`;
    }

    function applyPreset(name) {
      const rule = PRESETS[name];
      cells.forEach((cell) => cell.classList.toggle("is-ai", rule(Number(cell.dataset.d), Number(cell.dataset.h))));
      presets.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === name)));
      refresh();
    }

    presets.forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));

    // Painting: the first cell decides whether this drag turns hours on or off.
    let paintValue = null;
    const cellAt = (event) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el && el.classList.contains("sched-cell") && grid.contains(el) ? el : null;
    };
    const paint = (cell) => {
      if (!cell || cell.classList.contains("is-ai") === paintValue) return;
      cell.classList.toggle("is-ai", paintValue);
      presets.forEach((button) => button.setAttribute("aria-pressed", "false"));
      refresh();
    };
    grid.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const cell = cellAt(event);
      if (!cell) return;
      paintValue = !cell.classList.contains("is-ai");
      paint(cell);
    });
    grid.addEventListener("pointermove", (event) => {
      if (paintValue !== null) paint(cellAt(event));
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => grid.addEventListener(type, () => (paintValue = null)));

    applyPreset("peak");
  }

  /** Master switch pauses the AI studio-wide; each thread can be taken over or handed back. */
  function initOverride(root) {
    const toggle = root.querySelector("[data-master-switch]");
    const audit = root.querySelector("[data-master-audit]");
    const summary = root.querySelector("[data-thread-summary]");
    const threads = Array.from(root.querySelectorAll("[data-thread]"));

    function refresh() {
      const team = threads.filter((thread) => thread.dataset.mode === "staff").length;
      const ai = threads.length - team;
      summary.textContent =
        root.dataset.master === "on" ? `AI handling ${ai} · Team handling ${team}` : `AI paused · ${ai} waiting for your team`;
    }

    toggle.addEventListener("click", () => {
      const on = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", String(on));
      root.dataset.master = on ? "on" : "off";
      audit.textContent = on ? "Turned back on by you · just now" : "Paused by you · just now";
      refresh();
    });

    threads.forEach((thread) =>
      thread.querySelector("[data-thread-toggle]").addEventListener("click", () => {
        thread.dataset.mode = thread.dataset.mode === "staff" ? "ai" : "staff";
        refresh();
      })
    );
    refresh();
  }
})();
