import {getUser} from "../../../utils/auth.js";   

export async function createM0APage() {
    const response = await fetch("./src/pages/milestones/m0a/m0a.html");
    const html = await response.text();
    const container = document.createElement("div");
    const user = getUser();
    container.innerHTML = html;

    const element = container.firstElementChild;
    element.id = "page-milestone-0a";
    element.classList.add("page");

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/pages/milestones/m0a/m0a.css";
    document.querySelector("head").appendChild(css);

    // const teamLeadInput = element.querySelector("#team_lead");
    // if (user && teamLeadInput) {
    //     teamLeadInput.value = user.email;
    // }
    
    createTeam(element);
    existingTeam(element);
    findTeammates(element)

    return element;
}


function createTeam(element) {
    const tmCreateBtn = element.querySelector("#tm_create_btn");
    const createTmDiv = element.querySelector("#create_tm");

    if (tmCreateBtn && createTmDiv) {
        tmCreateBtn.addEventListener("click", () => {
            createTmDiv.style.display = "block";
            element.querySelector("#find_tm").style.display = "none";
            tmCreateBtn.classList.add("active");
            element.querySelector("#tm_find_btn").classList.remove("active");
        });
    }

    // Implementation for creating a team
    const createTeamBtn = element.querySelector("#create_team_button");
    const createTeamForm = element.querySelector("#create_team_form");
    const submitTeamBtn = element.querySelector("#submit_team");
    const teamLeadInput = element.querySelector("#team_lead");
    const feedbackDiv = element.querySelector("#team_feedback");
   

    

    if (createTeamBtn && createTeamForm) {
        createTeamBtn.addEventListener("click", () => {
            const isHidden = createTeamForm.style.display === "none";
            createTeamForm.style.display = isHidden ? "block" : "none";

            const user = getUser();
            if (user && teamLeadInput) {
            teamLeadInput.value = user.email;
        }
        });
    }

    submitTeamBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        if (feedbackDiv) feedbackDiv.textContent = "Submitting...";

        const data = {
            lead: teamLeadInput.value,
            member1: element.querySelector('[name="member1"]').value,
            member2: element.querySelector('[name="member2"]').value,
            member3: element.querySelector('[name="member3"]').value
        };

        try {
            const response = await fetch(
                "https://dtd-prod.vercel.app/api/teams",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const result = await response.json();

            if (feedbackDiv) {
                feedbackDiv.textContent = result.message;
                feedbackDiv.style.color = result.success ? "green" : "red";

                if (result.success) {
                    createTeamForm.style.display = "none";
                }
            }

            console.log(result);
        } catch (error) {
            if (feedbackDiv) {
                feedbackDiv.textContent = "An error occurred while submitting.";
                feedbackDiv.style.color = "red";
            }
            console.error(error);
        }
    })
}

function existingTeam(element) {
    const teamsListDiv = element.querySelector("#existing_teams");

    async function fetchTeams() {
        try {
            const response = await fetch("https://dtd-prod.vercel.app/api/all_teams");
            const teams = await response.json();
            const user = getUser();

            if (!teamsListDiv) return;
            teamsListDiv.innerHTML = "";

            teams.forEach(team => {
                const teamCard = document.createElement("div");
                teamCard.className = "team_card";

                const membersCount = team.members ? team.members.length : 0;

                // Check if the current user is a member of this team
                const isMember = user && team.members && team.members.some(m => m.email === user.email);

                teamCard.innerHTML = `
                    <div class="team_info">Team ${team.team_no} - Members: ${membersCount}/4</div>
                    <div class="team_actions">
                        <button class="view_team_btn">View Team</button>
                        ${isMember ? '<button class="exit_team_btn">Exit Team</button>' : ''}
                    </div>
                `;

                const viewBtn = teamCard.querySelector(".view_team_btn");
                viewBtn.addEventListener("click", () => {
                    showTeamPopup(team);
                });

                if (isMember) {
                    const exitBtn = teamCard.querySelector(".exit_team_btn");
                    exitBtn.addEventListener("click", async () => {
                        if (confirm("Are you sure you want to exit this team?")) {
                            await exitTeam(user.email, fetchTeams);
                        }
                    });
                }

                teamsListDiv.appendChild(teamCard);
            });
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    }

    function showTeamPopup(team) {
        const popup = document.createElement("div");
        popup.className = "team_popup_overlay";
        const user = getUser();

        const membersList = (team.members || [])
            .map(m => `<li>${m.email} (${m.role})</li>`)
            .join("");

        const isLead = user && team.members && team.members.some(m => m.email === user.email && m.role === "Lead");

        popup.innerHTML = `
            <div class="team_popup_content">
                <h3>Team ${team.team_no} Details</h3>
                <div class="problem-stmt-container">
                    <p><strong>Problem Statement:</strong> <span id="problem_text">${team.team_problem_stmt || "Not yet defined"}</span></p>
                    ${isLead ? `
                        <div class="edit-stmt-controls">
                            <input type="text" id="new_problem_stmt" placeholder="Enter problem statement..." style="display:none; width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                            <button id="edit_stmt_btn" class="view_team_btn">Edit Statement</button>
                            <button id="save_stmt_btn" class="view_team_btn" style="display:none; background: green;">Save</button>
                            <button id="cancel_stmt_btn" class="view_team_btn" style="display:none; background: #666;">Cancel</button>
                        </div>
                    ` : ''}
                </div>
                <ul style="margin-top: 1.5rem;">${membersList}</ul>
                <button class="close_popup">Close</button>
            </div>
        `;

        if (isLead) {
            const editBtn = popup.querySelector("#edit_stmt_btn");
            const saveBtn = popup.querySelector("#save_stmt_btn");
            const cancelBtn = popup.querySelector("#cancel_stmt_btn");
            const input = popup.querySelector("#new_problem_stmt");
            const problemText = popup.querySelector("#problem_text");

            editBtn.addEventListener("click", () => {
                input.style.display = "block";
                input.value = team.team_problem_stmt || "";
                editBtn.style.display = "none";
                saveBtn.style.display = "inline-block";
                cancelBtn.style.display = "inline-block";
                input.focus();
            });

            cancelBtn.addEventListener("click", () => {
                input.style.display = "none";
                editBtn.style.display = "inline-block";
                saveBtn.style.display = "none";
                cancelBtn.style.display = "none";
            });

            saveBtn.addEventListener("click", async () => {
                const newStmt = input.value;
                try {
                    const response = await fetch("https://dtd-prod.vercel.app/api/update_problem_stmt", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            team_id: team.id,
                            problem_stmt: newStmt
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        problemText.textContent = newStmt;
                        input.style.display = "none";
                        editBtn.style.display = "inline-block";
                        saveBtn.style.display = "none";
                        cancelBtn.style.display = "none";
                        alert("Problem statement updated!");
                    } else {
                        alert(result.message || "Failed to update statement.");
                    }
                } catch (error) {
                    console.error("Error updating statement:", error);
                    alert("An error occurred.");
                }
            });
        }

        popup.querySelector(".close_popup").addEventListener("click", () => {
            document.body.removeChild(popup);
        });

        document.body.appendChild(popup);
    }

    fetchTeams();
}

function findTeammates(element) {
    const tmFindBtn = element.querySelector("#tm_find_btn");
    const findTmDiv = element.querySelector("#find_tm");

    if (tmFindBtn && findTmDiv) {
        tmFindBtn.addEventListener("click", () => {
            findTmDiv.style.display = "block";
            element.querySelector("#create_tm").style.display = "none";
            tmFindBtn.classList.add("active");
            element.querySelector("#tm_create_btn").classList.remove("active");
        });
    }

    const teammatesList = element.querySelector("#teammates_list");
    const searchInput = element.querySelector(".search-row input");
    let allTeammates = [];

    async function fetchTeammates() {
        try {
            const response = await fetch("https://dtd-prod.vercel.app/api/find_teammates");
            allTeammates = await response.json();

            renderTeammates(allTeammates);
        } catch (error) {
            console.error("Error fetching teammates:", error);
            if (teammatesList) {
                teammatesList.innerHTML = "<li>Error loading teammates.</li>";
            }
        }
    }

    function renderTeammates(list) {
        if (!teammatesList) return;
        teammatesList.innerHTML = "";

        if (!list || list.length === 0) {
            teammatesList.innerHTML = "<li>No teammates found.</li>";
            return;
        }

        list.forEach(student => {
            const li = document.createElement("li");
            li.className = "teammate";
            li.innerHTML = `
                <span class="teammate-name">${student.name || 'Unknown'}</span>
                <span class="teammate-email">${student.email}</span>
            `;
            teammatesList.appendChild(li);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allTeammates.filter(student =>
                (student.email && student.email.toLowerCase().includes(term)) ||
                (student.name && student.name.toLowerCase().includes(term))
            );
            renderTeammates(filtered);
        });
    }

    fetchTeammates();
}
   
async function exitTeam(userEmail, callback) {
    try {
        const response = await fetch(`https://dtd-prod.vercel.app/api/exit_team/${userEmail}`, {
            method: "POST",
        });
        const result = await response.json();

        if (result.success) {
            alert("Successfully exited the team.");
            if (callback) await callback();
        } else {
            alert(result.message || "Failed to exit the team.");
        }
    } catch (error) {
        console.error("Error exiting team:", error);
        alert("An error occurred while trying to exit the team.");
    }
}