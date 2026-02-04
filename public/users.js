// Add user list functionality here if needed
document.addEventListener("DOMContentLoaded", () => {
    const backButton = document.getElementById("back-button");
    if (backButton) {
        backButton.addEventListener("click", () => {
            window.location.href = "/";
        });
    }
});
