/* ==========================================================================
   Mercy Seat Chapel — job details & application form (job-*.html pages)
   - Fills [data-job="key"] elements from the JOB settings at the top of the page
   - Six-step form: checks each step before moving on, keeps every answer while
     moving between steps, builds the review summary, and enables Submit only
     when all required answers and declarations are complete
   - Nothing is kept in browser storage. While JOB.submitUrl is empty
     (draft/testing) Submit stays disabled and nothing is sent anywhere.

   Backend contract (when JOB.submitUrl is set): the form is POSTed as
   multipart/form-data. The server must re-check every field and file, store
   the application, send the emails, and only then reply with a 2xx status and
   JSON { "reference": "...", "submittedAt": "ISO date" }. Any other reply is
   shown to the applicant as a failed submission. If the page includes
   <meta name="csrf-token" content="...">, its value is sent as X-CSRF-Token.
   ========================================================================== */
(() => {
  if (typeof JOB === "undefined") return;

  const PENDING = "To be confirmed";
  const MAX_FILE_MB = 5;
  const MIME = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Job details from JOB settings ---------- */
  document.querySelectorAll("[data-job]").forEach((el) => {
    const value = JOB[el.dataset.job];
    el.textContent = value || PENDING;
    el.classList.toggle("is-pending", !value);
  });
  document.querySelectorAll("[data-job-value]").forEach((el) => { el.value = JOB[el.dataset.jobValue] || ""; });
  // Links to documents that may not exist yet (e.g. the Recruitment Privacy Notice)
  document.querySelectorAll("[data-job-link]").forEach((a) => {
    const url = JOB[a.dataset.jobLink];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; return; }
    const span = document.createElement("span");
    span.textContent = `${a.textContent} (not yet published)`;
    span.className = "is-pending";
    a.replaceWith(span);
  });

  /* ---------- Application form ---------- */
  const form = document.querySelector("[data-application]");
  if (!form) return;
  const steps = [...form.querySelectorAll(".app-step")];
  const stepItems = [...form.querySelectorAll(".app-steps li")];
  const prevBtn = form.querySelector("[data-prev]");
  const nextBtn = form.querySelector("[data-next]");
  const submitBtn = form.querySelector("[data-submit]");
  const status = form.querySelector("[data-status]");
  const errorBox = form.querySelector(".app-error");
  const progressText = form.querySelector(".app-progress__text");
  const progressBar = form.querySelector(".app-progress__bar span");
  const success = document.querySelector("[data-success]");
  const configured = Boolean(JOB.submitUrl);
  const last = steps.length - 1;
  let current = 0, reached = 0, busy = false;

  const words = (text) => (text.trim().match(/\S+/g) || []).length;
  const isShown = (el) => !el.closest(".app-cond[hidden]");
  const labelOf = (field) => {
    const label = field.querySelector("legend, label").cloneNode(true);
    label.querySelectorAll(".req, .opt, input").forEach((n) => n.remove());
    return label.textContent.trim();
  };
  // One control per question (radio and checkbox groups share a name)
  const controlsIn = (scope) => {
    const seen = new Set();
    return [...scope.querySelectorAll("input:not([type=hidden]), select, textarea")].filter((c) => {
      if (c.name === "company_fax" || !isShown(c) || seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  };

  // Returns an error message for a control, or "" if it's fine
  function problem(c) {
    const group = c.type === "radio" || (c.type === "checkbox" && form.querySelectorAll(`[name="${c.name}"]`).length > 1);
    if (group) {
      const required = form.querySelector(`[name="${c.name}"][required]`);
      return required && !form.querySelector(`[name="${c.name}"]:checked`) ? "Please choose an answer." : "";
    }
    if (c.type === "checkbox") return c.required && !c.checked ? "Please tick this box to continue." : "";
    if (c.type === "file") {
      const files = [...c.files];
      if (!files.length) return c.required ? "Please upload your résumé or CV." : "";
      const types = c.dataset.types.split(",");
      const max = Number(c.dataset.maxFiles) || 1;
      if (files.length > max) return `Please choose no more than ${max} files.`;
      for (const f of files) {
        const ext = f.name.split(".").pop().toLowerCase();
        if (!types.includes(ext) || (f.type && f.type !== MIME[ext])) return `“${f.name}” isn’t an accepted file type. Please use ${types.map((t) => t.toUpperCase()).join(" or ")}.`;
        if (f.size > MAX_FILE_MB * 1024 * 1024) return `“${f.name}” is larger than ${MAX_FILE_MB} MB.`;
      }
      return "";
    }
    const value = c.value.trim();
    if (!value) return c.required ? (c.tagName === "SELECT" ? "Please choose an option." : "This field is required.") : "";
    if (c.type === "email" && c.validity.typeMismatch) return "Enter a valid email address, like name@example.com.";
    if (c.type === "url" && c.validity.typeMismatch) return "Enter a full web address starting with https://";
    if (c.type === "tel" && (!/^[+\d\s().-]+$/.test(value) || value.replace(/\D/g, "").length < 10)) return "Enter a valid phone number, including the area code.";
    const maxWords = Number(c.dataset.maxWords);
    if (maxWords && words(value) > maxWords) return `Please keep this to ${maxWords} words or fewer (currently ${words(value)}).`;
    return "";
  }

  // Shows or clears the message under a question
  function showProblem(c, message) {
    const field = c.closest(".field");
    let err = field.querySelector(".field-error");
    if (!err) {
      err = document.createElement("p");
      err.className = "field-error";
      err.id = `${c.name}-error`;
      field.append(err);
    }
    err.textContent = message;
    err.hidden = !message;
    field.querySelectorAll("input, select, textarea").forEach((el) => {
      const ids = (el.getAttribute("aria-describedby") || "").split(" ").filter((id) => id && id !== err.id);
      if (message) { ids.push(err.id); el.setAttribute("aria-invalid", "true"); } else el.removeAttribute("aria-invalid");
      ids.length ? el.setAttribute("aria-describedby", ids.join(" ")) : el.removeAttribute("aria-describedby");
    });
  }

  // First control with a problem in a step (show = also display the messages)
  function checkStep(n, show) {
    let first = null;
    controlsIn(steps[n]).forEach((c) => {
      const message = problem(c);
      if (show) showProblem(c, message);
      if (message && !first) first = c;
    });
    return first;
  }

  function goTo(n) {
    current = n;
    reached = Math.max(reached, n);
    steps.forEach((s, k) => { s.hidden = k !== n; });
    stepItems.forEach((li, k) => {
      const btn = li.querySelector("button");
      k === n ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
      li.classList.toggle("is-done", k < n || (k <= reached && k !== n && !checkStep(k, false)));
      btn.disabled = k > reached;
      btn.setAttribute("aria-label", `Step ${k + 1}: ${steps[k].dataset.title}${k < n ? " (completed)" : ""}`);
    });
    progressText.textContent = `Step ${n + 1} of ${steps.length} · ${steps[n].dataset.title}`;
    progressBar.style.width = `${((n + 1) / steps.length) * 100}%`;
    prevBtn.hidden = n === 0;
    nextBtn.hidden = n === last;
    submitBtn.hidden = n !== last;
    form.querySelectorAll("[data-test-only]").forEach((el) => { el.hidden = n !== last || configured; });
    errorBox.hidden = true;
    status.textContent = "";
    if (n === last) buildReview();
    updateSubmit();
  }

  function moveTo(n) {
    // Going forward: stop at the first earlier step that still needs answers
    for (let k = current; k < n; k++) {
      const bad = checkStep(k, true);
      if (bad) { if (k !== current) goTo(k); focusProblem(bad); return; }
    }
    goTo(n);
    form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    steps[n].querySelector("h3").focus({ preventScroll: true });
  }

  function focusProblem(c) {
    const count = controlsIn(steps[current]).filter((x) => problem(x)).length;
    status.textContent = `Please check ${count === 1 ? "1 answer" : `${count} answers`} on this step.`;
    c.focus();
  }

  /* Review summary, built from the answers (text only, never as HTML) */
  function answerOf(field) {
    const checked = [...field.querySelectorAll("input:checked")];
    const file = field.querySelector("input[type=file]");
    if (file) return [...file.files].map((f) => f.name).join(", ");
    if (field.querySelector("input[type=radio], input[type=checkbox]")) return checked.map((i) => i.value).join(", ");
    const select = field.querySelector("select");
    if (select) return select.value ? select.selectedOptions[0].textContent : "";
    return field.querySelector("input, textarea").value.trim();
  }
  function buildReview() {
    const box = form.querySelector("[data-review]");
    box.replaceChildren(...steps.slice(0, last).map((step, k) => {
      const sec = document.createElement("section");
      const head = document.createElement("header");
      const h = document.createElement("h4");
      h.textContent = `${k + 1}. ${step.dataset.title}`;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "link-btn";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", `Edit ${step.dataset.title}`);
      edit.addEventListener("click", () => moveTo(k));
      head.append(h, edit);
      const dl = document.createElement("dl");
      step.querySelectorAll(".field").forEach((field) => {
        if (!isShown(field)) return;
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = labelOf(field);
        dd.textContent = answerOf(field) || "—";
        dl.append(dt, dd);
      });
      sec.append(head, dl);
      return sec;
    }));
  }

  function updateSubmit() {
    if (current !== last || busy) return;
    const ready = steps.every((_, k) => !checkStep(k, false));
    submitBtn.disabled = !configured || !ready;
    status.textContent = !configured
      ? "Online applications are switched off while this page is in draft/testing. Nothing you enter is sent or saved."
      : ready ? "" : "Complete all required answers and tick both declarations to submit.";
  }

  function showSuccess(reference, submittedAt, test) {
    form.hidden = true;
    success.hidden = false;
    success.querySelectorAll("[data-success-test]").forEach((el) => { el.hidden = !test; });
    success.querySelector("[data-success-ref]").textContent = reference;
    success.querySelector("[data-success-date]").textContent = new Date(submittedAt || Date.now())
      .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    success.querySelector("h3").focus({ preventScroll: true });
  }

  /* ---------- Events ---------- */
  nextBtn.addEventListener("click", () => moveTo(current + 1));
  prevBtn.addEventListener("click", () => moveTo(current - 1));
  stepItems.forEach((li, k) => li.querySelector("button").addEventListener("click", () => moveTo(k)));

  // Word counters under long answers
  form.querySelectorAll("textarea[data-max-words]").forEach((t) => {
    const count = document.createElement("p");
    count.className = "word-count";
    count.id = `${t.name}-count`;
    t.setAttribute("aria-describedby", count.id);
    t.after(count);
    const update = () => {
      const n = words(t.value), max = Number(t.dataset.maxWords);
      count.textContent = `${n} / ${max} words${n > max ? ` (${n - max} over the limit)` : ""}`;
      count.classList.toggle("is-over", n > max);
    };
    t.addEventListener("input", update);
    update();
  });

  // Follow-up questions shown only for a matching answer (data-show-if="name=value").
  // While hidden they're disabled, so an answer typed earlier isn't sent.
  const conds = [...form.querySelectorAll("[data-show-if]")];
  const updateConds = () => conds.forEach((el) => {
    const [name, value] = el.dataset.showIf.split("=");
    el.hidden = form.elements[name].value !== value;
    el.querySelectorAll("input, textarea").forEach((c) => { c.disabled = el.hidden; });
  });

  // Once every message on a step is fixed, drop the "Please check…" note too
  const clearStepNote = () => {
    if (current !== last && !steps[current].querySelector(".field-error:not([hidden])")) status.textContent = "";
  };
  form.addEventListener("change", (e) => {
    updateConds();
    // Clear a message as soon as the answer is fixed
    if (e.target.closest(".field")?.querySelector(".field-error:not([hidden])")) showProblem(e.target, problem(e.target));
    clearStepNote();
    updateSubmit();
  });
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true" && !problem(e.target)) showProblem(e.target, "");
    clearStepNote();
    updateSubmit();
  });
  // Enter in a text box moves to the next step instead of submitting
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && !["file", "radio", "checkbox"].includes(e.target.type) && current !== last) { e.preventDefault(); moveTo(current + 1); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !configured) return;
    const bad = steps.findIndex((_, k) => checkStep(k, false));
    if (bad > -1) { goTo(bad); focusProblem(checkStep(bad, true)); return; }
    if (form.elements.company_fax.value) return; // spam trap filled: ignore quietly
    busy = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitBtn.textContent = "Submitting…";
    form.setAttribute("aria-busy", "true");
    errorBox.hidden = true;
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(JOB.submitUrl, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        headers: csrf ? { "X-CSRF-Token": csrf } : {}
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (!data || !data.reference) throw new Error("Not confirmed");
      form.reset(); // clear the answers from the page once they're safely stored
      showSuccess(data.reference, data.submittedAt, false);
    } catch (err) {
      errorBox.textContent = "Sorry, your application could not be submitted, and nothing has been saved. Please check your connection and try again. If the problem continues, contact the church office.";
      errorBox.hidden = false;
      busy = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.textContent = "Submit Application";
      form.removeAttribute("aria-busy");
      updateSubmit();
    }
  });

  // Test-only preview of the confirmation screen (draft mode; nothing is sent)
  form.querySelector("[data-preview]")?.addEventListener("click", () => showSuccess("TEST-PREVIEW", null, true));
  success.querySelector("[data-back-to-form]")?.addEventListener("click", () => {
    success.hidden = true;
    form.hidden = false;
    moveTo(last);
  });

  updateConds();
  goTo(0);
})();
