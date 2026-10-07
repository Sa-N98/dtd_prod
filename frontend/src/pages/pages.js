// Add common styles for all pages


export function initPages() {
const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/pages.css";
    document.querySelector("head").appendChild(css);
}