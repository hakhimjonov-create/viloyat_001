const form = $("authForm");
let role = "mutaxassis";
let mode = "login"; // login | register

const s0 = getSession();
if (s0) location.replace(home(s0.role));

function render() {
  const register = mode === "register";
  $("nameField").hidden = !register;
  $("nameLabel").textContent = role === "tadbirkor" ? "Ism yoki kompaniya nomi" : "Ism va familiya";
  $("formTitle").textContent = register ? "Ro‘yxatdan o‘tish" : "Kirish";
  $("submitBtn").textContent = register ? "Akkaunt yaratish" : "Kirish";
  $("loginLabel").textContent = "Telefon yoki email";
  $("pass").autocomplete = register ? "new-password" : "current-password";
  $("switchLine").firstChild.textContent = register ? "Akkauntingiz bormi? " : "Akkauntingiz yo‘qmi? ";
  $("switchBtn").textContent = register ? "Kiring" : "Ro‘yxatdan o‘ting";
  form.querySelectorAll(".error").forEach((e) => { e.textContent = ""; e.parentElement.classList.remove("invalid"); });
}

document.querySelectorAll(".segmented button").forEach((b) =>
  b.addEventListener("click", () => {
    role = b.dataset.role;
    mode = "login";
    document.querySelectorAll(".segmented button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  })
);
$("switchBtn").addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  render();
});

function fail(field, msg) {
  const err = form.querySelector(`.error[data-for="${field}"]`);
  err.textContent = msg;
  err.parentElement.classList.add("invalid");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const login = (data.login || "").trim().toLowerCase();
  const users = read(DB.users);

  if (mode === "register") {
    const ok = validate(form, {
      name: (v) => (v.trim().length < 3 ? (role === "tadbirkor" ? "Ism yoki kompaniya nomini yozing." : "Ism va familiyangizni yozing.") : ""),
      login: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) || /^\+?[\d\s()-]{9,}$/.test(v.trim()) ? "" : "Telefon raqam yoki email yozing."),
      pass: (v) => (v.length < 6 ? "Parol kamida 6 ta belgidan iborat bo‘lsin." : ""),
    }, data);
    if (!ok) return;
    if (users.some((u) => u.login === login)) return fail("login", "Bu login bilan akkaunt bor. Kirishga o‘ting.");
    const user = { id: Date.now(), role, name: data.name.trim(), login, pass: data.pass };
    users.push(user);
    write(DB.users, users);
    setSession({ role, id: user.id, name: user.name });
    location.href = home(role);
    return;
  }

  const ok = validate(form, { login: (v) => (v.trim() ? "" : "Telefon yoki emailni yozing."), pass: (v) => (v ? "" : "Parolni yozing.") }, data);
  if (!ok) return;
  const user = users.find((u) => u.login === login && u.pass === data.pass);
  if (!user) return fail("pass", "Login yoki parol noto‘g‘ri.");
  const userRole = user.role || "mutaxassis";
  if (userRole !== role) {
    return fail("login", userRole === "tadbirkor"
      ? "Bu tadbirkor akkaunti. Yuqoridan «Tadbirkor» ni tanlang."
      : "Bu mutaxassis akkaunti. Yuqoridan «Mutaxassis» ni tanlang.");
  }
  setSession({ role: userRole, id: user.id, name: user.name });
  location.href = home(userRole);
});

render();