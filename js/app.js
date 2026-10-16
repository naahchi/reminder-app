(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const DEFAULT_ICON = "assets/default-icon.svg";
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  let supabase = null;
  let currentUser = null;
  let reminders = [];
  let selectedFile = null;
  let removeExistingIcon = false;
  let toastTimer = null;

  const authView = $("authView"), appView = $("appView"), dialog = $("reminderDialog");
  const reminderForm = $("reminderForm");

  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }
  function setError(message) {
    const el = $("formError"); el.textContent = message || ""; el.classList.toggle("hidden", !message);
  }
  function setBusy(button, busy, label) {
    button.disabled = busy; button.textContent = busy ? "Please wait…" : label;
  }
  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function safeUrl(value) {
    if (!value) return "";
    try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; }
    catch { return ""; }
  }
  function formatDays(days) {
    if (!Array.isArray(days) || !days.length) return "No days selected";
    if (days.length === 7) return "Every day";
    return days.slice().sort((a,b) => a-b).map(d => DAYS[d]).join(", ");
  }
  function getTimesFromForm() {
    return [...$("timesList").querySelectorAll('input[type="time"]')].map(el => el.value).filter(Boolean).sort();
  }
  function getDaysFromForm() {
    return [...$("weekdayGrid").querySelectorAll('input[type="checkbox"]:checked')].map(el => Number(el.value)).sort((a,b) => a-b);
  }
  function renderTimeRow(value = "09:00") {
    const row = document.createElement("div"); row.className = "time-row";
    const input = document.createElement("input"); input.type = "time"; input.required = true; input.value = value; input.setAttribute("aria-label", "Notification time");
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-time"; remove.textContent = "×"; remove.setAttribute("aria-label", "Remove time");
    remove.addEventListener("click", () => {
      if ($("timesList").children.length <= 1) { toast("At least one time is required."); return; }
      row.remove();
    });
    row.append(input, remove); $("timesList").append(row);
  }
  function resetForm() {
    reminderForm.reset(); $("reminderId").value = ""; $("timesList").innerHTML = "";
    renderTimeRow("09:00"); renderTimeRow("18:00");
    [...$("weekdayGrid").querySelectorAll('input')].forEach(el => { el.checked = Number(el.value) >= 1 && Number(el.value) <= 6; });
    $("timezoneSelect").value = "Asia/Kolkata"; $("reminderEnabled").checked = true;
    $("iconPreview").src = DEFAULT_ICON; $("reminderIcon").value = "";
    selectedFile = null; removeExistingIcon = false; setError("");
    $("formTitle").textContent = "Create reminder"; $("formEyebrow").textContent = "NEW REMINDER"; $("saveBtn").textContent = "Save reminder";
  }
  function openCreate() { resetForm(); dialog.showModal(); }
  async function openEdit(id) {
    const r = reminders.find(item => item.id === id); if (!r) return;
    resetForm();
    $("reminderId").value = r.id; $("reminderName").value = r.name || "";
    $("reminderMessage").value = r.message || ""; $("reminderUrl").value = r.url || "";
    $("reminderEnabled").checked = !!r.enabled; $("timezoneSelect").value = r.timezone || "Asia/Kolkata";
    const days = Array.isArray(r.days) ? r.days : [1,2,3,4,5,6];
    [...$("weekdayGrid").querySelectorAll('input')].forEach(el => el.checked = days.includes(Number(el.value)));
    $("timesList").innerHTML = "";
    (Array.isArray(r.times) && r.times.length ? r.times : ["09:00"]).forEach(t => renderTimeRow(t));
    if (r.icon_path) {
      try {
        const { data, error } = await supabase.storage.from(cfg.STORAGE_BUCKET).createSignedUrl(r.icon_path, 3600);
        if (!error && data?.signedUrl) $("iconPreview").src = data.signedUrl;
      } catch (_) {}
    }
    selectedFile = null; removeExistingIcon = false;
    $("formTitle").textContent = "Edit reminder"; $("formEyebrow").textContent = "UPDATE REMINDER"; $("saveBtn").textContent = "Save changes";
    dialog.showModal();
  }
  function render() {
    $("totalCount").textContent = reminders.length;
    $("activeCount").textContent = reminders.filter(r => r.enabled).length;
    $("pausedCount").textContent = reminders.filter(r => !r.enabled).length;
    const list = $("reminderList"); list.innerHTML = "";
    $("emptyState").classList.toggle("hidden", reminders.length !== 0);
    if (!reminders.length) return;
    reminders.forEach(r => {
      const card = document.createElement("article"); card.className = "reminder-card";
      const days = formatDays(r.days), times = (r.times || []).join(" · ") || "No time set";
      const url = safeUrl(r.url || "");
      card.innerHTML = `
        <div class="card-top">
          <img class="reminder-icon" alt="" src="${DEFAULT_ICON}">
          <div class="card-title-wrap"><div class="card-title">${escapeHtml(r.name)}</div>
            <span class="status ${r.enabled ? "" : "paused"}">${r.enabled ? "Active" : "Paused"}</span>
            <div class="card-message">${escapeHtml(r.message || "No message added")}</div>
          </div>
        </div>
        <div class="schedule-line"><strong>Days:</strong> ${escapeHtml(days)}<br><strong>Times:</strong> ${escapeHtml(times)}<br><strong>Timezone:</strong> ${escapeHtml(r.timezone || "Asia/Kolkata")}</div>
        ${url ? `<a class="card-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : ""}
        <div class="card-actions">
          <button type="button" data-action="toggle" data-id="${r.id}">${r.enabled ? "Pause" : "Resume"}</button>
          <button type="button" data-action="edit" data-id="${r.id}">Edit</button>
          <button type="button" class="delete-btn" data-action="delete" data-id="${r.id}">Delete</button>
        </div>`;
      list.append(card);
      const img = card.querySelector(".reminder-icon");
      if (r.icon_path) {
        supabase.storage.from(cfg.STORAGE_BUCKET).createSignedUrl(r.icon_path, 3600).then(({data,error}) => {
          if (!error && data?.signedUrl && img.isConnected) img.src = data.signedUrl;
        }).catch(() => {});
      }
    });
  }
  async function loadReminders() {
    $("loadStatus").textContent = "Loading…";
    const { data, error } = await supabase.from("reminders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    reminders = data || []; render(); $("loadStatus").textContent = `${reminders.length} saved`;
  }
  async function uploadIcon(file, reminderId) {
    if (!file) return null;
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Use PNG, JPG, WebP or SVG image files only.");
    if (file.size > cfg.MAX_ICON_BYTES) throw new Error("Icon must be 1 MB or smaller.");
    const ext = ({ "image/png":"png", "image/jpeg":"jpg", "image/webp":"webp" })[file.type];
    const path = `${currentUser.id}/${reminderId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(cfg.STORAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  }
  async function removeIcon(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(cfg.STORAGE_BUCKET).remove([path]);
    if (error) console.warn("Could not remove old icon:", error.message);
  }
  async function saveReminder(event) {
    event.preventDefault(); setError("");
    const saveBtn = $("saveBtn"); setBusy(saveBtn, true, $("reminderId").value ? "Save changes" : "Save reminder");
    let uploadedPath = null;
    try {
      const id = $("reminderId").value || crypto.randomUUID();
      const name = $("reminderName").value.trim();
      const message = $("reminderMessage").value.trim();
      const rawUrl = $("reminderUrl").value.trim();
      const url = rawUrl ? safeUrl(rawUrl) : null;
      const days = getDaysFromForm(), times = getTimesFromForm();
      if (!name) throw new Error("Please enter a reminder name.");
      if (rawUrl && !url) throw new Error("Enter a valid http:// or https:// URL.");
      if (!days.length) throw new Error("Select at least one repeat day.");
      if (!times.length) throw new Error("Add at least one valid notification time.");
      if (new Set(times).size !== times.length) throw new Error("Remove duplicate notification times.");
      const existing = reminders.find(r => r.id === id);
      let iconPath = removeExistingIcon ? null : (existing?.icon_path || null);
      if (selectedFile) {
        uploadedPath = await uploadIcon(selectedFile, id);
        iconPath = uploadedPath;
      }
      const payload = {
        id, user_id: currentUser.id, name, message, url, days, times,
        timezone: $("timezoneSelect").value, enabled: $("reminderEnabled").checked,
        icon_path: iconPath, updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from("reminders").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      if (existing?.icon_path && existing.icon_path !== iconPath) await removeIcon(existing.icon_path);
      dialog.close(); resetForm(); await loadReminders(); toast(existing ? "Reminder updated." : "Reminder created.");
    } catch (error) {
      if (uploadedPath) await removeIcon(uploadedPath);
      setError(error.message || "Could not save reminder. Check your connection and Supabase settings.");
    } finally {
      setBusy(saveBtn, false, $("reminderId").value ? "Save changes" : "Save reminder");
      if (!$("reminderId").value) saveBtn.textContent = "Save reminder";
    }
  }
  async function toggleReminder(id) {
    const r = reminders.find(item => item.id === id); if (!r) return;
    const { error } = await supabase.from("reminders").update({ enabled: !r.enabled, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await loadReminders(); toast(!r.enabled ? "Reminder resumed." : "Reminder paused.");
  }
  async function deleteReminder(id) {
    const r = reminders.find(item => item.id === id); if (!r) return;
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) throw error;
    await removeIcon(r.icon_path); await loadReminders(); toast("Reminder deleted.");
  }
  function showApp(user) {
    currentUser = user; authView.classList.add("hidden"); appView.classList.remove("hidden"); $("logoutBtn").classList.remove("hidden");
    loadReminders().catch(err => { $("loadStatus").textContent = "Load failed"; toast(`Could not load reminders: ${err.message}`); });
  }
  function showAuth() {
    currentUser = null; reminders = []; appView.classList.add("hidden"); authView.classList.remove("hidden"); $("logoutBtn").classList.add("hidden");
  }
  async function init() {
    if (!window.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_PROJECT_ID") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")) {
      $("authView").innerHTML = `<div class="eyebrow">SETUP REQUIRED</div><h1>Connect your Supabase project</h1><p class="muted">Open <code>js/config.js</code> and replace the project URL and anon/publishable key. Then run the SQL setup in <code>supabase/schema.sql</code>.</p><p class="hint">Do not add your service_role key to this website.</p>`;
      return;
    }
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) toast(error.message);
    if (session?.user) showApp(session.user); else showAuth();
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) showApp(session.user); else showAuth();
    });
  }
  $("authForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("authEmail").value.trim(), password = $("authPassword").value;
    setBusy($("signInBtn"), true, "Sign in");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast("Signed in.");
    } catch (err) { toast(err.message); }
    finally { setBusy($("signInBtn"), false, "Sign in"); }
  });
  $("signUpBtn").addEventListener("click", async () => {
    if (!supabase) return;
    const email = $("authEmail").value.trim(), password = $("authPassword").value;
    if (!email || password.length < 6) { toast("Enter an email and a password of at least 6 characters."); return; }
    setBusy($("signUpBtn"), true, "Create account");
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
      if (error) throw error;
      toast(data.session ? "Account created." : "Account created. Check your email to confirm it.");
    } catch (err) { toast(err.message); }
    finally { setBusy($("signUpBtn"), false, "Create account"); }
  });
  $("logoutBtn").addEventListener("click", async () => { const {error} = await supabase.auth.signOut(); if (error) toast(error.message); else toast("Signed out."); });
  $("newReminderBtn").addEventListener("click", openCreate);
  $("emptyCreateBtn").addEventListener("click", openCreate);
  $("closeDialogBtn").addEventListener("click", () => dialog.close());
  $("cancelBtn").addEventListener("click", () => dialog.close());
  $("addTimeBtn").addEventListener("click", () => {
    if ($("timesList").children.length >= 10) { toast("You can add up to 10 times per reminder in this version."); return; }
    renderTimeRow("12:00");
  });
  $("reminderIcon").addEventListener("change", () => {
    const file = $("reminderIcon").files?.[0]; if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast("Unsupported image type. Use PNG, JPG, WebP or SVG."); $("reminderIcon").value = ""; return; }
    if (file.size > cfg.MAX_ICON_BYTES) { toast("Image is too large. Maximum size is 1 MB."); $("reminderIcon").value = ""; return; }
    selectedFile = file; removeExistingIcon = false;
    const reader = new FileReader(); reader.onload = () => $("iconPreview").src = reader.result; reader.readAsDataURL(file);
  });
  $("removeIconBtn").addEventListener("click", () => {
    selectedFile = null; removeExistingIcon = true; $("reminderIcon").value = ""; $("iconPreview").src = DEFAULT_ICON;
  });
  reminderForm.addEventListener("submit", saveReminder);
  $("reminderList").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]"); if (!btn) return;
    try {
      if (btn.dataset.action === "edit") await openEdit(btn.dataset.id);
      if (btn.dataset.action === "toggle") await toggleReminder(btn.dataset.id);
      if (btn.dataset.action === "delete") await deleteReminder(btn.dataset.id);
    } catch (err) { toast(err.message || "Action failed."); }
  });
  init().catch(err => { console.error(err); toast("App initialization failed."); });
})();
