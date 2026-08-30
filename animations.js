// ============================================
// ANIMATION ENGINE — Celebrate Cinema 2026
// ============================================

// ──────────── PARTICLE SYSTEM (Cinema Bokeh) ────────────
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.running = true;
        this.colors = [
            { r: 175, g: 25, b: 150 },   // Magenta
            { r: 233, g: 30, b: 140 },    // Hot Pink
            { r: 212, g: 168, b: 67 },    // Gold
            { r: 248, g: 200, b: 232 },   // Light Pink
            { r: 140, g: 60, b: 180 },    // Purple
        ];
        this._resize();
        this._init();
        this._animate();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _init() {
        const count = Math.min(50, Math.floor(window.innerWidth / 30));
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this._createParticle());
        }
    }

    _createParticle() {
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            radius: Math.random() * 3 + 1,
            color,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.25 - 0.05,
            baseOpacity: Math.random() * 0.35 + 0.05,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.015 + 0.005,
            glowRadius: Math.random() * 8 + 4
        };
    }

    _animate() {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.phase += p.phaseSpeed;

            // Wrap edges
            if (p.y < -20) { p.y = this.canvas.height + 20; p.x = Math.random() * this.canvas.width; }
            if (p.x < -20) p.x = this.canvas.width + 20;
            if (p.x > this.canvas.width + 20) p.x = -20;

            const opacity = p.baseOpacity + Math.sin(p.phase) * 0.12;
            const { r, g, b } = p.color;

            // Outer glow
            const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius);
            grad.addColorStop(0, `rgba(${r},${g},${b},${opacity * 0.6})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

            // Core dot
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, opacity * 1.8)})`;
            this.ctx.fill();
        }

        requestAnimationFrame(() => this._animate());
    }

    destroy() {
        this.running = false;
    }
}

// ──────────── CONFETTI BURST ────────────
class ConfettiBurst {
    static COLORS = ['#af1996', '#e91e8c', '#d4a843', '#f8c8e8', '#4a1942', '#ff6b9d', '#c44dff', '#ffd700'];

    static fire(count = 120) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => ConfettiBurst._createPiece(), Math.random() * 600);
        }
    }

    static _createPiece() {
        const el = document.createElement('div');
        const size = Math.random() * 8 + 4;
        const startX = 40 + Math.random() * 20;
        const drift = (Math.random() - 0.5) * 200;
        const duration = Math.random() * 2.5 + 2;
        const rotation = Math.random() * 720 - 360;
        const color = ConfettiBurst.COLORS[Math.floor(Math.random() * ConfettiBurst.COLORS.length)];

        el.style.cssText = `
            position:fixed; z-index:99999; pointer-events:none;
            width:${size}px; height:${size * (Math.random() * 0.6 + 0.6)}px;
            background:${color};
            left:${startX}vw; top:-12px;
            border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
            opacity:1;
            animation: confettiFall ${duration}s cubic-bezier(.25,.46,.45,.94) forwards;
            --drift: ${drift}px;
            --rotation: ${rotation}deg;
        `;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }
}

// ──────────── SCROLL REVEAL ────────────
class ScrollRevealManager {
    constructor() {
        this.observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
    }

    observe(selector) {
        document.querySelectorAll(selector).forEach(el => this.observer.observe(el));
    }
}

// ──────────── NUMBER COUNTER ────────────
function animateCounter(element, target, duration = 1400, prefix = '', suffix = '') {
    if (!element) return;
    const start = performance.now();
    const initial = 0;

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.round(initial + (target - initial) * eased);
        element.textContent = prefix + current.toLocaleString('en-IN') + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// ──────────── RIPPLE EFFECT ────────────
function createRipple(event) {
    const btn = event.currentTarget;
    const existing = btn.querySelector('.ripple-wave');
    if (existing) existing.remove();

    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    const rect = btn.getBoundingClientRect();
    const dim = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = dim + 'px';
    ripple.style.left = (event.clientX - rect.left - dim / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - dim / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

// ──────────── SPOTLIGHT SWEEP ────────────
function initSpotlight(heroEl) {
    if (!heroEl) return;
    let angle = 0;
    function sweep() {
        angle = (angle + 0.15) % 360;
        heroEl.style.setProperty('--spotlight-angle', angle + 'deg');
        requestAnimationFrame(sweep);
    }
    sweep();
}

// ──────────── MAGNETIC BUTTON ────────────
function initMagneticButtons() {
    document.querySelectorAll('.btn-magnetic').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

// ──────────── STAGGER ANIMATION HELPER ────────────
function staggerReveal(selector, delayStep = 80) {
    const els = document.querySelectorAll(selector);
    els.forEach((el, i) => {
        el.style.transitionDelay = (i * delayStep) + 'ms';
        requestAnimationFrame(() => el.classList.add('revealed'));
    });
}
