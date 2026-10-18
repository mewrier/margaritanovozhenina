// ===== Курсор =====
const cursors = document.querySelectorAll(".cursor");

document.addEventListener("mousemove", (event) => {
    cursors.forEach((cursor) => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
    });
});

document.addEventListener("pointerover", (event) => {
    const onTarget = event.target.closest("a, button, .project, .modal__gallery img, .lightbox");
    cursors.forEach((c) => c.classList.toggle("is-active", Boolean(onTarget)));
});


// ===== Карусель квадратиков =====
const container = document.querySelector(".projects");
const originals = [...container.querySelectorAll(".project")];
let projects = [...originals];      // оригиналы + клоны

const settings = {
    speed: 20,          // скорость по вертикали, px/с
    stepRatioX: 0.65,   // шаг между проектами по X (доля от размера)
    stepRatioY: 0.5,    // шаг между проектами по Y
    startY: 283,        // Y первого проекта в статике
    margin: 20,         // запас над верхним краем
    easing: 8,          // плавность остановки/старта при наведении
    offsetXRatio: -0.20 // где линия начинается по X (0.5 = середина ширины)
};

let size, stepX, stepY, slope, offsetX;
let entryY, loopLength, firstOffset;

let travelled = 0;
let paused = false;
let currentSpeed = settings.speed;
let lastTime = 0;

const mod = (a, n) => ((a % n) + n) % n;

function bindHover(element) {
    element.addEventListener("pointerenter", () => { paused = true; });
    element.addEventListener("pointerleave", () => { paused = false; });
}

originals.forEach(bindHover);

function ensureCount(count) {
    while (projects.length < count) {
        const source = originals[projects.length % originals.length];
        const clone = source.cloneNode(true);

        clone.classList.add("is-clone");
        clone.setAttribute("aria-hidden", "true");

        container.appendChild(clone);
        bindHover(clone);
        projects.push(clone);
    }

    while (projects.length > count && projects.length > originals.length) {
        projects.pop().remove();
    }
}

function measure() {
        size = originals[0].offsetWidth || 214;

         const mobile = window.matchMedia("(max-width: 800px)").matches;
    stepX = size * (mobile ? 0.5 : settings.stepRatioX);
    stepY = size * settings.stepRatioY;
    slope = stepX / stepY;

    const width = container.clientWidth;
    const height = container.clientHeight;

         offsetX = mobile ? -(width * 0.65 + 220) : width * settings.offsetXRatio;

    // Вход: проект целиком выше верхнего края, под градиентом
    entryY = -(size + settings.margin);

    // Выход: низ блока или правый край
    const exitY = Math.min(height, entryY + (width - offsetX) / slope);
    const pathLength = exitY - entryY;

    const needed = Math.ceil(pathLength / stepY) + 1;
    const count = Math.ceil(needed / originals.length) * originals.length;

    ensureCount(count);

    loopLength = count * stepY;
       firstOffset = (mobile ? 420 : settings.startY) - entryY;
}

function render() {
    projects.forEach((element, index) => {
        const s = mod(firstOffset + index * stepY + travelled, loopLength);

        const y = entryY + s;
        const x = offsetX + (y - entryY) * slope;

        element.style.translate = `${x}px ${y}px`;
        element.style.setProperty("--z", Math.round(s));
    });
}

function animate(time) {
    if (!lastTime) lastTime = time;

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const targetSpeed = paused ? 0 : settings.speed;
    currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, dt * settings.easing);

    travelled += currentSpeed * dt;

    render();
    requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
    paused = false;
    measure();
    render();
});

measure();
render();
requestAnimationFrame(animate);


// ===== Эффект: буквы слова перемешиваются между собой и встают на место =====
// работает на кнопках навигации и на заголовке «контакты.»
document.querySelectorAll(".navigation a").forEach((link) => {
    const original = link.textContent.trim();
    const chars = original.split("");
    let frame = null;

    link.setAttribute("aria-label", original);

    // фиксируем ширину, чтобы кнопки не дёргались
    document.fonts.ready.then(() => {
        link.style.minWidth = `${link.offsetWidth}px`;
    });

    const shuffle = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    link.addEventListener("pointerenter", () => {
        cancelAnimationFrame(frame);

        const start = performance.now();
        const settleStart = 150;   // сколько мс буквы полностью перемешаны
        const settleStep = 80;     // пауза между встающими на место буквами
        const tickEvery = 60;      // как часто буквы меняются местами, мс
        let lastTick = -Infinity;

        const run = (now) => {
            const t = now - start;

            // сколько букв слева уже встали на место
            const settled = Math.floor((t - settleStart) / settleStep) + 1;
            const count = Math.max(0, Math.min(chars.length, settled));

            if (count >= chars.length) {
                link.textContent = original;
                return;
            }

            if (now - lastTick >= tickEvery) {
                lastTick = now;
                const head = chars.slice(0, count);
                const tail = shuffle(chars.slice(count));
                link.textContent = head.concat(tail).join("");
            }

            frame = requestAnimationFrame(run);
        };

        frame = requestAnimationFrame(run);
    });
});


// ===== Окно проекта =====
let activeModal = null;

function setupModal(modal) {
    const gallery = modal.querySelector(".modal__gallery");
    let target = 0, current = 0, frame = null;

    const maxScroll = () => gallery.scrollWidth - gallery.clientWidth;

    const tick = () => {
        current += (target - current) * 0.12;
        const done = Math.abs(target - current) < 0.5;
        if (done) current = target;
        gallery.scrollLeft = current;
        frame = done ? null : requestAnimationFrame(tick);
    };

    // колесо мыши двигает картинки по горизонтали
    modal.addEventListener("wheel", (e) => {
        if (e.target.closest(".modal__info")) return;   // текст листается как обычно
        e.preventDefault();
        target = Math.max(0, Math.min(maxScroll(), target + e.deltaY + e.deltaX));
        if (frame === null) frame = requestAnimationFrame(tick);
    }, { passive: false });

    // если прокрутили тачпадом или пальцем, синхронизируем положение
    gallery.addEventListener("scroll", () => {
        if (frame === null) current = target = gallery.scrollLeft;
    });

    gallery.reset = () => {
        cancelAnimationFrame(frame);
        frame = null;
        current = target = 0;
        gallery.scrollLeft = 0;
    };
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.querySelector(".modal__gallery").reset();
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    activeModal = modal;
}

function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    activeModal = null;
}

document.querySelectorAll(".modal").forEach(setupModal);

container.addEventListener("click", (e) => {
    const project = e.target.closest("[data-project]");
    if (project) openModal(project.dataset.project);
});

document.addEventListener("click", (e) => {
    if (!activeModal || !activeModal.contains(e.target)) return;
    // закрываем по кнопке или по клику мимо картинок и текста
        if (e.target.closest(".modal__close") || !e.target.closest("img, .modal__info, .fact")) {
        closeModal();
    }
});


// ===== Увеличение картинки =====
let lightbox = document.querySelector(".lightbox");
if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = '<img src="" alt="">';
}
document.body.appendChild(lightbox);   // всегда лежит прямо в body, поверх всех окон

// если стили .lightbox пропали из style.css, подключаем запасные
if (getComputedStyle(lightbox).position !== "fixed") {
    const fallback = document.createElement("style");
    fallback.textContent = `
        .lightbox { position: fixed; inset: 0; z-index: 30000; display: flex;
            align-items: center; justify-content: center;
            background: rgba(255, 255, 255, 0.25);
            -webkit-backdrop-filter: blur(40px); backdrop-filter: blur(40px);
            opacity: 0; visibility: hidden;
            transition: opacity 0.35s ease, visibility 0.35s; }
        .lightbox.is-open { opacity: 1; visibility: visible; }
        .lightbox img { display: block; max-width: 90vw; max-height: 88vh;
            width: auto; height: auto; transform: scale(0.94);
            transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .lightbox.is-open img { transform: none; }
    `;
    document.head.appendChild(fallback);
}
const lightboxImg = lightbox.querySelector("img");

function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
}

function closeLightbox() {
    lightbox.classList.remove("is-open");
}

document.addEventListener("click", (e) => {
    const image = e.target.closest(".modal__gallery img");
    if (image) {
        openLightbox(image.currentSrc || image.src, image.alt);
        return;
    }
    if (e.target.closest(".lightbox")) closeLightbox();
});


// ===== Окна: проекты / опыт / резюме =====
let currentWindow = null;

function showWindow(id, dir = 0) {   // dir: -1 уезжает влево, 1 вправо
    const next = document.getElementById(id);
    if (!next || next === currentWindow) return;

    const shift = 140;               // на сколько px окно уезжает

    if (currentWindow) {
        currentWindow.style.setProperty("--dx", `${dir * shift}px`);
        currentWindow.classList.remove("is-open");
    }

    // новое окно ставим с противоположной стороны без анимации
    const panel = next.querySelector(".list-window__panel");
    panel.style.transition = "none";
    next.style.setProperty("--dx", `${-dir * shift}px`);
    void panel.offsetWidth;
    panel.style.transition = "";

    next.classList.add("is-open");
    document.body.classList.add("modal-open");
    currentWindow = next;
}

function closeWindow() {
    if (!currentWindow) return;
    currentWindow.style.setProperty("--dx", "0px");
    currentWindow.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    currentWindow = null;
}

// кнопки в шапке: проекты, опыт, резюме
document.querySelectorAll("[data-open]").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();          // не прыгаем по якорю
        showWindow(link.dataset.open);
    });
});

// кнопки «перейти к…» внутри окон
document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
        const sides = { left: -1, right: 1, center: 0 };
        showWindow(button.dataset.go, sides[button.dataset.side] ?? 1);
    });
});

// закрываем по >> или по клику мимо белой панели
document.addEventListener("click", (e) => {
    if (!currentWindow || !currentWindow.contains(e.target)) return;
    if (e.target.closest(".list-window__close") || !e.target.closest(".list-window__panel")) {
        closeWindow();
    }
});

// Esc: сначала увеличенная картинка, потом окно проекта, потом окно со списком
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (lightbox.classList.contains("is-open")) closeLightbox();
    else if (activeModal) closeModal();
    else closeWindow();
});


// ===== Открытие проекта поверх списка =====
document.querySelectorAll("[data-project-link]").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(link.dataset.projectLink);
    });
});

// ===== Короткое название растёт в одну строку до края блока =====
function fitTitles() {
    const mobile = window.matchMedia("(max-width: 800px)").matches;

    document.querySelectorAll(".modal__bottom .modal__info").forEach((info) => {
        const title = info.querySelector("h2");
        if (!title) return;

        // сбрасываем прошлые настройки
        title.style.fontSize = "";
        title.style.whiteSpace = "";
        title.style.width = "";
        title.style.maxWidth = "";
        if (mobile) return;

        const cs = getComputedStyle(info);
        const maxW = info.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const maxH = info.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        if (maxW <= 0 || maxH <= 0) return;

        const base = parseFloat(getComputedStyle(title).fontSize);

        // длинные названия, которые и так идут в несколько строк, не трогаем
        if (title.offsetHeight > base * 1.2 * 1.5) return;

        // подбираем самый крупный размер, при котором название влезает в одну строку
        title.style.whiteSpace = "nowrap";
        title.style.width = "max-content";
        title.style.maxWidth = "none";

        let low = base;
        let high = 80;
        for (let i = 0; i < 20; i++) {
            const mid = (low + high) / 2;
            title.style.fontSize = `${mid}px`;
            if (title.offsetWidth <= maxW && title.offsetHeight <= maxH) low = mid;
            else high = mid;
        }

        title.style.fontSize = `${low}px`;
        title.style.width = "";
        title.style.maxWidth = "";
    });
}

// document.fonts.ready.then(fitTitles);
// window.addEventListener("resize", fitTitles);

// ===== Кнопки >> и << в каждом окне проекта =====
const allModals = [...document.querySelectorAll(".modal")];

function makeNavButton(modal, target, className, label, ariaLabel) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);

    button.addEventListener("click", (e) => {
        e.stopPropagation();       // чтобы клик не закрыл окно
        closeModal();
        openModal(target.id);
    });

    modal.appendChild(button);
}

allModals.forEach((modal, i) => {
    const next = allModals[(i + 1) % allModals.length];                      // после последнего снова первое
    const prev = allModals[(i - 1 + allModals.length) % allModals.length];   // перед первым последнее

    makeNavButton(modal, prev, "modal__prev", "<<", "назад");
    makeNavButton(modal, next, "modal__next", ">>", "далее");
});

// ===== Иконки: почта раскрывается и копируется одним нажатием =====
const social = document.querySelector(".social");
const mailButton = document.querySelector(".social__mail");
const mailAddress = document.querySelector(".social__address");

mailButton.addEventListener("click", () => {
    social.classList.toggle("is-mail-open");
});

mailAddress.addEventListener("click", async () => {
    const text = mailAddress.textContent.trim();

    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // запасной способ, если браузер не разрешает clipboard
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
    }

    // на секунду показываем, что скопировано
    mailAddress.textContent = "скопировано";
    setTimeout(() => { mailAddress.textContent = text; }, 1200);
});

// ===== Каомодзи подтягиваются к курсору =====
const kaomojis = [...document.querySelectorAll(".kaomoji span")];

const pull = {
    maxShift: 14,    // насколько сильно подтягиваются, px
    falloff: 600,    // как быстро сила спадает с расстоянием (больше число, тем равномернее)
    minStrength: 0.35, // насколько сильно тянутся самые дальние (0 = совсем не тянутся, 1 = так же, как ближние)
    smooth: 0.12,    // плавность: меньше число, медленнее и мягче
    shadow: 0.6      // насколько тень смещается от курсора
};

const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
              && !window.matchMedia("(pointer: coarse)").matches;
let mouse = null;

document.addEventListener("mousemove", (e) => {
    mouse = { x: e.clientX, y: e.clientY };
});

document.addEventListener("mouseleave", () => { mouse = null; });

const state = kaomojis.map(() => ({ dx: 0, dy: 0 }));

function pullKaomoji() {
    kaomojis.forEach((el, i) => {
        const s = state[i];
        let targetX = 0, targetY = 0;

        if (mouse) {
            // положение каомодзи без учёта текущего смещения
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - s.dx;
            const cy = rect.top + rect.height / 2 - s.dy;

            const vx = mouse.x - cx;
            const vy = mouse.y - cy;
            const dist = Math.hypot(vx, vy);

                       if (dist > 0) {
                // рядом с курсором сила 1, вдали плавно падает, но не ниже minStrength
                const fade = Math.max(0, 1 - dist / (pull.falloff * 2));
                const strength = pull.minStrength + (1 - pull.minStrength) * fade;
                targetX = (vx / dist) * strength * pull.maxShift;
                targetY = (vy / dist) * strength * pull.maxShift;
            }
        }

        s.dx += (targetX - s.dx) * pull.smooth;
        s.dy += (targetY - s.dy) * pull.smooth;

        el.style.setProperty("--dx", `${s.dx.toFixed(2)}px`);
        el.style.setProperty("--dy", `${s.dy.toFixed(2)}px`);
        el.style.setProperty("--sx", `${(-s.dx * pull.shadow).toFixed(2)}px`);
        el.style.setProperty("--sy", `${(-s.dy * pull.shadow).toFixed(2)}px`);
    });

    requestAnimationFrame(pullKaomoji);
}

if (motionOk && kaomojis.length) requestAnimationFrame(pullKaomoji);

// ===== Листалка картинок: счётчик «1 / N» под галереей =====
document.querySelectorAll(".modal").forEach((modal) => {
    const gallery = modal.querySelector(".modal__gallery");
    const images = [...gallery.querySelectorAll("img")];
    if (images.length < 2) return;       // если картинка одна, счётчик не нужен

    const counter = document.createElement("div");
    counter.className = "modal__counter";
    counter.textContent = `1 / ${images.length}`;
    gallery.after(counter);

    const update = () => {
        const left = gallery.getBoundingClientRect().left;
        let best = 0, bestDist = Infinity;

        images.forEach((img, i) => {
            const dist = Math.abs(img.getBoundingClientRect().left - left - 20);
            if (dist < bestDist) { bestDist = dist; best = i; }
        });

        counter.textContent = `${best + 1} / ${images.length}`;
    };

    gallery.addEventListener("scroll", update, { passive: true });
});

// ===== Резюме: открывается картинкой, а не скачивается =====
document.querySelectorAll("[data-resume]").forEach((el) => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        openLightbox("img/resume.png", "резюме");
    });
});