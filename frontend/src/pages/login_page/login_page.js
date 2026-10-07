export async function createLoginPage() {
    // Add Style 
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/login_page/login_page.css";
    document.querySelector("head").appendChild(css);
    
    // Add HTML
    const response = await fetch("./src/pages/login_page/login_page.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;
    
    // Add Functionality
    // loginFunctionality(container);
    return container.firstElementChild
}

export function loginFunctionality(container) {

    const form = container.querySelector("#login-form");
    const errorMessage = container.querySelector("#login-error");

    return new Promise((resolve) => {

        form.addEventListener("submit", async (event) => {

            event.preventDefault();

            const email = form.email.value;
            const password = form.password.value;

            const response = await fetch(
                "https://dtd-app-api-psi.vercel.app/api/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (data.success) {

                resolve(data);

            } else {

                errorMessage.textContent = data.message;
            }
        });
    });
}