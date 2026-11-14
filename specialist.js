const session = guard("mutaxassis");
if (session) {
  topbar(session);
  const form = $("proposalForm");
  fillSelect($("direction"), DIRECTIONS);
  fillSelect($("level"), LEVELS);

  function fillEntrepreneurs() {
    const list = read(DB.users).filter((u) => u.role === "tadbirkor");
    const sel = $("to"), cur = sel.value;
    sel.replaceChildren(
      option("", list.length ? "Tadbirkorni tanlang" : "Hozircha tadbirkorlar yo‘q"),
      ...(list.length ? [option("all", "Hammasi (barcha tadbirkorlar)")] : []),
      ...list.map((u) => option(String(u.id), u.name)));
    sel.value = cur === "all" && list.length || list.some((u) => String(u.id) === cur) ? cur : "";
  }
  fillEntrepreneurs();

  $("text").addEventListener("input", () => { $("count").textContent = $("text").value.length; });

  $("budget").addEventListener("input", (e) => {
    const d = digitsOf(e.target.value).slice(0, 12);
    e.target.value = d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    $("status").textContent = "";
    const ok = validate(form, {
      to: (v) => (v ? "" : "Taklif yuboriladigan tadbirkorni tanlang."),
      title: (v) => (v.trim().length < 5 ? "Sarlavha kamida 5 ta belgidan iborat bo‘lsin." : ""),
      text: (v) => (v.trim().length < 30 ? "Taklifni kamida 30 ta belgi bilan tavsiflang." : ""),
      budget: (v) => (Number(digitsOf(v)) >= 1000 ? "" : "Byudjetni so‘mda yozing (kamida 1 000)."),
      contact: (v) => (isContact(v.trim()) ? "" : "Telefon raqam yoki @username yozing."),
    }, data);
    if (!ok) return;

    const toAll = data.to === "all";
    const target = toAll ? { id: undefined, name: "Hammasi" } : read(DB.users).find((u) => String(u.id) === data.to);
    if (!target) { $("status").textContent = "Tanlangan tadbirkor topilmadi."; fillEntrepreneurs(); return; }
    const all = read(DB.proposals);
    all.unshift({
      id: Date.now(), ownerId: session.id, name: session.name,
      tadbirkorId: target.id, tadbirkorName: target.name,
      direction: data.direction, level: data.level,
      title: data.title.trim(), budget: Number(digitsOf(data.budget)), text: data.text.trim(), contact: data.contact.trim(),
      date: new Date().toLocaleDateString("uz-UZ"), status: "Yangi", note: "",
    });
    if (!write(DB.proposals, all)) { $("status").textContent = "Saqlashda xatolik yuz berdi."; return; }
    form.reset();
    $("count").textContent = "0";
    $("status").textContent = "Taklif yuborildi. Rahmat!";
    render();
  });

  function card(p) {
    const li = el("li", "item st-" + CLASS[p.status]);
    const top = el("div", "item-top");
    top.append(el("span", "tag", p.direction), el("span", "", p.level), el("span", "", p.date));
    if (p.budget) top.append(el("span", "budget", money(p.budget)));
    if (p.tadbirkorName) top.append(el("span", "", "Kimga: " + p.tadbirkorName));
    const foot = el("div", "item-foot");
    foot.append(el("span", "badge st-" + CLASS[p.status], p.status));
    if (p.status === "Qabul qilindi" && p.acceptedByName) foot.append(el("span", "", "Qabul qildi: " + p.acceptedByName));
    const del = el("button", "del", "O‘chirish");
    del.type = "button";
    del.addEventListener("click", () => {
      if (!confirm("Bu taklifni o‘chirasizmi?")) return;
      write(DB.proposals, read(DB.proposals).filter((x) => x.id !== p.id));
      render();
    });
    foot.append(del);
    li.append(top, el("h3", "", p.title), el("p", "", p.text), foot);
    return li;
  }

  function render() {
    const mine = read(DB.proposals).filter((p) => p.ownerId === session.id).map((p) => ({ status: "Yangi", ...p }));
    $("total").textContent = mine.length;
    $("list").replaceChildren(...mine.map(card));
    $("empty").hidden = mine.length > 0;
  }
  render();
  window.addEventListener("storage", (e) => {
    if (e.key === DB.proposals) render();
    if (e.key === DB.users) fillEntrepreneurs();
  });
}