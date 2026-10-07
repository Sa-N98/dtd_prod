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

    return element;
}
