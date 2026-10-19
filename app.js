const SECTIONS = [
  {
    id: "inicio",
    num: "01",
    label: "Inicio",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "energias",
    num: "02",
    label: "Energías",
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "servicios",
    num: "03",
    label: "Servicios",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "nosotros",
    num: "04",
    label: "Nosotros",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "flota",
    num: "05",
    label: "Flota",
    image:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "proyectos",
    num: "06",
    label: "Proyectos",
    image:
      "https://images.unsplash.com/photo-1590494165264-1ebe3602eb80?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "metodo",
    num: "07",
    label: "Método",
    image:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "lineas",
    num: "08",
    label: "Líneas",
    image:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "fichas",
    num: "09",
    label: "Fichas",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=70",
  },
  {
    id: "contacto",
    num: "10",
    label: "Contacto",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=70",
  },
];

const rail = document.getElementById("rail-nav");
const dock = document.getElementById("dock");
const bg = document.getElementById("bg");
const stage = document.getElementById("stage");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-label");
const form = document.getElementById("expediente");
const formError = document.getElementById("form-error");
const formOk = document.getElementById("form-ok");
const frente = document.getElementById("frente");

let current = "inicio";

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

SECTIONS.forEach((section) => {
  rail.append(
    buttonFor(
      section,
      "rail__btn",
      `<span class="num">${section.num}</span><span>${section.label}</span>`,
    ),
  );
  dock.append(
    buttonFor(section, "dock__btn", `<span>${section.num} ${section.label}</span>`),
  );
});

document.querySelectorAll(".panel__body").forEach((body) => {
  const foot = document.createElement("p");
  foot.className = "panel__foot";
  foot.textContent = "Delta · Proyectos y servicios · Guatemala · hola@delta.gt";
  body.append(foot);
});

function indexOf(id) {
  return SECTIONS.findIndex((section) => section.id === id);
}

function openSection(id, { updateHash = true, immediate = false } = {}) {
  if (!SECTIONS.some((section) => section.id === id)) id = "inicio";
  current = id;
  const section = SECTIONS[indexOf(id)];

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
    bg.style.backgroundImage = `url("${section.image}")`;
    bg.classList.remove("is-fading");
  };
  if (immediate) {
    paint();
  } else {
    bg.classList.add("is-fading");
    window.setTimeout(paint, 180);
  }

  const prev = SECTIONS[(indexOf(id) + SECTIONS.length - 1) % SECTIONS.length];
  const next = SECTIONS[(indexOf(id) + 1) % SECTIONS.length];
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
    history.replaceState(null, "", id === "inicio" ? location.pathname : `#${id}`);
  }
}

document.querySelectorAll("[data-go]").forEach((node) => {
  node.addEventListener("click", () => {
    const topic = node.dataset.topic;
    if (topic && frente) frente.value = topic;
    openSection(node.dataset.go);
  });
});

document.querySelectorAll("[data-close]").forEach((node) => {
  node.addEventListener("click", () => openSection("inicio"));
});

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (event.key === "Escape") {
    openSection("inicio");
  } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    openSection(SECTIONS[(indexOf(current) + 1) % SECTIONS.length].id);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    openSection(SECTIONS[(indexOf(current) + SECTIONS.length - 1) % SECTIONS.length].id);
  }
});

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

const stored = localStorage.getItem("delta-theme");
applyTheme(stored === "light" || stored === "dark" ? stored : "dark");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const nombre = String(data.get("nombre") || "").trim();
  const correo = String(data.get("correo") || "").trim();
  const mensaje = String(data.get("mensaje") || "").trim();
  const frenteValue = String(data.get("frente") || "").trim();
  const valid = nombre && correo.includes("@") && mensaje && frenteValue;
  formError.hidden = valid;
  formOk.hidden = !valid;
  if (!valid) return;
  form.querySelectorAll("input, select, textarea, button").forEach((field) => {
    field.disabled = true;
  });
});

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  openSection(id || "inicio", { updateHash: false });
});

const start = location.hash.replace("#", "");
openSection(SECTIONS.some((section) => section.id === start) ? start : "inicio", {
  updateHash: false,
  immediate: true,
});
