export function saveUser(user) {
    localStorage.setItem("user_id", user.user_id);
    localStorage.setItem("role", user.role);
    localStorage.setItem("email", user.user_email);
    localStorage.setItem("is_leading_team", user.is_leading_team);
}

export function getUser() {
    return {
        user_id: localStorage.getItem("user_id"),
        role: localStorage.getItem("role"),
        email: localStorage.getItem("email"),
        is_leading_team: localStorage.getItem("is_leading_team")
    };
}

export function logout() {
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("is_leading_team");
}