/**
 * DMC Medical Supplies - Fun Facts Counter
 */

document.addEventListener("DOMContentLoaded", function () {
    const counterElements = document.querySelectorAll(".fun-fact-number");
    if (counterElements.length === 0) return;

    const animateCounter = (el) => {
        const target = +el.getAttribute("data-target");
        if (isNaN(target)) return;

        const isNoComma = el.getAttribute("data-no-comma") === "true" || (target > 1900 && target < 2100);
        const duration = 2000; // ms
        const frameRate = 1000 / 60;
        const totalFrames = Math.round(duration / frameRate);
        let frame = 0;

        const counterInterval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const currentCount = Math.round(target * (1 - Math.pow(1 - progress, 3))); // easeOutCubic

            el.textContent = isNoComma ? currentCount.toString() : currentCount.toLocaleString();

            if (frame === totalFrames) {
                clearInterval(counterInterval);
                el.textContent = isNoComma ? target.toString() : target.toLocaleString();
            }
        }, frameRate);
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        counterElements.forEach(el => observer.observe(el));
    } else {
        counterElements.forEach(el => animateCounter(el));
    }
});
