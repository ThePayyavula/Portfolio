/* ============ rohan-os ============ */
"use strict";

/* ---------- App registry ---------- */
const APPS = {
  about:      { title: "about.sh — zsh",        glyph: "👤" },
  projects:   { title: "projects — ls",         glyph: "📁" },
  experience: { title: "experience.log — tail", glyph: "💼" },
  skills:     { title: "skills.json — jq",      glyph: "⚙️" },
  education:  { title: "education.md — glow",   glyph: "🎓" },
  contact:    { title: "contact.sh — zsh",      glyph: "📡" },
  terminal:   { title: "terminal — zsh",        glyph: "🖥️" },
};

const windowsLayer = document.getElementById("windows");
const dockItems = document.getElementById("dock-items");
const openWindows = new Map(); // appId -> { el, dockEl, minimized }
let zTop = 100;

/* ---------- Boot sequence ---------- */
const BOOT_LINES = [
  "ROHAN-OS v2.6.0 (kernel 5.15.0-portfolio)",
  "",
  "[  OK  ] Initializing boot sequence...",
  "[  OK  ] Loading kernel modules: react.ko django.ko langchain.ko",
  "[  OK  ] Mounting /dev/projects",
  "[  OK  ] Mounting /dev/experience",
  "[  OK  ] Starting llm-inference.service",
  "[  OK  ] Starting full-stack.service",
  "[  OK  ] Fetching coffee... done (2 cups)",
  "[  OK  ] Reached target: Graphical Interface",
  "",
  "rohan-os login: rohan",
  "password: ••••••••",
  "",
  "Last login: from tty1",
  "Welcome, visitor. Launching desktop...",
];

const bootEl = document.getElementById("boot");
const bootText = document.getElementById("boot-text");
let bootDone = false;
let bootTimer = null;

function runBoot() {
  let i = 0;
  function next() {
    if (i >= BOOT_LINES.length) { bootTimer = setTimeout(finishBoot, 500); return; }
    bootText.textContent += BOOT_LINES[i] + "\n";
    i++;
    bootTimer = setTimeout(next, BOOT_LINES[i - 1] === "" ? 120 : 130 + Math.random() * 140);
  }
  next();
}

function finishBoot() {
  if (bootDone) return;
  bootDone = true;
  clearTimeout(bootTimer);
  bootEl.classList.add("fade");
  document.getElementById("desktop").classList.remove("hidden");
  setTimeout(() => bootEl.remove(), 600);
  setTimeout(() => openApp("about"), 700);
}

bootEl.addEventListener("click", finishBoot);
window.addEventListener("keydown", (e) => { if (!bootDone) { e.preventDefault(); finishBoot(); } }, { once: false });
runBoot();

/* ---------- Clock ---------- */
const clockEl = document.getElementById("mb-clock");
function tick() {
  const d = new Date();
  clockEl.textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    "  " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
tick(); setInterval(tick, 15000);

/* ---------- Window manager ---------- */
let spawnCount = 0;

function openApp(appId) {
  const app = APPS[appId];
  if (!app) return;

  const existing = openWindows.get(appId);
  if (existing) {
    if (existing.minimized) restoreWindow(appId);
    focusWindow(existing.el);
    return;
  }

  const tpl = document.getElementById("tpl-" + appId);
  const win = document.createElement("div");
  win.className = "window";
  win.dataset.app = appId;

  win.innerHTML = `
    <div class="titlebar">
      <div class="lights">
        <button class="light light-close" title="close" aria-label="close">×</button>
        <button class="light light-min" title="minimize" aria-label="minimize">−</button>
        <button class="light light-max" title="maximize" aria-label="maximize">+</button>
      </div>
      <div class="win-title"><span class="wt-glyph">${app.glyph}</span>${app.title}</div>
      <div class="titlebar-spacer"></div>
    </div>
    <div class="win-content"></div>`;

  win.querySelector(".win-content").appendChild(tpl.content.cloneNode(true));

  // cascade spawn position
  const isMobile = window.innerWidth <= 720;
  const off = (spawnCount % 6) * 28;
  spawnCount++;
  if (!isMobile) {
    win.style.left = Math.min(140 + off + (appId === "terminal" ? 60 : 0), window.innerWidth - 660) + "px";
    win.style.top = (70 + off) + "px";
  }
  win.style.zIndex = ++zTop;

  windowsLayer.appendChild(win);

  // dock entry
  const dockEl = document.createElement("button");
  dockEl.className = "dock-item";
  dockEl.innerHTML = `<span class="dot"></span>${app.glyph} ${appId}`;
  dockEl.addEventListener("click", () => {
    const w = openWindows.get(appId);
    if (!w) return;
    if (w.minimized) restoreWindow(appId);
    else focusWindow(w.el);
  });
  dockItems.appendChild(dockEl);

  openWindows.set(appId, { el: win, dockEl, minimized: false });

  // controls
  win.querySelector(".light-close").addEventListener("click", (e) => { e.stopPropagation(); closeApp(appId); });
  win.querySelector(".light-min").addEventListener("click", (e) => { e.stopPropagation(); minimizeWindow(appId); });
  win.querySelector(".light-max").addEventListener("click", (e) => { e.stopPropagation(); win.classList.toggle("maxed"); });
  win.addEventListener("mousedown", () => focusWindow(win));
  win.addEventListener("touchstart", () => focusWindow(win), { passive: true });

  makeDraggable(win);
  focusWindow(win);

  if (appId === "terminal") initTerminal(win);
}

function closeApp(appId) {
  const w = openWindows.get(appId);
  if (!w) return;
  w.el.classList.add("closing");
  setTimeout(() => w.el.remove(), 160);
  w.dockEl.remove();
  openWindows.delete(appId);
}

function minimizeWindow(appId) {
  const w = openWindows.get(appId);
  if (!w) return;
  w.minimized = true;
  w.el.style.display = "none";
  w.dockEl.classList.add("minimized");
}

function restoreWindow(appId) {
  const w = openWindows.get(appId);
  if (!w) return;
  w.minimized = false;
  w.el.style.display = "";
  w.dockEl.classList.remove("minimized");
  focusWindow(w.el);
}

function focusWindow(win) {
  win.style.zIndex = ++zTop;
  document.querySelectorAll(".window").forEach(w => w.classList.remove("focused"));
  win.classList.add("focused");
  if (win.dataset.app === "terminal") {
    const inp = win.querySelector(".term-input");
    if (inp) setTimeout(() => inp.focus(), 0);
  }
}

/* ---------- Dragging ---------- */
function makeDraggable(win) {
  const bar = win.querySelector(".titlebar");
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  function down(x, y, target) {
    if (target.closest(".light")) return false;
    if (win.classList.contains("maxed")) return false;
    dragging = true;
    sx = x; sy = y;
    const r = win.getBoundingClientRect();
    ox = r.left; oy = r.top;
    return true;
  }
  function move(x, y) {
    if (!dragging) return;
    let nl = ox + (x - sx);
    let nt = oy + (y - sy);
    nl = Math.max(-win.offsetWidth + 80, Math.min(nl, window.innerWidth - 80));
    nt = Math.max(30, Math.min(nt, window.innerHeight - 60));
    win.style.left = nl + "px";
    win.style.top = nt + "px";
  }

  bar.addEventListener("mousedown", (e) => { if (down(e.clientX, e.clientY, e.target)) e.preventDefault(); });
  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  window.addEventListener("mouseup", () => dragging = false);

  bar.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    down(t.clientX, t.clientY, e.target);
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("touchend", () => dragging = false);

  bar.addEventListener("dblclick", (e) => {
    if (!e.target.closest(".light")) win.classList.toggle("maxed");
  });
}

/* ---------- Launchers ---------- */
document.querySelectorAll("[data-open]").forEach(el => {
  el.addEventListener("click", () => openApp(el.dataset.open));
});

/* ---------- Terminal ---------- */
const TERM_FILES = {
  "about.txt": "Rohan Payyavula — CS alumnus, George Mason University ('26).\nSoftware engineer: AI/ML, backend, data, embedded/edge systems.\nBuilds RAG platforms, cloud workflows, and AI automation tools.",
  "contact.txt": "email:    rohan.payyavula.cs@gmail.com\nlinkedin: linkedin.com/in/rohanpayyavula\ngithub:   github.com/Rohan-Payyavula",
  "todo.txt": "[x] learn react\n[x] teach CS 395\n[x] ship RAG healthcare platform\n[x] graduate GMU\n[ ] world domination (ETA: TBD)",
};

function initTerminal(win) {
  const out = win.querySelector(".term-out");
  const input = win.querySelector(".term-input");
  const body = win.querySelector(".term-body");
  const history = [];
  let histIdx = -1;

  function print(html, cls) {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    body.scrollTop = body.scrollHeight;
    win.querySelector(".win-content").scrollTop = 1e9;
  }
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  print(`<span class="t-green">rohan-os terminal</span> — type <span class="t-amber">help</span> to get started\n`);

  const commands = {
    help: () => print(
`<span class="t-dim">available commands:</span>
  <span class="t-amber">about</span>        who is this guy
  <span class="t-amber">projects</span>     things I've built
  <span class="t-amber">experience</span>   where I've worked
  <span class="t-amber">skills</span>       what I know
  <span class="t-amber">education</span>    where I learned it
  <span class="t-amber">contact</span>      how to reach me
  <span class="t-amber">open</span> &lt;app&gt;   launch a window (e.g. open projects)
  <span class="t-amber">ls</span> / <span class="t-amber">cat</span>     poke around the filesystem
  <span class="t-amber">neofetch</span>     system info
  <span class="t-amber">clear</span>        clear screen
  <span class="t-amber">exit</span>         close terminal`),
    whoami: () => print("rohan — CS alumnus, software engineer, AI/ML developer. Currently accepting interesting problems."),
    about: () => { openApp("about"); print("opening about.sh..."); },
    projects: () => { openApp("projects"); print("opening projects/..."); },
    experience: () => { openApp("experience"); print("tailing experience.log..."); },
    skills: () => { openApp("skills"); print("parsing skills.json..."); },
    education: () => { openApp("education"); print("rendering education.md..."); },
    contact: () => { openApp("contact"); print("running contact.sh..."); },
    ls: () => print(`<span class="t-blue">projects/</span>  about.txt  contact.txt  todo.txt  <span class="t-dim">skills.json  experience.log  education.md</span>`),
    date: () => print(new Date().toString()),
    pwd: () => print("/home/rohan"),
    clear: () => { out.innerHTML = ""; },
    exit: () => closeApp("terminal"),
    neofetch: () => print(
`<span class="t-green">       ██████╗
      ██╔═══██╗      </span><span class="t-amber">rohan</span>@<span class="t-amber">rohan-os</span><span class="t-green">
      ██████╔╝       </span>─────────────────<span class="t-green">
      ██╔══██╗       </span>OS:       rohan-os v2.6.0<span class="t-green">
      ██║  ██║       </span>Host:     GMU B.S. CS, class of 2026<span class="t-green">
      ╚═╝  ╚═╝       </span>Kernel:   AI/ML + full-stack + embedded
                     Shell:    zsh (allegedly)
                     Uptime:   since 2022
                     Packages: pytorch, fastapi, react, langchain, docker
                     Memory:   mostly coffee`),
    sudo: (args) => {
      if (args.join(" ").includes("hire")) {
        print(`<span class="t-green">[sudo] permission granted.</span> Excellent choice. → <a href="mailto:rohan.payyavula.cs@gmail.com">rohan.payyavula.cs@gmail.com</a>`);
      } else {
        print(`<span class="t-red">rohan is not in the sudoers file. This incident will be reported.</span>`);
      }
    },
    echo: (args) => print(esc(args.join(" "))),
    open: (args) => {
      const app = (args[0] || "").toLowerCase();
      if (APPS[app]) { openApp(app); print(`opening ${app}...`); }
      else print(`<span class="t-red">open: no such app:</span> ${esc(args[0] || "")} <span class="t-dim">(try: ${Object.keys(APPS).join(", ")})</span>`);
    },
    cat: (args) => {
      const f = args[0] || "";
      if (TERM_FILES[f]) print(esc(TERM_FILES[f]));
      else if (f === "skills.json") { openApp("skills"); print("opening skills.json..."); }
      else if (f === "experience.log") { openApp("experience"); print("opening experience.log..."); }
      else if (f === "education.md") { openApp("education"); print("opening education.md..."); }
      else print(`<span class="t-red">cat: ${esc(f)}: No such file or directory</span>`);
    },
  };

  function runCommand() {
    const raw = input.value.trim();
    input.value = "";
    histIdx = -1;
    print(`<span class="t-green">rohan@rohan-os</span>:<span class="t-blue">~</span>$ ${esc(raw)}`);
    if (!raw) return;
    history.push(raw);

    const [cmd, ...args] = raw.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (fn) fn(args);
    else print(`<span class="t-red">command not found:</span> ${esc(cmd)} <span class="t-dim">— try 'help'</span>`);
  }

  win.querySelector(".term-input-row").addEventListener("submit", (e) => {
    e.preventDefault();
    runCommand();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length && histIdx < history.length - 1) { histIdx++; input.value = history[history.length - 1 - histIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; input.value = history[history.length - 1 - histIdx]; }
      else { histIdx = -1; input.value = ""; }
    } else if (e.key === "Enter" || e.key === "Return") {
      e.preventDefault();
      runCommand();
    }
  });

  body.addEventListener("click", () => input.focus());
}
