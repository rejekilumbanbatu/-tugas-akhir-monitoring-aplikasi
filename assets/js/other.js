// =====================================================
// other.js
// Fungsi tambahan untuk tampilan dashboard
// =====================================================

/**
 * 1. Highlight menu sidebar yang aktif
 */
function setActiveMenu() {
    const path = window.location.pathname;

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.href.includes(path));
    });
}
setActiveMenu();


/**
 * 2. Tombol kembali ke atas (scroll top)
 */
(function createScrollTopBtn() {
    const scrollBtn = document.createElement("button");
    scrollBtn.innerHTML = "⬆";
    scrollBtn.id = "scrollTopBtn";

    Object.assign(scrollBtn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "45px",
        height: "45px",
        borderRadius: "50%",
        border: "none",
        display: "none",
        background: "#0A66FF",
        color: "white",
        fontSize: "20px",
        cursor: "pointer",
        zIndex: "1000",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
    });

    document.body.appendChild(scrollBtn);

    window.addEventListener("scroll", () => {
        scrollBtn.style.display = (document.documentElement.scrollTop > 200) ? "block" : "none";
    });

    scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();


/**
 * 3. Efek fade-in pada card saat muncul
 */
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".custom-card");

    cards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "opacity 0.6s ease, transform 0.6s ease";

        setTimeout(() => {
            requestAnimationFrame(() => {
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            });
        }, 150 * index); // delay bertahap tiap card
    });
});


/**
 * 4. Helper: format angka
 */
function formatNumber(value, decimals = 2) {
    if (value == null || isNaN(value)) return "0.00";
    return parseFloat(value).toFixed(decimals);
}
