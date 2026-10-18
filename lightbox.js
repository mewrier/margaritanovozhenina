// Увеличение картинок из окон проектов. Работает сам по себе и не зависит от script.js.
(() => {
    let box = document.querySelector(".lightbox");
    if (!box) {
        box = document.createElement("div");
        box.className = "lightbox";
        box.innerHTML = '<img src="" alt="">';
    }
    document.body.appendChild(box);   // всегда лежит прямо в body, поверх всех окон
    const boxImg = box.querySelector("img");

    const close = () => box.classList.remove("is-open");

    // клик по картинке в галерее открывает её, клик по слою закрывает
    document.addEventListener("click", (e) => {
        const image = e.target.closest(".modal__gallery img");
        if (image) {
            boxImg.src = image.currentSrc || image.src;
            boxImg.alt = image.alt || "";
            box.classList.add("is-open");
            return;
        }
        if (e.target.closest(".lightbox")) close();
    });

    // Esc закрывает только увеличенную картинку, а окно проекта остаётся
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && box.classList.contains("is-open")) {
            close();
            e.stopImmediatePropagation();
        }
    }, true);
})();
