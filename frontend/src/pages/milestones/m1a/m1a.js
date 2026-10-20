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


    to_list_m1a(element)
    report_tool_m1a(element)

    return element;
}


function to_list_m1a(element){
    
    const to_do_m1a_btn = element.querySelector("#tm_to_do_m1a_btn")
    const tool_m1a_btn = element.querySelector("#tm_report_tool_btn")
    const to_do_m1a_lis = element.querySelector("#to_do_m1a")
    const report_tool_tab_m1a = element.querySelector("#report_tool_m1a")


    if (to_do_m1a_btn && to_do_m1a_lis) {
        to_do_m1a_btn.addEventListener("click", () => {
            console.log('to do')
            to_do_m1a_btn.classList.add("active");
            tool_m1a_btn.classList.remove("active");

            to_do_m1a_lis.style.display = "block";
            report_tool_tab_m1a.style.display = "none";

        })
    }
}


function report_tool_m1a(element){
    const to_do_m1a_btn = element.querySelector("#tm_to_do_m1a_btn")
    const tool_m1a_btn = element.querySelector("#tm_report_tool_btn")
    const to_do_m1a_lis = element.querySelector("#to_do_m1a")
    const report_tool_tab_m1a = element.querySelector("#report_tool_m1a")


    if (tool_m1a_btn  && report_tool_tab_m1a) {
        tool_m1a_btn.addEventListener("click", () => {
            console.log('tool')
            tool_m1a_btn.classList.add("active");
            to_do_m1a_btn.classList.remove("active");

            to_do_m1a_lis.style.display = "none";
            report_tool_tab_m1a.style.display = "block";

        })
    }
}