const session = guard("tadbirkor");
if (session) {
  topbar(session);
  let proposals = [];

  // Faqat shu tadbirkorga yuborilgan takliflar (eski, egasiz takliflar hammaga ko‘rinadi)
  // Boshqa tadbirkor qabul qilgan taklif bu yerda ko‘rinmaydi
  const mine = (p) => (!p.tadbirkorId || p.tadbirkorId === session.id) && (!p.acceptedById || p.acceptedById === session.id);

  function setStatus(p, status) {
    p.status = status;
    if (status === "Qabul qilindi") { p.acceptedById = session.id; p.acceptedByName = session.name; }
    else { delete p.acceptedById; delete p.acceptedByName; }
  }

  function accept(p) {
    // Eng so‘nggi holatni tekshiramiz: boshqa tadbirkor allaqachon olgan bo‘lishi mumkin
    const fresh = read(DB.proposals).find((x) => x.id === p.id);
    if (fresh && fresh.acceptedById && fresh.acceptedById !== session.id) {
      alert("Bu taklifni boshqa tadbirkor allaqachon qabul qilgan.");
      return refresh();
    }
    setStatus(p, "Qabul qilindi");
    save();
    refresh();
  }
  const save = () => {
    const others = read(DB.proposals).filter((p) => !mine(p));
    write(DB.proposals, [...proposals, ...others].sort((a, b) => b.id - a.id));
  };

  function fillFilters() {
    const dSel = $("fDirection"), sSel = $("fStatus");
    const dCur = dSel.value, sCur = sSel.value;
    const dirs = [...new Set(proposals.map((p) => p.direction))];
    dSel.replaceChildren(option("", "Barcha yo‘nalishlar"), ...dirs.map((d) => option(d)));
    sSel.replaceChildren(option("", "Barcha holatlar"), ...STATUSES.map((s) => option(s)));
    dSel.value = dirs.includes(dCur) ? dCur : "";
    sSel.value = sCur;
  }

  function filtered() {
    const q = $("search").value.trim().toLowerCase();
    const d = $("fDirection").value, s = $("fStatus").value;
    return proposals.filter((p) =>
      (!d || p.direction === d) && (!s || p.status === s) &&
      (!q || [p.name, p.title, p.text].join(" ").toLowerCase().includes(q)));
  }

  function renderStats() {
    const items = [["Jami takliflar", proposals.length, ""]].concat(
      STATUSES.map((s) => [s, proposals.filter((p) => p.status === s).length, "st-" + CLASS[s]]));
    $("stats").replaceChildren(...items.map(([label, n, cls]) => {
      const box = el("div", "stat " + cls);
      box.append(el("b", "", String(n)), el("span", "", label));
      return box;
    }));
  }

  function renderBars() {
    const counts = {};
    proposals.forEach((p) => { counts[p.direction] = (counts[p.direction] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    $("bars").replaceChildren(...(entries.length ? entries : []).map(([dir, n]) => {
      const bar = el("div", "bar");
      const meta = el("div", "meta");
      meta.append(el("span", "", dir), el("b", "", String(n)));
      const track = el("div", "track");
      const fill = el("div", "fill");
      fill.style.width = (n / max) * 100 + "%";
      track.append(fill);
      bar.append(meta, track);
      return bar;
    }));
    if (!entries.length) $("bars").append(el("p", "hint", "Ma’lumot yo‘q"));
  }

  function card(p) {
    const li = el("li", "item st-" + CLASS[p.status]);
    const top = el("div", "item-top");
    top.append(el("span", "tag", p.direction), el("span", "", p.level), el("span", "", p.date));
    if (p.budget) top.append(el("span", "budget", money(p.budget)));

    const meta = el("div", "item-meta");
    const sel = el("select", "state");
    sel.setAttribute("aria-label", "Holat");
    STATUSES.forEach((s) => sel.append(option(s)));
    sel.value = p.status;
    sel.addEventListener("change", () => { setStatus(p, sel.value); save(); refresh(); });
    const note = el("textarea", "note");
    note.rows = 1;
    note.placeholder = "Shaxsiy eslatma (mutaxassis ko‘rmaydi)";
    note.value = p.note;
    note.setAttribute("aria-label", "Eslatma");
    note.addEventListener("change", () => { p.note = note.value; save(); });
    meta.append(sel, note);

    const foot = el("div", "item-foot");
    const who = el("span", "", p.name + " — ");
    who.append(contactLink(p.contact));
    const del = el("button", "del", "O‘chirish");
    del.type = "button";
    del.addEventListener("click", () => {
      if (!confirm("Bu taklifni o‘chirasizmi?")) return;
      proposals = proposals.filter((x) => x.id !== p.id);
      save();
      refresh();
    });
    const acts = el("div", "actions");
    const acc = el("button", "btn small", p.status === "Qabul qilindi" ? "Qabul qilingan" : "Qabul qilish");
    acc.type = "button";
    acc.disabled = p.status === "Qabul qilindi";
    acc.addEventListener("click", () => accept(p));
    acts.append(acc, del);
    foot.append(who, acts);

    li.append(top, el("h3", "", p.title), el("p", "", p.text), meta, foot);
    return li;
  }

  function renderList() {
    const shown = filtered();
    $("list").replaceChildren(...shown.map(card));
    $("empty").hidden = shown.length > 0;
    $("empty").textContent = proposals.length
      ? "Bu filtrlarga mos taklif topilmadi."
      : "Hozircha takliflar yo‘q. Mutaxassislar yuborgan takliflar shu yerda chiqadi.";
  }

  function refresh() {
    proposals = read(DB.proposals).filter(mine).map((p) => ({ status: "Yangi", note: "", ...p }));
    fillFilters();
    renderStats();
    renderBars();
    renderList();
  }

  ["search", "fDirection", "fStatus"].forEach((id) => $(id).addEventListener("input", renderList));
  window.addEventListener("storage", (e) => { if (e.key === DB.proposals) refresh(); });

  $("exportBtn").addEventListener("click", () => {
    const cols = ["date", "name", "direction", "level", "budget", "title", "text", "contact", "status", "note"];
    const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const rows = [cols.join(",")].concat(filtered().map((p) => cols.map((c) => esc(p[c])).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "takliflar.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  refresh();
}