export async function createM3BPage() {
    const response = await fetch("./src/pages/milestones/m3b/m3b.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const element = container.firstElementChild;
    element.id = "page-milestone-3b";
    element.classList.add("page");

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/milestones/m3b/m3b.css";
    document.querySelector("head").appendChild(css);

    return element;
}
