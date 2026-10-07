import { createNavbar } from "./components/navbar/navbar.js";
import { createTimer } from "./components/countdown/countdown.js";

import { createHomePage } from "./pages/home/home.js";
import { createAboutPage } from "./pages/about/about.js";
import { createSettingsPage } from "./pages/settings/settings.js";
import { createLoginPage } from "./pages/login_page/login_page.js";
import { loginFunctionality } from "./pages/login_page/login_page.js";

import { createM0APage } from "./pages/milestones/m0a/m0a.js";
import { createM1APage } from "./pages/milestones/m1a/m1a.js";
import { createM1BPage } from "./pages/milestones/m1b/m1b.js";
import { createM2APage } from "./pages/milestones/m2a/m2a.js";
import { createM2BPage } from "./pages/milestones/m2b/m2b.js";
import { createM3APage } from "./pages/milestones/m3a/m3a.js";
import { createM3BPage } from "./pages/milestones/m3b/m3b.js";

import {initPages} from "./pages/pages.js";
import { saveUser } from "./utils/auth.js";
import { getUser } from "./utils/auth.js";




const app = document.querySelector("#app");


// Create components in parallel to avoid network waterfalls
const [
    navbar,
    timer,
    homePage,
    aboutPage,
    settingsPage,
    loginPage,
    m0aPage,
    m1aPage,
    m1bPage,
    m2aPage,
    m2bPage,
    m3aPage,
    m3bPage
] = await Promise.all([
    createNavbar(),
    createTimer(),
    createHomePage(),
    createAboutPage(),
    createSettingsPage(),
    createLoginPage(),
    createM0APage(),
    createM1APage(),
    createM1BPage(),
    createM2APage(),
    createM2BPage(),
    createM3APage(),
    createM3BPage()
]);


// Place components


const pageContainer = app.querySelector("page-container");



var loginPageContainer = document.getElementById("login_page");
loginPageContainer.appendChild(loginPage);

const user = getUser();


if (user.user_id && user.role && user.email) {
    loginPageContainer.remove();
    initPages();
    app.querySelector("nav-bar").appendChild(timer.element);
    app.querySelector("nav-bar").appendChild(navbar);
    pageContainer.appendChild(homePage);
    pageContainer.appendChild(aboutPage);
    pageContainer.appendChild(settingsPage);
    pageContainer.appendChild(m0aPage);
    pageContainer.appendChild(m1aPage);
    pageContainer.appendChild(m1bPage);
    pageContainer.appendChild(m2aPage);
    pageContainer.appendChild(m2bPage);
    pageContainer.appendChild(m3aPage);
    pageContainer.appendChild(m3bPage);
} else {
   const login_data = await loginFunctionality(loginPage);


    if (login_data.success) {
        loginPageContainer.remove();

        saveUser(login_data);
        
        initPages();
        app.querySelector("nav-bar").appendChild(navbar);
        pageContainer.appendChild(homePage);
        pageContainer.appendChild(aboutPage);
        pageContainer.appendChild(settingsPage);
        pageContainer.appendChild(m0aPage);
        pageContainer.appendChild(m1aPage);
        pageContainer.appendChild(m1bPage);
        pageContainer.appendChild(m2aPage);
        pageContainer.appendChild(m2bPage);
        pageContainer.appendChild(m3aPage);
        pageContainer.appendChild(m3bPage);
        console.log("Login successful");

} 
}
