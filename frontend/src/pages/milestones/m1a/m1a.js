const STORAGE_KEY = "m1a_report_v1";

// Dynamic list definitions: each row is an array of columns.
const LISTS = {
    solutions: { cols: [
        { key: "name", ph: "Solution name" },
        { key: "link", ph: "https://link", type: "url" },
        { key: "note", ph: "How is it relevant / different?" },
    ], min: 2 },
    in_scope: { cols: [{ key: "text", ph: "Feature or deliverable" }], min: 3 },
    out_scope: { cols: [{ key: "text", ph: "Excluded for now" }], min: 3 },
    roles: { cols: [
        { key: "member", ph: "Team member" },
        { key: "role", ph: "Role" },
        { key: "deliverables", ph: "Deliverables they own" },
    ], min: 4 },
    capacity: { cols: [
        { key: "member", ph: "Team member" },
        { key: "hours", ph: "Hrs / week", type: "number" },
        { key: "other", ph: "Other coursework / commitments" },
    ], min: 4 },
};

const SPRINTS = ["GP1", "GP2", "GP3", "Final pitch"];

const TODO_TARGETS = {
    proposal: "[data-section='proposal']",
    scope: "[data-section='scope']",
    roles: "#wbs-roles",
    sprint: "#wbs-sprint",
    cap: "#wbs-cap",
};

export async function createM1APage() {
    const response = await fetch("./src/pages/milestones/m1a/m1a.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const element = container.firstElementChild;
    element.id = "page-milestone-1a";
    element.classList.add("page");

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/milestones/m1a/m1a.css";
    document.querySelector("head").appendChild(css);

    const state = loadState();
    const tabs = setupTabs(element);
    setupTodo(element, state, tabs);
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
    const todoBtn = element.querySelector("#tm_to_do_m1a_btn");
    const toolBtn = element.querySelector("#tm_report_tool_btn");
    const todoPane = element.querySelector("#to_do_m1a");
    const toolPane = element.querySelector("#report_tool_m1a");

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

function setupTodo(element, state, tabs) {
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

    element.querySelectorAll("button[data-open]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.closest(".req").querySelector("input[data-todo]").dataset.todo;
            tabs.show("tool");
            const target = element.querySelector(TODO_TARGETS[key]);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                target.classList.add("flash");
                setTimeout(() => target.classList.remove("flash"), 1500);
            }
        });
    });

    refresh();
}

/* ---------- report tool ---------- */

function setupReportTool(element, state) {
    const save = makeSaver(state, element);
    const root = element.querySelector("#report_tool_m1a");

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

    // sprint rows (fixed)
    if (!state.lists.sprints || state.lists.sprints.length !== SPRINTS.length) {
        state.lists.sprints = SPRINTS.map(() => ({}));
    }
    renderSprints(root, state, save);

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
// headings and tables), with a plain-text fallback.
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

function makeInput(col, value, onInput) {
    const input = document.createElement("input");
    input.type = col.type || "text";
    if (col.type === "number") input.min = "0";
    input.placeholder = col.ph;
    input.value = value || "";
    input.setAttribute("aria-label", col.ph);
    input.addEventListener("input", () => onInput(input.value));
    return input;
}

function renderList(root, state, name, save) {
    const box = root.querySelector(`[data-list="${name}"]`);
    const def = LISTS[name];
    box.innerHTML = "";
    box.style.setProperty("--cols", def.cols.length);

    state.lists[name].forEach((row, i) => {
        const line = document.createElement("div");
        line.className = "row";
        def.cols.forEach((col) => {
            line.appendChild(makeInput(col, row[col.key], (v) => {
                row[col.key] = v;
                save();
            }));
        });
        const del = document.createElement("button");
        del.type = "button";
        del.className = "row-del";
        del.title = "Remove";
        del.setAttribute("aria-label", "Remove row");
        del.textContent = "×";
        del.addEventListener("click", () => {
            state.lists[name].splice(i, 1);
            if (state.lists[name].length === 0) state.lists[name].push({});
            renderList(root, state, name, save);
            save();
        });
        line.appendChild(del);
        box.appendChild(line);
    });
}

function renderSprints(root, state, save) {
    const box = root.querySelector('[data-list="sprints"]');
    box.innerHTML = "";
    state.lists.sprints.forEach((row, i) => {
        const line = document.createElement("div");
        line.className = "row sprint";

        const label = document.createElement("div");
        label.className = "sprint-label";
        label.textContent = SPRINTS[i];

        const tasks = document.createElement("textarea");
        tasks.rows = 2;
        tasks.placeholder = `What will be completed in ${SPRINTS[i]}?`;
        tasks.value = row.tasks || "";
        tasks.addEventListener("input", () => { row.tasks = tasks.value; save(); });

        const lead = makeInput({ ph: "Lead" }, row.lead, (v) => { row.lead = v; save(); });

        line.append(label, tasks, lead);
        box.appendChild(line);
    });
}

/* ---------- export ---------- */

function filled(rows, keys) {
    return (rows || []).filter((r) => keys.some((k) => (r[k] || "").toString().trim()));
}

function buildMarkdown(state) {
    const f = (k) => (state.fields[k] || "").trim() || "_Not filled in yet_";
    const L = state.lists;
    const out = [];

    out.push(`# Project Management Report${state.fields.title ? " — " + state.fields.title.trim() : ""}`, "");

    out.push("## 1. Project Proposal", "");
    out.push("### Concept", f("concept"), "");
    out.push("### Goal", f("goal"), "");
    out.push("### Agile approach", f("agile"), "");
    out.push("### Existing solutions", "");
    const sols = filled(L.solutions, ["name", "link", "note"]);
    if (sols.length) {
        sols.forEach((s) => {
            const name = s.name || s.link || "Untitled";
            const link = s.link ? `[${name}](${s.link})` : name;
            out.push(`- ${link}${s.note ? " — " + s.note : ""}`);
        });
    } else out.push("_None listed yet_");
    out.push("");

    out.push("## 2. Project Scope", "");
    out.push(f("scope_overview"), "");
    out.push("### In scope");
    const ins = filled(L.in_scope, ["text"]);
    out.push(...(ins.length ? ins.map((r) => `- ${r.text}`) : ["_None listed yet_"]), "");
    out.push("### Out of scope");
    const outs = filled(L.out_scope, ["text"]);
    out.push(...(outs.length ? outs.map((r) => `- ${r.text}`) : ["_None listed yet_"]), "");

    out.push("## 3. Work Breakdown Structure", "");
    out.push("### Roles & responsibilities", "");
    const roles = filled(L.roles, ["member", "role", "deliverables"]);
    if (roles.length) {
        out.push("| Member | Role | Deliverables |", "|---|---|---|");
        roles.forEach((r) => out.push(`| ${cell(r.member)} | ${cell(r.role)} | ${cell(r.deliverables)} |`));
    } else out.push("_None listed yet_");
    out.push("");

    out.push("### Sprint timeline", "", "| Sprint | Planned work | Lead |", "|---|---|---|");
    (L.sprints || []).forEach((r, i) => out.push(`| ${SPRINTS[i]} | ${cell(r.tasks)} | ${cell(r.lead)} |`));
    out.push("");

    out.push("### Capacity & workload", "");
    const cap = filled(L.capacity, ["member", "hours", "other"]);
    if (cap.length) {
        out.push("| Member | Hrs / week | Other commitments |", "|---|---|---|");
        cap.forEach((r) => out.push(`| ${cell(r.member)} | ${cell(r.hours)} | ${cell(r.other)} |`));
    } else out.push("_None listed yet_");
    out.push("");

    out.push("### Contingency plan", f("contingency"), "");
    return out.join("\n");
}

function cell(v) {
    return ((v || "").toString().trim() || "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function esc(v) {
    return (v || "").toString().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function safeUrl(u) {
    const t = (u || "").trim();
    return /^https?:\/\//i.test(t) ? esc(t) : "";
}

function buildReportHtml(state) {
    const f = (k) => esc((state.fields[k] || "").trim()).replace(/\n/g, "<br>") || "<i>Not filled in yet</i>";
    const L = state.lists;
    const ul = (rows, fn) => rows.length ? `<ul>${rows.map((r) => `<li>${fn(r)}</li>`).join("")}</ul>` : "<p><i>None listed yet</i></p>";
    const table = (head, rows) => rows.length
        ? `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr>${head.map((h) => `<th align="left">${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c) || "—"}</td>`).join("")}</tr>`).join("")}</table>`
        : "<p><i>None listed yet</i></p>";

    const sols = filled(L.solutions, ["name", "link", "note"]);
    const ins = filled(L.in_scope, ["text"]);
    const outs = filled(L.out_scope, ["text"]);
    const roles = filled(L.roles, ["member", "role", "deliverables"]);
    const cap = filled(L.capacity, ["member", "hours", "other"]);

    return `<h1>Project Management Report</h1><p>${esc(state.fields.title)}</p>
<h2>1. Project Proposal</h2>
<h3>Concept</h3><p>${f("concept")}</p>
<h3>Goal</h3><p>${f("goal")}</p>
<h3>Agile approach</h3><p>${f("agile")}</p>
<h3>Existing solutions</h3>${ul(sols, (s) => `${safeUrl(s.link) ? `<a href="${safeUrl(s.link)}" target="_blank" rel="noopener">${esc(s.name || s.link)}</a>` : esc([s.name, s.link].filter(Boolean).join(" — "))}${s.note ? " — " + esc(s.note) : ""}`)}
<h2>2. Project Scope</h2><p>${f("scope_overview")}</p>
<h3>In scope</h3>${ul(ins, (r) => esc(r.text))}
<h3>Out of scope</h3>${ul(outs, (r) => esc(r.text))}
<h2>3. Work Breakdown Structure</h2>
<h3>Roles &amp; responsibilities</h3>${table(["Member", "Role", "Deliverables"], roles.map((r) => [r.member, r.role, r.deliverables]))}
<h3>Sprint timeline</h3>${table(["Sprint", "Planned work", "Lead"], (L.sprints || []).map((r, i) => [SPRINTS[i], r.tasks, r.lead]))}
<h3>Capacity &amp; workload</h3>${table(["Member", "Hrs / week", "Other commitments"], cap.map((r) => [r.member, r.hours, r.other]))}
<h3>Contingency plan</h3><p>${f("contingency")}</p>`;
}

function flashLabel(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = old), 1500);
}
