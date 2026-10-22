const STORAGE_KEY = "m1b_todo_v1";

/* ---------------------------------------------------------------
   RESOURCES
   Add your reference links here. Each entry becomes a card on the
   Resources tab, grouped by "category".

   { title: "Link title", url: "https://...", category: "Personas", note: "One line about it" },
---------------------------------------------------------------- */
const RESOURCES = [
    {
        title: "Example Canvas 1: DT Team (PDF)",
        url: "./src/pages/milestones/m1b/resources/DT_Team_Mural.pdf",
        category: "Examples",
        note: "A completed Mural canvas with personas, journey maps and a list of problems.",
    }
];

export async function createM1BPage() {
    const response = await fetch("./src/pages/milestones/m1b/m1b.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const element = container.firstElementChild;
    element.id = "page-milestone-1b";
    element.classList.add("page");

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/milestones/m1b/m1b.css";
    document.querySelector("head").appendChild(css);

    const state = loadState();
    setupTabs(element);
    setupTodo(element, state);
    renderResources(element);

    return element;
}

/* ---------- state ---------- */

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { todo: {}, ...JSON.parse(raw) };
    } catch (e) {
        console.warn("Could not load saved ticks", e);
    }
    return { todo: {} };
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("Could not save ticks", e);
    }
}

/* ---------- tabs ---------- */

function setupTabs(element) {
    const todoBtn = element.querySelector("#tm_to_do_m1b_btn");
    const resBtn = element.querySelector("#tm_resources_m1b_btn");
    const todoPane = element.querySelector("#to_do_m1b");
    const resPane = element.querySelector("#resources_m1b");

    function show(which) {
        const isTodo = which === "todo";
        todoBtn.classList.toggle("active", isTodo);
        resBtn.classList.toggle("active", !isTodo);
        todoPane.style.display = isTodo ? "block" : "none";
        resPane.style.display = isTodo ? "none" : "block";
    }

    todoBtn.addEventListener("click", () => show("todo"));
    resBtn.addEventListener("click", () => show("resources"));
}

/* ---------- to do ---------- */

function setupTodo(element, state) {
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
            saveState(state);
        });
    });

    refresh();
}

/* ---------- resources ---------- */

function renderResources(element) {
    const box = element.querySelector("#resource-list");
    box.innerHTML = "";

    const valid = RESOURCES.filter((r) => {
        const url = (r.url || "").trim();
        return /^https?:\/\//i.test(url) || url.startsWith("./") || url.startsWith("/");
    });
    if (!valid.length) {
        const empty = document.createElement("p");
        empty.className = "res-empty";
        empty.textContent = "Resources will be added here.";
        box.appendChild(empty);
        return;
    }

    const groups = new Map();
    valid.forEach((r) => {
        const cat = r.category || "General";
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(r);
    });

    groups.forEach((items, cat) => {
        const group = document.createElement("div");
        group.className = "res-group";

        const heading = document.createElement("h4");
        heading.textContent = cat;

        const list = document.createElement("ul");
        list.className = "res-list";

        items.forEach((r) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "res-link";
            a.href = r.url.trim();
            a.target = "_blank";
            a.rel = "noopener noreferrer";

            const text = document.createElement("div");
            const title = document.createElement("span");
            title.className = "res-title";
            title.textContent = r.title || r.url;
            text.appendChild(title);
            if (r.note) {
                const note = document.createElement("span");
                note.className = "res-note";
                note.textContent = r.note;
                text.appendChild(note);
            }

            const arrow = document.createElement("span");
            arrow.className = "res-arrow";
            arrow.textContent = "Open \u2192";

            a.append(text, arrow);
            li.appendChild(a);
            list.appendChild(li);
        });

        group.append(heading, list);
        box.appendChild(group);
    });
}