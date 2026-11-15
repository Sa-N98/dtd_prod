const STORAGE_KEY = "gp21_report_v1";

// Concern lists: each row is { title, body, suggestions } (suggestions: one per line).
const LISTS = {
    strong: { min: 3, label: "Strong tackle", titlePh: "Concern headline, e.g. Solution is too broad to identify a clear MVP focus",
              bodyPh: "What did you observe, and why is it a concern?",
              sugPh: "Suggestions, one per line" },
    light:  { min: 2, label: "Light touch", titlePh: "Concern headline, e.g. Missing prototype screens",
              bodyPh: "What did you observe?",
              sugPh: "Suggestions, one per line" },
};

const REPORT_TITLE = "DTD-DAD Ritual Dissent Report Card";

export async function createM2BPage() {
    const response = await fetch("./src/pages/milestones/m2b/m2b.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const element = container.firstElementChild;
    element.id = "page-milestone-2b";
    element.classList.add("page");

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/milestones/m2b/m2b.css";
    document.querySelector("head").appendChild(css);

    const state = loadState();
    setupTabs(element);
    setupTodo(element, state);
    setupReportTool(element, state);

    return element;
}

/* ---------- state ---------- */

function emptyState() {
    return { fields: {}, lists: {}, todo: {} };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const s = JSON.parse(raw);
            return { ...emptyState(), ...s };
        }
    } catch (e) {
        console.warn("Could not load saved report", e);
    }
    return emptyState();
}

function makeSaver(state, element) {
    let timer = null;
    const status = element.querySelector("#save-status");
    return () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                if (status) status.textContent = "Saved " + new Date().toLocaleTimeString();
            } catch (e) {
                if (status) status.textContent = "Could not save in this browser.";
            }
        }, 300);
    };
}

/* ---------- tabs ---------- */

function setupTabs(element) {
    const todoBtn = element.querySelector("#tm_to_do_gp21_btn");
    const toolBtn = element.querySelector("#tm_report_tool_gp21_btn");
    const todoPane = element.querySelector("#to_do_gp21");
    const toolPane = element.querySelector("#report_tool_gp21");

    function show(which) {
        const isTodo = which === "todo";
        todoBtn.classList.toggle("active", isTodo);
        toolBtn.classList.toggle("active", !isTodo);
        todoPane.style.display = isTodo ? "block" : "none";
        toolPane.style.display = isTodo ? "none" : "block";
    }

    todoBtn.addEventListener("click", () => show("todo"));
    toolBtn.addEventListener("click", () => show("tool"));
    return { show };
}

/* ---------- to do ---------- */

function setupTodo(element, state) {
    const save = makeSaver(state, element);
    const boxes = element.querySelectorAll("input[data-todo]");
    const count = element.querySelector("#todo-count");

    function refresh() {
        let done = 0;
        boxes.forEach((b) => {
            if (b.checked) done++;
            b.closest(".req").classList.toggle("done", b.checked);
        });
        count.textContent = `${done} of ${boxes.length} done`;
        count.classList.toggle("complete", done === boxes.length);
    }

    boxes.forEach((box) => {
        box.checked = !!state.todo[box.dataset.todo];
        box.addEventListener("change", () => {
            state.todo[box.dataset.todo] = box.checked;
            refresh();
            save();
        });
    });

    refresh();
}

/* ---------- report tool ---------- */

function setupReportTool(element, state) {
    const save = makeSaver(state, element);
    const root = element.querySelector("#report_tool_gp21");

    // simple fields
    root.querySelectorAll("[data-field]").forEach((el) => {
        el.value = state.fields[el.dataset.field] || "";
        el.addEventListener("input", () => {
            state.fields[el.dataset.field] = el.value;
            save();
        });
    });

    // dynamic lists
    Object.keys(LISTS).forEach((name) => {
        const rows = state.lists[name] || [];
        while (rows.length < LISTS[name].min) rows.push({});
        state.lists[name] = rows;
        renderList(root, state, name, save);
    });

    root.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const name = btn.dataset.add;
            state.lists[name].push({});
            renderList(root, state, name, save);
            save();
        });
    });

    // preview + copy as template
    const overlay = root.querySelector("#preview-overlay");
    const body = root.querySelector("#preview-body");
    const copyBtn = root.querySelector("#btn-copy-template");

    const openPreview = () => {
        body.innerHTML = buildReportHtml(state);
        overlay.hidden = false;
        body.scrollTop = 0;
        document.addEventListener("keydown", onKey);
    };
    const closePreview = () => {
        overlay.hidden = true;
        document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => { if (e.key === "Escape") closePreview(); };

    root.querySelector("#btn-preview").addEventListener("click", openPreview);
    root.querySelector("#btn-close-preview").addEventListener("click", closePreview);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePreview(); });

    copyBtn.addEventListener("click", async () => {
        const ok = await copyRich(body, buildMarkdown(state));
        flashLabel(copyBtn, ok ? "Copied!" : "Copy failed");
    });
}

// Copies the rendered preview as rich text (pastes into Word / Docs with
// headings and lists), with a plain-text fallback.
async function copyRich(node, plain) {
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({
                "text/html": new Blob([node.innerHTML], { type: "text/html" }),
                "text/plain": new Blob([plain], { type: "text/plain" }),
            })]);
            return true;
        }
    } catch (e) { /* fall through */ }
    try {
        await navigator.clipboard.writeText(plain);
        return true;
    } catch (e) { /* fall through */ }
    try {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const ok = document.execCommand("copy");
        sel.removeAllRanges();
        return ok;
    } catch (e) {
        return false;
    }
}

function makeInput(ph, value, onInput) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = ph;
    input.value = value || "";
    input.setAttribute("aria-label", ph);
    input.addEventListener("input", () => onInput(input.value));
    return input;
}

function makeTextarea(ph, rows, value, onInput) {
    const ta = document.createElement("textarea");
    ta.rows = rows;
    ta.placeholder = ph;
    ta.value = value || "";
    ta.setAttribute("aria-label", ph);
    ta.addEventListener("input", () => onInput(ta.value));
    return ta;
}

function renderList(root, state, name, save) {
    const box = root.querySelector(`[data-list="${name}"]`);
    const def = LISTS[name];
    box.innerHTML = "";

    state.lists[name].forEach((row, i) => {
        const card = document.createElement("div");
        card.className = "concern";

        const head = document.createElement("div");
        head.className = "concern-head";
        const no = document.createElement("span");
        no.className = "concern-no";
        no.textContent = `${def.label} ${i + 1}`;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "row-del";
        del.title = "Remove";
        del.setAttribute("aria-label", "Remove concern");
        del.textContent = "\u00d7";
        del.addEventListener("click", () => {
            state.lists[name].splice(i, 1);
            if (state.lists[name].length === 0) state.lists[name].push({});
            renderList(root, state, name, save);
            save();
        });
        head.append(no, del);

        card.append(
            head,
            makeInput(def.titlePh, row.title, (v) => { row.title = v; save(); }),
            makeTextarea(def.bodyPh, 3, row.body, (v) => { row.body = v; save(); }),
            makeTextarea(def.sugPh, 3, row.suggestions, (v) => { row.suggestions = v; save(); })
        );
        box.appendChild(card);
    });
}

/* ---------- export ---------- */

function filled(rows) {
    return (rows || []).filter((r) => ["title", "body", "suggestions"].some((k) => (r[k] || "").toString().trim()));
}

function lines(v) {
    return (v || "").toString().split("\n").map((s) => s.trim()).filter(Boolean);
}

function buildMarkdown(state) {
    const F = state.fields;
    const t = (k) => (F[k] || "").trim() || "_Not filled in yet_";
    const L = state.lists;
    const out = [];

    out.push(`# ${REPORT_TITLE}`, "");
    out.push(`**Presenter Team:** ${t("presenter")}  `);
    out.push(`**Dissenter Team:** ${t("dissenter")}`, "");

    const section = (heading, rows) => {
        out.push(`## ${heading}`, "");
        const items = filled(rows);
        if (!items.length) { out.push("_None listed yet_", ""); return; }
        items.forEach((r) => {
            out.push(`### ${(r.title || "").trim() || "Untitled"}`);
            out.push(`- ${(r.body || "").trim().replace(/\n/g, " ")}`);
            lines(r.suggestions).forEach((s) => out.push(`  - ${s}`));
            out.push("");
        });
    };
    section("Strong Tackles (Major concerns)", L.strong);
    section("Light Touches (Minor concerns)", L.light);

    out.push("## Verdict", t("verdict"), "");
    return out.join("\n");
}

function esc(v) {
    return (v || "").toString().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function buildReportHtml(state) {
    const F = state.fields;
    const f = (k) => esc((F[k] || "").trim()).replace(/\n/g, "<br>") || "<i>Not filled in yet</i>";
    const L = state.lists;

    const section = (heading, rows) => {
        const items = filled(rows);
        if (!items.length) return `<h2>${heading}</h2><p><i>None listed yet</i></p>`;
        return `<h2>${heading}</h2>` + items.map((r) => {
            const sugs = lines(r.suggestions);
            return `<h3>${esc((r.title || "").trim()) || "<i>Untitled</i>"}</h3>
<ul><li>${esc((r.body || "").trim()).replace(/\n/g, "<br>")}${sugs.length ? `<ul style="list-style-type:circle">${sugs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}</li></ul>`;
        }).join("\n");
    };

    return `<h1>${REPORT_TITLE}</h1>
<p><b>Presenter Team:</b> ${f("presenter")}<br><b>Dissenter Team:</b> ${f("dissenter")}</p>
${section("Strong Tackles (Major concerns)", L.strong)}
${section("Light Touches (Minor concerns)", L.light)}
<h2>Verdict</h2><p>${f("verdict")}</p>`;
}

function flashLabel(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = old), 1500);
}