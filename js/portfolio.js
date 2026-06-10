// CUSTOM CURSOR
const cursor = document.getElementById('cursor');
const dot = document.getElementById('cursor-dot');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  dot.style.left = e.clientX + 'px';
  dot.style.top = e.clientY + 'px';
});

// PARTICLES
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let W, H, particles = [], particleRaf;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);
for (let i = 0; i < 60; i++) {
  particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.4 + 0.1
  });
}
function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(127,119,221,${p.alpha})`;
    ctx.fill();
  });
  particleRaf = requestAnimationFrame(drawParticles);
}
drawParticles();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(particleRaf);
  } else {
    drawParticles();
  }
});

// TYPEWRITER
const phrases = [
  'Especialista en Gaming & Sistemas Críticos',
  'Automation Engineer · Python + Playwright',
  'Compliance GLI/BMM · Error zero policy',
  'Godot · C++ · GDScript · SQL · Bash',
];
let pi = 0, ci = 0, deleting = false;
const tw = document.getElementById('typewriter');
function type() {
  const phrase = phrases[pi];
  if (!deleting) {
    tw.textContent = phrase.slice(0, ++ci);
    if (ci === phrase.length) { deleting = true; setTimeout(type, 1800); return; }
  } else {
    tw.textContent = phrase.slice(0, --ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
  }
  setTimeout(type, deleting ? 35 : 65);
}
type();

// COUNT UP
document.querySelectorAll('[data-count]').forEach(el => {
  const target = parseInt(el.dataset.count);
  let n = 0;
  const step = () => { if (n < target) { el.textContent = ++n; setTimeout(step, 200); } };
  setTimeout(step, 800);
});

// SCROLL REVEAL
const observer = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// SKILL BARS ANIMATE ON SCROLL
const skillObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.sk-fill[data-w]').forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.w; }, i * 100);
      });
      skillObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.skill-group').forEach(g => skillObs.observe(g));

// TERMINAL BLINK
const tb = document.getElementById('term-blink');
setInterval(() => { tb.style.opacity = tb.style.opacity === '0' ? '1' : '0'; }, 600);
