// Umumiy funksiyalar: saqlash, seans, tekshiruv
// DIQQAT: bu demo. Parollar brauzerda saqlanadi, haqiqiy loyihada server kerak.
const DB = { users: "mx_users", proposals: "takliflar", session: "mx_session" };
const DIRECTIONS = ["IT va dasturlash", "Dizayn", "Marketing va SMM", "Moliya va buxgalteriya", "Huquq", "Muhandislik va ishlab chiqarish", "Ta’lim va treninglar", "Boshqa"];
const LEVELS = ["Talaba", "1 yilgacha", "1–3 yil", "3 yildan ko‘p"];
const STATUSES = ["Yangi", "Ko‘rib chiqilmoqda", "Qabul qilindi", "Rad etildi"];
const CLASS = { "Yangi": "yangi", "Ko‘rib chiqilmoqda": "korish", "Qabul qilindi": "qabul", "Rad etildi": "rad" };

const $ = (id) => document.getElementById(id);

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(DB.session)); } catch (e) { return null; }
}
function setSession(s) { sessionStorage.setItem(DB.session, JSON.stringify(s)); }
function home(role) { return role === "tadbirkor" ? "admin.html" : "specialist.html"; }
function guard(role) {
  const s = getSession();
  if (!s || s.role !== role) { location.replace("index.html"); return null; }
  return s;
}
function logout() { sessionStorage.removeItem(DB.session); location.href = "index.html"; }

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function option(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label || value;
  return o;
}
function fillSelect(sel, values) { sel.replaceChildren(...values.map((v) => option(v))); }

// rules: { maydon: (qiymat) => xato matni yoki "" }
function validate(form, rules, data) {
  let ok = true;
  Object.keys(rules).forEach((name) => {
    const msg = rules[name](data[name] || "");
    const err = form.querySelector(`.error[data-for="${name}"]`);
    err.textContent = msg;
    err.parentElement.classList.toggle("invalid", !!msg);
    if (msg) ok = false;
  });
  return ok;
}

const digitsOf = (t) => String(t || "").replace(/\D/g, "");
const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";

const isContact = (t) => /^\+?[\d\s()-]{9,}$/.test(t) || /^@[A-Za-z0-9_]{4,}$/.test(t);

function contactLink(contact) {
  const a = el("a", "", contact);
  if (contact.startsWith("@")) {
    a.href = "https://t.me/" + contact.slice(1);
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.href = "tel:" + contact.replace(/[^\d+]/g, "");
  }
  return a;
}

function topbar(session) {
  const bar = el("header", "topbar");
  bar.append(el("span", "brand", "Mutaxassislar takliflari"));
  const who = el("div", "who");
  const out = el("button", "btn ghost small", "Chiqish");
  out.type = "button";
  out.addEventListener("click", logout);
  who.append(el("span", "", session.name), out);
  bar.append(who);
  document.body.prepend(bar);
}