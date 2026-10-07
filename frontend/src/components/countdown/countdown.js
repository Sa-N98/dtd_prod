import { DATE_CONFIG } from "../../Configs/date.js";

export async function createTimer() {
    // Add Style
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "./src/components/countdown/countdown.css";
    document.querySelector("head").appendChild(css);

    // Add HTML
    const response = await fetch("./src/components/countdown/countdown.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const element = container.firstElementChild;

    // Add Functionality
    const label = k => {
        const m = /Milestone-(\d)([ab])?/i.exec(k);
        return m ? {
            short: 'M' + m[1] + (m[2] ? '.' + m[2].toUpperCase() : ''),
            long: 'Milestone ' + m[1] + (m[2] ? m[2].toUpperCase() : '')
        } : { short: k, long: k };
    };

    const list = Object.entries(DATE_CONFIG.milestones)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, k]) => ({ ...label(k), at: new Date(d + 'T23:59:59') }));

    const track = element.querySelector('.c-track');
    const pad = n => String(n).padStart(2, '0');

    const updateTimeline = (now, next, step, idx, n) => {
        const pos = (n - 0.5) / n;
        let currentPos = pos;
        if (next) {
            currentPos = (idx + 0.5 + step) / n;
        }

        track.style.setProperty('--n', n);
        element.querySelector('.c-fill').style.width = element.querySelector('.c-mark').style.left = currentPos * 100 + '%';
        element.querySelector('.c-pct').textContent = next ? Math.round(step * 100) + '% of the way to ' + next.short : 'All milestones complete';

        element.querySelector('.c-dots').innerHTML = '<div class="c-dot done"></div>' + list.map(m =>
            `<div class="c-dot ${m.at <= now ? 'done' : m === next ? 'next' : ''}">${m.short}</div>`
        ).join('');

        if (!next) {
            element.querySelector('.c-title').textContent = 'All milestones submitted';
        } else {
            element.querySelector('.c-title').textContent = 'Till ' + next.long + ' submission';
        }
    };

    const updateClock = (now, next, step) => {
        const ff = document.getElementById('ff-now');
        if (ff) ff.textContent = now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }) + ' · ' + Math.round(step * 100) + '%';

        if (!next) {
            ['days', 'hours', 'mins', 'secs'].forEach(u => {
                element.querySelector('.c-' + u).textContent = '00';
            });
            return;
        }

        let s = Math.floor((next.at - now) / 1000);
        element.querySelector('.c-days').textContent = pad(Math.floor(s / 86400));
        element.querySelector('.c-hours').textContent = pad(Math.floor(s % 86400 / 3600));
        element.querySelector('.c-mins').textContent = pad(Math.floor(s % 3600 / 60));
        element.querySelector('.c-secs').textContent = pad(s % 60);
    };

    const tick = () => {
        const now = new Date();
        const next = list.find(m => m.at > now);
        const n = list.length + 1;
        const idx = next ? list.indexOf(next) : n;

        let step = 0;
        if (next) {
            const prev = idx ? list[idx - 1].at : new Date(DATE_CONFIG.start + 'T00:00:00');
            step = Math.floor(Math.min(1, Math.max(0, (now - prev) / (next.at - prev))) * 20) / 20;
        }

        updateClock(now, next, step);

        // Update timeline only once a day (at midnight) or on first load
        if (!window.lastTimelineUpdate || new Date().getDate() !== new Date(window.lastTimelineUpdate).getDate()) {
            updateTimeline(now, next, step, idx, n);
            window.lastTimelineUpdate = now;
        }
    };

    setInterval(tick, 1000);
    tick();

    return {
        element: element,
        updateConfig: (newConfig) => {
            console.log("Config update requested", newConfig);
        }
    };
}
