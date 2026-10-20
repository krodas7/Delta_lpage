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

// Carga de imágenes: se guardan en esta carpeta del repositorio al publicar.
const UPLOAD_DIR = "assets/uploads";
const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/svg+xml";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_VECTOR_BYTES = 600 * 1024;
// ruta en el repositorio → { blob, dataUrl, objectUrl, pending }
const images = new Map();

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

function editorGroup(title, description) {
  const group = el("section", "editor-group");
  const heading = el("div", "editor-group__heading");
  heading.append(el("h3", "", title));
  if (description) heading.append(el("p", "", description));
  group.append(heading);
  return group;
}

function button(label, className, onClick) {
  const node = el("button", className || "btn", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

function slugify(name) {
  const base = String(name || "")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "imagen";
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo abrir la imagen. Prueba con un JPG, PNG o WebP."));
    };
    img.src = url;
  });
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Reduce el tamaño y la recomprime (WebP). Así las fotos del celular no pesan 8 MB
// y además se eliminan los datos EXIF, como la ubicación donde se tomó la foto.
async function optimizeImage(file, maxSide) {
  if (file.type === "image/svg+xml") {
    if (file.size > MAX_VECTOR_BYTES) throw new Error("El SVG pesa demasiado (máximo 600 KB).");
    return { blob: file, ext: "svg" };
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Formato no admitido. Usa JPG, PNG, WebP o SVG.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen pesa más de 25 MB.");
  const source = await loadBitmap(file);
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source.close) source.close();
  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    // Navegadores sin soporte para codificar WebP: JPG con fondo blanco.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
    ext = "jpg";
  }
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  return { blob, ext };
}

// Dirección que usa el administrador para mostrar la miniatura.
// Las rutas locales se escriben respecto a la raíz del sitio; el admin vive en /admin/.
function imageSrc(value) {
  if (!value) return "";
  const local = images.get(value);
  if (local) return local.objectUrl;
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  return `../${value.replace(/^\.\//, "")}`;
}

function imageField(label, value, onChange, options = {}) {
  const maxSide = options.maxSide || 2000;
  let current = value || "";

  const wrap = el("div", "field image-field");
  const box = el("div", "image-field__box");
  const preview = el("div", `image-field__preview${options.contain ? " is-contain" : ""}`);
  const side = el("div", "image-field__side");
  const actions = el("div", "image-field__actions");
  const message = el("p", "image-field__msg");
  message.setAttribute("role", "status");

  const file = document.createElement("input");
  file.type = "file";
  file.accept = ACCEPTED_IMAGES;
  file.hidden = true;

  const pick = button("Subir imagen", "btn", () => file.click());
  const remove = button("Quitar", "btn line", () => {
    current = "";
    onChange("");
    setMessage("");
    refresh();
  });

  function setMessage(text, kind) {
    message.textContent = text || "";
    message.className = `image-field__msg${kind ? ` is-${kind}` : ""}`;
  }

  function refresh() {
    preview.replaceChildren();
    const src = imageSrc(current);
    if (src) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      img.addEventListener("error", () => {
        preview.replaceChildren(el("span", "", "No se pudo mostrar la imagen"));
      });
      preview.append(img);
    } else {
      preview.append(el("span", "", "Sin imagen"));
    }
    pick.textContent = current ? "Cambiar imagen" : "Subir imagen";
    remove.hidden = !current;
  }

  async function handleFile(selected) {
    if (!selected) return;
    pick.disabled = true;
    setMessage("Procesando imagen…");
    try {
      const { blob, ext } = await optimizeImage(selected, maxSide);
      const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const path = `${UPLOAD_DIR}/${slugify(selected.name)}-${stamp}.${ext}`;
      const dataUrl = await readAsDataUrl(blob);
      images.set(path, { blob, dataUrl, objectUrl: URL.createObjectURL(blob), pending: true });
      current = path;
      onChange(path);
      refresh();
      setMessage(`Lista (${formatSize(blob.size)}). Se sube al sitio cuando pulses Publicar.`, "ok");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      pick.disabled = false;
      file.value = "";
    }
  }

  file.addEventListener("change", () => handleFile(file.files[0]));

  ["dragenter", "dragover"].forEach((type) => {
    box.addEventListener(type, (event) => {
      event.preventDefault();
      box.classList.add("is-drag");
    });
  });
  box.addEventListener("dragleave", (event) => {
    if (!box.contains(event.relatedTarget)) box.classList.remove("is-drag");
  });
  box.addEventListener("drop", (event) => {
    event.preventDefault();
    box.classList.remove("is-drag");
    handleFile(event.dataTransfer && event.dataTransfer.files[0]);
  });

  actions.append(pick, remove, file);
  side.append(
    actions,
    el("p", "image-field__hint", "JPG, PNG o WebP. La imagen se ajusta sola para que la página cargue rápido."),
    message,
  );
  box.append(preview, side);
  wrap.append(el("span", "image-field__title", label), box);
  refresh();
  return wrap;
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
  if (!response.ok) {
    if (response.status === 403 && /not accessible|forbidden/i.test(payload.message || "")) {
      throw new Error(
        `El token no tiene permiso de escritura. Crea uno con Contents: Read and write sobre ${REPO}.`,
      );
    }
    throw new Error(payload.message || "No se pudo hablar con GitHub.");
  }
  return payload;
}

// Un solo commit con el contenido y las imágenes nuevas (API Git de GitHub),
// así el sitio se despliega una sola vez.
async function commitFiles(files, message) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const ref = await github(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
      const parentSha = ref.object.sha;
      const parent = await github(`/repos/${REPO}/git/commits/${parentSha}`);
      const tree = [];
      for (const file of files) {
        if (file.base64 != null) {
          const blob = await github(`/repos/${REPO}/git/blobs`, {
            method: "POST",
            body: JSON.stringify({ content: file.base64, encoding: "base64" }),
          });
          tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
        } else {
          tree.push({ path: file.path, mode: "100644", type: "blob", content: file.text });
        }
      }
      const created = await github(`/repos/${REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
      });
      const commit = await github(`/repos/${REPO}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: created.sha, parents: [parentSha] }),
      });
      await github(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      });
      return;
    } catch (error) {
      // Si alguien publicó justo antes, se reintenta una vez sobre el último commit.
      if (attempt === 0 && /fast.?forward/i.test(error.message)) continue;
      throw error;
    }
  }
}

async function publish() {
  publishing = true;
  status = "Publicando…";
  statusOk = true;
  render();
  try {
    const ready = clean(content);
    const body = `${JSON.stringify(ready, null, 2)}\n`;
    const files = [{ path: FILE, text: body }];
    const uploaded = [];
    // Solo se suben las imágenes nuevas que el contenido realmente usa.
    images.forEach((image, path) => {
      if (image.pending && body.includes(path)) {
        files.push({ path, base64: image.dataUrl.split(",")[1] });
        uploaded.push(path);
      }
    });
    await commitFiles(files, "Actualiza el contenido del sitio desde el administrador.");
    uploaded.forEach((path) => {
      images.get(path).pending = false;
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
  // Las imágenes nuevas aún no están en el sitio: la vista previa las lleva incrustadas.
  let json = JSON.stringify(clean(content));
  images.forEach((image, path) => {
    json = json.split(path).join(image.dataUrl);
  });
  try {
    sessionStorage.setItem("delta-preview", json);
  } catch (error) {
    status = "La vista previa pesa demasiado por las imágenes nuevas. Publica y vuelve a intentarlo.";
    statusOk = false;
    render();
    return;
  }
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
      imageField("Imagen", item.image, (value) => {
        item.image = value;
      }, { maxSide: 1600 }),
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
  const heading = el("header", "work-heading");
  heading.append(
    el("p", "eyebrow", "CONFIGURACIÓN GENERAL"),
    el("h2", "", "Tu sitio"),
    el("p", "hint", "Administra la identidad y la información que aparece en toda la página."),
  );
  work.append(heading);

  const identity = editorGroup("Identidad", "Define cómo se presenta Delta en la página.");
  const identityGrid = el("div", "grid");
  identityGrid.append(
    imageField("Logo", content.meta.logo, (value) => {
      content.meta.logo = value;
    }, { maxSide: 800, contain: true }),
    field("Texto alternativo del logo", content.meta.logoAlt, (value) => {
      content.meta.logoAlt = value;
    }),
  );
  identity.append(identityGrid);

  const page = editorGroup("Información de la página", "Título y descripción que aparecen en la pestaña y los buscadores.");
  const pageGrid = el("div", "grid");
  pageGrid.append(
    field("Título de la pestaña", content.meta.title, (value) => {
      content.meta.title = value;
    }),
    field("Descripción", content.meta.description, (value) => {
      content.meta.description = value;
    }, true),
  );
  page.append(pageGrid);

  const contact = editorGroup("Pie de página y contacto", "Datos breves y etiqueta del acceso de correo.");
  const contactGrid = el("div", "grid");
  contactGrid.append(
    field("Pie de cada apartado", content.meta.footer, (value) => {
      content.meta.footer = value;
    }),
    field("Botón de correo", content.meta.mailLabel, (value) => {
      content.meta.mailLabel = value;
    }),
  );
  contact.append(contactGrid);
  work.append(identity, page, contact);
  return work;
}

function renderSection(section) {
  const work = el("section", "work");
  const heading = el("header", "work-heading");
  const title = el("div", "work-heading__title");
  title.append(
    el("p", "eyebrow", `EDITANDO APARTADO · ${(section.kind || "contenido").toUpperCase()}`),
    el("h2", "", section.label || "Apartado"),
    el("p", "hint", "Organiza el contenido y la presentación de este apartado."),
  );
  const visible = el("label", "check", "Visible en el índice");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = section.visible !== false;
  box.addEventListener("change", () => {
    section.visible = box.checked;
    render();
  });
  visible.prepend(box);
  heading.append(title, visible);
  work.append(heading);

  const contentGroup = editorGroup("Contenido", "Edita el nombre y los textos que verá tu visitante.");
  const contentGrid = el("div", "grid");
  contentGrid.append(
    field("Nombre en el índice", section.label, (value) => {
      section.label = value;
    }),
  );
  if (section.kind !== "hero") {
    contentGrid.append(
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
    contentGrid.append(
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
  contentGroup.append(contentGrid);
  if (section.kind !== "hero") {
    contentGroup.append(field("Párrafos · separa cada bloque con una línea en blanco", (section.decks || []).join("\n\n"), (value) => {
      section.decks = value.split("\n\n");
    }, true));
  }
  work.append(contentGroup);

  const imageGroup = editorGroup("Imagen de fondo", "Sube una foto desde tu computador o celular. Se ajusta sola para que la página cargue rápido.");
  imageGroup.append(imageField("Imagen", section.image, (value) => {
    section.image = value;
  }, { maxSide: 2000 }));
  work.append(imageGroup);

  if (section.kind === "hero" || section.kind === "media") {
    const actionsGroup = editorGroup("Botones", "Configura el texto, destino y estilo de cada llamada a la acción.");
    (section.actions || []).forEach((action, index) => {
      const block = el("article", "block");
      block.append(el("h4", "", `Botón ${index + 1}`));
      const row = el("div", "grid");
      row.append(
        field("Texto", action.label, (value) => {
          action.label = value;
        }),
        field("Destino · ID del apartado", action.go, (value) => {
          action.go = value;
        }),
        field("Estilo · gold o line", action.style, (value) => {
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
      actionsGroup.append(block);
    });
    actionsGroup.append(button("＋ Agregar botón", "btn line", () => {
      section.actions = section.actions || [];
      section.actions.push({ label: "Nuevo botón", go: "contacto", style: "gold", topic: "" });
      render();
    }));
    work.append(actionsGroup);
  }
  if (section.kind === "contact") {
    section.fields = section.fields || {};
    const labels = section.fields;
    const labelsGroup = editorGroup("Etiquetas del formulario", "Personaliza los nombres de los campos que aparecen al visitante.");
    const names = el("div", "grid");
    ["nombre", "empresa", "correo", "telefono", "frente", "mensaje"].forEach((key) => {
      names.append(field(key, labels[key], (value) => {
      section.fields[key] = value;
      }));
    });
    labelsGroup.append(names);

    const formGroup = editorGroup("Opciones y mensajes", "Configura las opciones del selector y los mensajes del formulario.");
    const formGrid = el("div", "grid");
    formGrid.append(
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
    formGroup.append(formGrid);
    work.append(labelsGroup, formGroup);

    const factsGroup = editorGroup("Datos de contacto", "Agrega información y enlaces que aparecen junto al formulario.");
    (section.facts || []).forEach((fact, index) => {
      const block = el("article", "block");
      block.append(el("h4", "", `Dato ${index + 1}`));
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
      factsGroup.append(block);
    });
    factsGroup.append(button("＋ Agregar dato", "btn line", () => {
      section.facts.push({ label: "Nuevo", value: "", href: "" });
      render();
    }));
    work.append(factsGroup);
  }
  if (section.kind !== "hero" && section.kind !== "contact") {
    const modulesGroup = editorGroup("Módulos de contenido", "Cada módulo representa una tarjeta, servicio o elemento del apartado.");
    (section.items || []).forEach((item, index) => modulesGroup.append(itemFields(section, item, index)));
    modulesGroup.append(button("＋ Agregar módulo", "btn line", () => {
      section.items = section.items || [];
      section.items.push(blankItem(section.kind));
      render();
    }));
    work.append(modulesGroup);
  }
  if (content.sections.length > 1) {
    const danger = el("div", "danger-zone");
    danger.append(
      el("div", "", "¿Ya no necesitas este apartado?"),
      button("Quitar apartado", "btn danger", () => {
        if (!window.confirm(`¿Quitar el apartado ${section.label}?`)) return;
        const index = content.sections.findIndex((item) => item.id === section.id);
        content.sections.splice(index, 1);
        selected = "meta";
        render();
      }),
    );
    work.append(danger);
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
  const sideHeading = el("div", "side-heading");
  sideHeading.append(el("p", "", "Editor de contenido"), el("h2", "", "Apartados"));
  side.append(sideHeading);
  const metaButton = button("Sitio y marca", `nav${selected === "meta" ? " is-on" : ""}`, () => {
    selected = "meta";
    render();
  });
  if (selected === "meta") metaButton.setAttribute("aria-current", "page");
  side.append(metaButton);
  content.sections.forEach((section, index) => {
    const item = el("div", "row");
    const open = button(`${section.num}  ${section.label}`, `nav${selected === section.id ? " is-on" : ""}`, () => {
      selected = section.id;
      render();
    });
    if (selected === section.id) open.setAttribute("aria-current", "page");
    if (section.visible === false) open.append(el("span", "", "oculto"));
    const moveUp = button("↑", "btn line", () => move(index, -1));
    const moveDown = button("↓", "btn line", () => move(index, 1));
    moveUp.setAttribute("aria-label", `Mover ${section.label} hacia arriba`);
    moveDown.setAttribute("aria-label", `Mover ${section.label} hacia abajo`);
    moveUp.disabled = index === 0;
    moveDown.disabled = index === content.sections.length - 1;
    item.append(
      open,
      moveUp,
      moveDown,
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
  // En móvil el menú es una barra horizontal: mantiene visible el apartado activo.
  if (window.matchMedia("(max-width: 800px)").matches) {
    side.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }
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