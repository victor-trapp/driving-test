// Applies the saved theme before the app loads so there's no flash of the wrong one.
// Kept as an external file because the Content Security Policy blocks inline scripts.
(function () {
  try {
    var theme = localStorage.getItem("theory-theme") || "system";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {
    /* storage blocked: fall back to light */
  }
})();
