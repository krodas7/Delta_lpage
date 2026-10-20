const REPO = "krodas7/Delta_lpage";
const BRANCH = "main";
const FILE = "content.json";
const TOKEN_KEY = "delta-admin-token";
const app = document.getElementById("app");

let content = null;
let selected = "meta";
let status = "";
let statusOk = false;
let publishing = false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function field(label, value, onInput, multiline) {
  const wrap = el("label", "field", label);
  const input = document.createElement(multiline ? "textarea" : "input");
  input.value = value || "";
  input.addEventListener("input", () => onInput(input.value));
  wrap.append(input);
  return wrap;
}

function button(label, className, onClick) {
  const node = el("button", className || "btn", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function blankItem(kind) {
  if (kind === "media") {
    return { image: "", alt: "", code: "", title: "Nuevo frente", text: "", points: [] };
  }
  if (kind === "projects") {
    return { lead: false, image: "", alt: "", code: "", title: "Nuevo frente", text: "" };
  }
  if (kind === "lines") return { code: "", title: "Nueva línea", text: "", topic: "" };
  if (kind === "sheets") return { code: "", title: "Nueva ficha", text: "", cta: "Pedir", topic: "" };
  return { code: "", title: "Nuevo módulo", text: "" };
}

function clean(data) {
  const copy = structuredClone(data);
  copy.sections.forEach((section, index) => {
    section.num = String(index + 1).padStart(2, "0");
    section.decks = (section.decks || []).map((item) => item.trim()).filter(Boolean);
    section.items = (section.items || []).map((item) => {
      if (Array.isArray(item.points)) item.points = item.points.map((point) => point.trim()).filter(Boolean);
      return item;
    });
    if (section.kind === "contact") {
      section.options = (section.options || []).map((item) => item.trim()).filter(Boolean);
      section.facts = (section.facts || []).filter((fact) => fact.label || fact.value);
    }
  });
  return copy;
}

async function github(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "No se pudo hablar con GitHub.");
  return payload;
}

function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function publish() {
  publishing = true;
  status = "Publicando…";
  statusOk = true;
  render();
  try {
    const ready = clean(content);
    const body = `${JSON.stringify(ready, null, 2)}\n`;
    let sha = "";
    try {
      const current = await github(`/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`);
      sha = current.sha;
    } catch (error) {
      if (!/Not Found/i.test(error.message)) throw error;
    }
    await github(`/repos/${REPO}/contents/${FILE}`, {
      method: "PUT",
      body: JSON.stringify({
        message: "Actualiza el contenido del sitio desde el administrador.",
        content: encode(body),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    });
    content = ready;
    status = "Publicado. La página tarda cerca de un minuto en mostrar el cambio.";
    statusOk = true;
  } catch (error) {
    status = error.message;
    statusOk = false;
  } finally {
    publishing = false;
    render();
  }
}

function preview() {
  sessionStorage.setItem("delta-preview", JSON.stringify(clean(content)));
  window.open("../?preview=1", "delta-preview");
}

function move(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= content.sections.length) return;
  const [section] = content.sections.splice(index, 1);
  content.sections.splice(next, 0, section);
  selected = section.id;
  render();
}

function renderLogin(message) {
  const gate = el("div", "gate");
  const form = document.createElement("form");
  form.append(el("h1", "", "Administrador"));
  form.append(
    el(
      "p",
      "",
      "La clave es un token de GitHub con permiso de escritura sobre krodas7/Delta_lpage. Solo permanece en esta pestaña.",
    ),
  );
  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "current-password";
  input.required = true;
  input.placeholder = "github_pat_…";
  const wrap = el("label", "field", "Token");
  wrap.append(input);
  const submit = el("button", "btn", "Entrar");
  submit.type = "submit";
  form.append(wrap);
  if (message) form.append(el("p", "error", message));
  form.append(submit, el("p", "hint", "En GitHub: Settings → Developer settings → Fine-grained tokens. Repositorio Delta_lpage, permiso Contents en lectura y escritura."));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    sessionStorage.setItem(TOKEN_KEY, input.value.trim());
    try {
      await github(`/repos/${REPO}`);
      await boot();
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      submit.disabled = false;
      renderLogin(error.message);
    }
  });
  gate.append(form);
  app.replaceChildren(gate);
}

function itemFields(section, item, index) {
  const block = el("article", "block");
  block.append(el("h3", "", `Módulo ${index + 1}`));
  const grid = el("div", "grid");
  grid.append(
    field("Código", item.code, (value) => {
      item.code = value;
    }),
    field("Título", item.title, (value) => {
      item.title = value;
    }),
  );
  block.append(grid, field("Texto", item.text, (value) => {
    item.text = value;
  }, true));
  if (section.kind === "media" || section.kind === "projects") {
    block.append(
      field("Imagen", item.image, (value) => {
        item.image = value;
      }),
      field("Texto alternativo", item.alt, (value) => {
        item.alt = value;
      }),
    );
  }
  if (section.kind === "media") {
    block.append(field("Viñetas, una por línea", (item.points || []).join("\n"), (value) => {
      item.points = value.split("\n");
    }, true));
  }
  if (section.kind === "projects") {
    const check = el("label", "check", "Tarjeta principal");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = Boolean(item.lead);
    box.addEventListener("change", () => {
      item.lead = box.checked;
    });
    check.prepend(box);
    block.append(check);
  }
  if (section.kind === "lines" || section.kind === "sheets") {
    block.append(field("Tema que abre en contacto", item.topic, (value) => {
      item.topic = value;
    }));
  }
  if (section.kind === "sheets") {
    block.append(field("Texto del botón", item.cta, (value) => {
      item.cta = value;
    }));
  }
  block.append(button("Quitar módulo", "btn line", () => {
    section.items.splice(index, 1);
    render();
  }));
  return block;
}

function renderMeta() {
  const work = el("section", "work");
  work.append(el("h2", "", "Sitio"));
  const grid = el("div", "grid");
  grid.append(
    field("Título de la pestaña", content.meta.title, (value) => {
      content.meta.title = value;
    }),
    field("Descripción", content.meta.description, (value) => {
      content.meta.description = value;
    }, true),
    field("Pie de cada apartado", content.meta.footer, (value) => {
      content.meta.footer = value;
    }),
    field("Logo", content.meta.logo, (value) => {
      content.meta.logo = value;
    }),
    field("Texto del logo", content.meta.logoAlt, (value) => {
      content.meta.logoAlt = value;
    }),
    field("Botón de correo", content.meta.mailLabel, (value) => {
      content.meta.mailLabel = value;
    }),
  );
  work.append(grid);
  return work;
}

function renderSection(section) {
  const work = el("section", "work");
  work.append(el("h2", "", section.label || "Apartado"));
  const visible = el("label", "check", "Visible en el índice");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = section.visible !== false;
  box.addEventListener("change", () => {
    section.visible = box.checked;
    render();
  });
  visible.prepend(box);
  work.append(visible);
  const grid = el("div", "grid");
  grid.append(
    field("Nombre en el índice", section.label, (value) => {
      section.label = value;
    }),
    field("Foto de fondo", section.image, (value) => {
      section.image = value;
    }),
  );
  if (section.kind !== "hero") {
    grid.append(
      field("Código", section.code, (value) => {
        section.code = value;
      }),
      field("Título del apartado", section.title, (value) => {
        section.title = value;
      }),
      field("Antetítulo", section.eyebrow, (value) => {
        section.eyebrow = value;
      }),
      field("Titular", section.statement, (value) => {
        section.statement = value;
      }),
      field("Acento en rojo", section.accent, (value) => {
        section.accent = value;
      }),
    );
  } else {
    grid.append(
      field("Antetítulo", section.eyebrow, (value) => {
        section.eyebrow = value;
      }),
      field("Titular", section.titleLead, (value) => {
        section.titleLead = value;
      }),
      field("Acento en rojo", section.titleAccent, (value) => {
        section.titleAccent = value;
      }),
      field("Párrafo", section.lead, (value) => {
        section.lead = value;
      }, true),
    );
  }
  work.append(grid);
  if (section.kind !== "hero") {
    work.append(field("Párrafos, uno por bloque", (section.decks || []).join("\n\n"), (value) => {
      section.decks = value.split("\n\n");
    }, true));
  }
  if (section.kind === "hero" || section.kind === "media") {
    work.append(el("h3", "", "Botones"));
    (section.actions || []).forEach((action, index) => {
      const block = el("article", "block");
      const row = el("div", "grid");
      row.append(
        field("Texto", action.label, (value) => {
          action.label = value;
        }),
        field("Abre el apartado", action.go, (value) => {
          action.go = value;
        }),
        field("Estilo (gold o line)", action.style, (value) => {
          action.style = value === "line" ? "line" : "gold";
        }),
        field("Tema de contacto", action.topic || "", (value) => {
          action.topic = value;
        }),
      );
      block.append(row, button("Quitar botón", "btn line", () => {
        section.actions.splice(index, 1);
        render();
      }));
      work.append(block);
    });
    work.append(button("Agregar botón", "btn line", () => {
      section.actions = section.actions || [];
      section.actions.push({ label: "Nuevo botón", go: "contacto", style: "gold", topic: "" });
      render();
    }));
  }
  if (section.kind === "contact") {
    section.fields = section.fields || {};
    const labels = section.fields;
    const names = el("div", "grid");
    ["nombre", "empresa", "correo", "telefono", "frente", "mensaje"].forEach((key) => {
      names.append(field(key, labels[key], (value) => {
        section.fields[key] = value;
      }));
    });
    work.append(names);
    work.append(
      field("Opciones del frente, una por línea", (section.options || []).join("\n"), (value) => {
        section.options = value.split("\n");
      }, true),
      field("Texto vacío del selector", section.emptyOption, (value) => {
        section.emptyOption = value;
      }),
      field("Ayuda del mensaje", section.placeholder, (value) => {
        section.placeholder = value;
      }),
      field("Error", section.error, (value) => {
        section.error = value;
      }, true),
      field("Confirmación", section.ok, (value) => {
        section.ok = value;
      }, true),
      field("Botón de envío", section.submit, (value) => {
        section.submit = value;
      }),
    );
    (section.facts || []).forEach((fact, index) => {
      const block = el("article", "block");
      const row = el("div", "grid");
      row.append(
        field("Dato", fact.label, (value) => {
          fact.label = value;
        }),
        field("Valor", fact.value, (value) => {
          fact.value = value;
        }),
        field("Enlace", fact.href, (value) => {
          fact.href = value;
        }),
      );
      block.append(row, button("Quitar dato", "btn line", () => {
        section.facts.splice(index, 1);
        render();
      }));
      work.append(block);
    });
    work.append(button("Agregar dato", "btn line", () => {
      section.facts.push({ label: "Nuevo", value: "", href: "" });
      render();
    }));
  }
  if (section.kind !== "hero" && section.kind !== "contact") {
    work.append(el("h3", "", "Módulos"));
    (section.items || []).forEach((item, index) => work.append(itemFields(section, item, index)));
    work.append(button("Agregar módulo", "btn line", () => {
      section.items = section.items || [];
      section.items.push(blankItem(section.kind));
      render();
    }));
  }
  if (content.sections.length > 1) {
    work.append(button("Quitar apartado", "btn line", () => {
      if (!window.confirm(`¿Quitar el apartado ${section.label}?`)) return;
      const index = content.sections.findIndex((item) => item.id === section.id);
      content.sections.splice(index, 1);
      selected = "meta";
      render();
    }));
  }
  return work;
}

function render() {
  const shell = el("div", "shell");
  const bar = el("header", "topbar");
  const title = el("div");
  title.append(el("h1", "", "Delta"), el("p", "", "Administrador de apartados"));
  const actions = el("div", "row");
  const publishButton = button(publishing ? "Publicando…" : "Publicar", "btn", publish);
  publishButton.disabled = publishing;
  actions.append(
    publishButton,
    button("Vista previa", "btn line", preview),
    button("Salir", "btn line", () => {
      sessionStorage.removeItem(TOKEN_KEY);
      content = null;
      renderLogin("");
    }),
  );
  bar.append(title, actions);
  const layout = el("div", "layout");
  const side = el("aside", "side");
  const metaButton = button("Sitio", `nav${selected === "meta" ? " is-on" : ""}`, () => {
    selected = "meta";
    render();
  });
  side.append(metaButton);
  content.sections.forEach((section, index) => {
    const item = el("div", "row");
    const open = button(`${section.num}  ${section.label}`, `nav${selected === section.id ? " is-on" : ""}`, () => {
      selected = section.id;
      render();
    });
    if (section.visible === false) open.append(el("span", "", "oculto"));
    item.append(
      open,
      button("↑", "btn line", () => move(index, -1)),
      button("↓", "btn line", () => move(index, 1)),
    );
    side.append(item);
  });
  const current = selected === "meta"
    ? renderMeta()
    : renderSection(content.sections.find((section) => section.id === selected) || content.sections[0]);
  if (status) current.prepend(el("p", statusOk ? "status ok" : "status error", status));
  layout.append(side, current);
  shell.append(bar, layout);
  app.replaceChildren(shell);
}

async function boot() {
  const payload = await github(`/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`);
  const binary = atob(payload.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  content = JSON.parse(new TextDecoder().decode(bytes));
  content.meta = content.meta || {};
  content.sections = content.sections || [];
  render();
}

if (sessionStorage.getItem(TOKEN_KEY)) {
  boot().catch(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    renderLogin("La sesión no pudo leer el contenido.");
  });
} else {
  renderLogin("");
}
