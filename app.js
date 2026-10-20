const rail = document.getElementById("rail-nav");
const dock = document.getElementById("dock");
const bg = document.getElementById("bg");
const stage = document.getElementById("stage");
const viewport = document.getElementById("contenido");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-label");
const railLogo = document.getElementById("rail-logo");
const mailFab = document.getElementById("mail-fab");

let sections = [];
let meta = {};
let current = "inicio";

function navSections() {
  return sections.filter((section) => section.visible !== false);
}

function indexOf(id) {
  return navSections().findIndex((section) => section.id === id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function safeUrl(url) {
  const value = String(url || "").trim();
  if (!value || /^(javascript|data):/i.test(value)) return "";
  return value;
}

function statement(lead, accent) {
  const heading = el("h3", "statement");
  const text = String(lead || "").trim();
  if (text) heading.append(document.createTextNode(`${text} `));
  if (accent) {
    const em = document.createElement("em");
    em.textContent = accent;
    heading.append(em);
  }
  return heading;
}

function actionButton(action) {
  const button = el("button", action.style === "line" ? "btn btn-line" : "btn btn-gold", action.label || "Abrir");
  button.type = "button";
  button.dataset.go = action.go || "contacto";
  if (action.topic) button.dataset.topic = action.topic;
  return button;
}

function actionRow(actions, className) {
  const row = el("div", className);
  (actions || []).forEach((action) => row.append(actionButton(action)));
  return row;
}

function card(item) {
  const article = el("article", "card");
  article.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
  return article;
}

function panelShell(section) {
  const article = el("article", "panel");
  article.dataset.panel = section.id;
  article.hidden = true;
  const header = el("header", "panel__top");
  const titles = el("div");
  titles.append(el("p", "code", section.code || ""), el("h2", "", section.title || section.label || ""));
  const close = el("button", "icon-btn", "×");
  close.type = "button";
  close.dataset.close = "";
  close.setAttribute("aria-label", "Cerrar apartado");
  header.append(titles, close);
  const hint = el("p", "hint");
  const prev = el("button");
  const next = el("button");
  prev.type = "button";
  next.type = "button";
  prev.dataset.prevLabel = "";
  next.dataset.nextLabel = "";
  hint.append(prev, next, el("span", "", "Esc cerrar"));
  article.append(header, hint);
  return article;
}

function fillIntro(body, section) {
  body.append(el("p", "eyebrow", section.eyebrow || ""));
  body.append(statement(section.statement, section.accent));
  (section.decks || []).forEach((deck) => body.append(el("p", "deck", deck)));
}

function renderHero(section) {
  const hero = el("section", "hero");
  hero.dataset.panel = section.id;
  hero.setAttribute("aria-labelledby", "hero-title");
  const logo = document.createElement("img");
  logo.className = "hero__logo";
  logo.src = safeUrl(meta.logo) || "logo.png";
  logo.alt = meta.logoAlt || "Delta";
  const title = el("h1");
  title.id = "hero-title";
  title.append(document.createTextNode(section.titleLead || ""));
  title.append(document.createElement("br"));
  const accent = el("span", "", section.titleAccent || "");
  title.append(accent);
  hero.append(logo, el("p", "eyebrow", section.eyebrow || ""), title, el("p", "hero__lead", section.lead || ""));
  hero.append(actionRow(section.actions, "hero__actions"));
  return hero;
}

function renderMedia(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("div", "energy-list");
  (section.items || []).forEach((item) => {
    const block = el("article", "energy");
    if (safeUrl(item.image)) {
      const image = document.createElement("img");
      image.src = safeUrl(item.image);
      image.alt = item.alt || "";
      block.append(image);
    }
    const copy = el("div");
    copy.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    const points = el("ul");
    (item.points || []).filter(Boolean).forEach((point) => points.append(el("li", "", point)));
    copy.append(points);
    block.append(copy);
    list.append(block);
  });
  body.append(list, actionRow(section.actions, "panel__actions"));
  article.append(body);
  return article;
}

function renderCards(section, listClass) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("div", listClass);
  (section.items || []).forEach((item) => list.append(card(item)));
  body.append(list);
  article.append(body);
  return article;
}

function renderSplit(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body split");
  const copy = el("div");
  copy.append(el("p", "eyebrow", section.eyebrow || ""), statement(section.statement, section.accent));
  (section.decks || []).forEach((deck) => copy.append(el("p", "deck", deck)));
  const list = el("ol", "principles");
  (section.items || []).forEach((item) => {
    const li = el("li");
    li.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    list.append(li);
  });
  body.append(copy, list);
  article.append(body);
  return article;
}

function renderFleet(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("div", "fleet");
  (section.items || []).forEach((item) => {
    const block = document.createElement("article");
    block.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    list.append(block);
  });
  body.append(list);
  article.append(body);
  return article;
}

function renderProjects(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("div", "projects");
  (section.items || []).forEach((item) => {
    const block = el("article", item.lead ? "project project--lead" : "project");
    if (safeUrl(item.image)) {
      const image = document.createElement("img");
      image.src = safeUrl(item.image);
      image.alt = item.alt || "";
      block.append(image);
    }
    const copy = el("div");
    copy.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    block.append(copy);
    list.append(block);
  });
  body.append(list);
  article.append(body);
  return article;
}

function renderSteps(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("ol", "steps");
  (section.items || []).forEach((item) => {
    const li = el("li");
    li.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    list.append(li);
  });
  body.append(list);
  article.append(body);
  return article;
}

function renderLines(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("div", "lines");
  (section.items || []).forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.go = "contacto";
    if (item.topic) button.dataset.topic = item.topic;
    button.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    list.append(button);
  });
  body.append(list);
  article.append(body);
  return article;
}

function renderSheets(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body");
  fillIntro(body, section);
  const list = el("ul", "sheets");
  (section.items || []).forEach((item) => {
    const li = el("li");
    const copy = el("div");
    copy.append(el("p", "code", item.code || ""), el("h4", "", item.title || ""), el("p", "", item.text || ""));
    const button = el("button", "btn btn-line", item.cta || "Pedir");
    button.type = "button";
    button.dataset.go = "contacto";
    if (item.topic) button.dataset.topic = item.topic;
    li.append(copy, button);
    list.append(li);
  });
  body.append(list);
  article.append(body);
  return article;
}

function renderContact(section) {
  const article = panelShell(section);
  const body = el("div", "panel__body contact");
  const copy = el("div");
  copy.append(el("p", "eyebrow", section.eyebrow || ""), statement(section.statement, section.accent));
  (section.decks || []).forEach((deck) => copy.append(el("p", "deck", deck)));
  const facts = el("dl", "facts");
  (section.facts || []).forEach((fact) => {
    const row = el("div");
    const dd = el("dd");
    const href = safeUrl(fact.href);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = fact.value || "";
      dd.append(link);
    } else {
      dd.textContent = fact.value || "";
    }
    row.append(el("dt", "", fact.label || ""), dd);
    facts.append(row);
  });
  copy.append(facts);

  const fields = section.fields || {};
  const form = document.createElement("form");
  form.id = "expediente";
  form.noValidate = true;
  form.append(labeledInput(fields.nombre || "Nombre", "nombre", "text", "name", true));
  form.append(labeledInput(fields.empresa || "Empresa", "empresa", "text", "organization", false));
  const row = el("div", "form-row");
  row.append(
    labeledInput(fields.correo || "Correo", "correo", "email", "email", true),
    labeledInput(fields.telefono || "Teléfono", "telefono", "tel", "tel", false),
  );
  form.append(row);
  const frenteLabel = el("label", "", fields.frente || "Frente");
  const select = document.createElement("select");
  select.name = "frente";
  select.id = "frente";
  select.required = true;
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = section.emptyOption || "Selecciona";
  select.append(empty);
  (section.options || []).forEach((option) => {
    const node = document.createElement("option");
    node.textContent = option;
    select.append(node);
  });
  frenteLabel.append(select);
  const messageLabel = el("label", "", fields.mensaje || "Mensaje");
  const textarea = document.createElement("textarea");
  textarea.name = "mensaje";
  textarea.rows = 4;
  textarea.required = true;
  textarea.placeholder = section.placeholder || "";
  messageLabel.append(textarea);
  const error = el("p", "form-error", section.error || "");
  error.id = "form-error";
  error.hidden = true;
  const submit = el("button", "btn btn-gold", section.submit || "Enviar");
  submit.type = "submit";
  const ok = el("p", "form-ok", section.ok || "");
  ok.id = "form-ok";
  ok.hidden = true;
  form.append(frenteLabel, messageLabel, error, submit, ok);
  body.append(copy, form);
  article.append(body);
  return article;
}

function labeledInput(label, name, type, autocomplete, required) {
  const wrap = el("label", "", label);
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.autocomplete = autocomplete;
  input.required = required;
  wrap.append(input);
  return wrap;
}

function renderSection(section) {
  if (section.kind === "hero") return renderHero(section);
  if (section.kind === "media") return renderMedia(section);
  if (section.kind === "cards") return renderCards(section, "cards");
  if (section.kind === "split") return renderSplit(section);
  if (section.kind === "fleet") return renderFleet(section);
  if (section.kind === "projects") return renderProjects(section);
  if (section.kind === "steps") return renderSteps(section);
  if (section.kind === "lines") return renderLines(section);
  if (section.kind === "sheets") return renderSheets(section);
  if (section.kind === "contact") return renderContact(section);
  return renderCards(section, "cards");
}

function buttonFor(section, className, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.nav = section.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = label;
  button.addEventListener("click", () => openSection(section.id));
  return button;
}

function paintSite() {
  const list = navSections();
  rail.replaceChildren();
  dock.replaceChildren();
  viewport.replaceChildren();
  list.forEach((section) => {
    rail.append(
      buttonFor(section, "rail__btn", `<span class="num">${section.num}</span><span></span>`),
    );
    rail.lastElementChild.querySelector("span:last-child").textContent = section.label;
    dock.append(
      buttonFor(section, "dock__btn", `<span class="num">${section.num}</span><span class="dock__label"></span>`),
    );
    dock.lastElementChild.querySelector(".dock__label").textContent = section.label;
    viewport.append(renderSection(section));
  });
  viewport.querySelectorAll(".panel__body").forEach((body) => {
    body.append(el("p", "panel__foot", meta.footer || ""));
  });
  if (railLogo) {
    railLogo.src = safeUrl(meta.logo) || "logo.png";
    railLogo.alt = meta.logoAlt || "Delta";
  }
  if (mailFab) mailFab.setAttribute("aria-label", meta.mailLabel || "Escribir a Delta");
  if (meta.title) document.title = meta.title;
  const description = document.querySelector('meta[name="description"]');
  if (description && meta.description) description.content = meta.description;
  bindSite();
}

function openSection(id, { updateHash = true, immediate = false } = {}) {
  const list = navSections();
  if (!list.some((section) => section.id === id)) id = list[0]?.id || "inicio";
  current = id;
  const section = list[indexOf(id)];
  if (!section) return;

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const open = panel.dataset.panel === id;
    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
  });
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const active = button.dataset.nav === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  stage.dataset.section = id;
  const paint = () => {
    const image = safeUrl(section.image);
    bg.style.backgroundImage = image ? `url("${image}")` : "";
    bg.classList.remove("is-fading");
  };
  if (immediate) paint();
  else {
    bg.classList.add("is-fading");
    window.setTimeout(paint, 180);
  }

  const prev = list[(indexOf(id) + list.length - 1) % list.length];
  const next = list[(indexOf(id) + 1) % list.length];
  document.querySelectorAll("[data-prev-label]").forEach((node) => {
    node.textContent = `← ${prev.label}`;
    node.onclick = () => openSection(prev.id);
  });
  document.querySelectorAll("[data-next-label]").forEach((node) => {
    node.textContent = `${next.label} →`;
    node.onclick = () => openSection(next.id);
  });

  const panel = document.querySelector(`[data-panel="${id}"]`);
  if (panel) panel.scrollTop = 0;
  const activeDock = dock.querySelector(`[data-nav="${id}"]`);
  if (activeDock && getComputedStyle(dock).display !== "none") {
    activeDock.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }
  if (updateHash) {
    const search = location.search;
    const nextUrl = id === list[0].id ? `${location.pathname}${search}` : `${location.pathname}${search}#${id}`;
    history.replaceState(null, "", nextUrl);
  }
}

function bindSite() {
  document.querySelectorAll("[data-go]").forEach((node) => {
    node.addEventListener("click", () => {
      const frente = document.getElementById("frente");
      if (node.dataset.topic && frente) frente.value = node.dataset.topic;
      openSection(node.dataset.go);
    });
  });
  document.querySelectorAll("[data-close]").forEach((node) => {
    node.addEventListener("click", () => openSection(navSections()[0]?.id || "inicio"));
  });
  const form = document.getElementById("expediente");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
    const correo = String(data.get("correo") || "").trim();
    const mensaje = String(data.get("mensaje") || "").trim();
    const frenteValue = String(data.get("frente") || "").trim();
    const valid = nombre && correo.includes("@") && mensaje && frenteValue;
    document.getElementById("form-error").hidden = valid;
    document.getElementById("form-ok").hidden = !valid;
    if (!valid) return;
    form.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = true;
    });
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = theme === "light";
  themeToggle.setAttribute("aria-pressed", String(light));
  themeLabel.textContent = light ? "Activar tema oscuro" : "Activar tema claro";
  localStorage.setItem("delta-theme", theme);
}

themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});
applyTheme(localStorage.getItem("delta-theme") === "light" ? "light" : "dark");

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  const list = navSections();
  if (!list.length) return;
  if (event.key === "Escape") openSection(list[0].id);
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    openSection(list[(indexOf(current) + 1) % list.length].id);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    openSection(list[(indexOf(current) + list.length - 1) % list.length].id);
  }
});

window.addEventListener("hashchange", () => {
  openSection(location.hash.replace("#", "") || navSections()[0]?.id, { updateHash: false });
});

async function loadContent() {
  const params = new URLSearchParams(location.search);
  if (params.has("preview")) {
    const raw = sessionStorage.getItem("delta-preview");
    if (raw) return JSON.parse(raw);
  }
  const response = await fetch("content.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("content");
  return response.json();
}

loadContent()
  .then((content) => {
    meta = content.meta || {};
    sections = Array.isArray(content.sections) ? content.sections : [];
    paintSite();
    const start = location.hash.replace("#", "");
    const list = navSections();
    openSection(list.some((section) => section.id === start) ? start : list[0]?.id, {
      updateHash: false,
      immediate: true,
    });
  })
  .catch(() => {
    viewport.append(el("p", "boot", "No se pudo cargar el contenido del sitio."));
  });
