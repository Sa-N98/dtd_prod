export async function createSettingsPage() {
    // Add Style 
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/settings/settings.css";
    document.querySelector("head").appendChild(css);
    
    // Add HTML
    const response = await fetch("./src/pages/settings/settings.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;
    
    // Add Functionality



    return container.firstElementChild
}   