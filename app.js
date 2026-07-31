/* ================================================================
   Every Chapter, Us — app.js
   Organized as small independent modules, each initialized once
   the DOM is ready. CONFIG (in index.html) drives all the content;
   this file drives all the behavior.
================================================================= */
"use strict";

const qs  = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
const rand = (a,b) => a + Math.random()*(b-a);
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch-device');

/* ---------------------------------------------------------------
   BACKGROUND: stars, drifting hearts, rose petals, sakura petals,
   shooting stars, neon particles — one shared canvas + rAF loop.
---------------------------------------------------------------- */
const BackgroundField = (() => {
  const canvas = qs('#bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, stars = [], drifters = [], shooters = [];

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = document.documentElement.scrollHeight;
  }

  function makeStars(){
    stars = Array.from({length: Math.floor(w*h/9000)}, () => ({
      x: rand(0,w), y: rand(0,h), r: rand(.4,1.8),
      tw: rand(0, Math.PI*2), speed: rand(.01,.03)
    }));
  }

  const glyphs = ['❤','🌸','✨','🦋','🌹'];
  function makeDrifters(){
    drifters = Array.from({length: 26}, () => ({
      x: rand(0,w), y: rand(0,h),
      glyph: glyphs[Math.floor(rand(0,glyphs.length))],
      size: rand(10,22), speedY: rand(-.25,-.05), sway: rand(0,Math.PI*2), swaySpeed: rand(.005,.02),
      opacity: rand(.15,.55)
    }));
  }

  function spawnShooter(){
    shooters.push({ x: rand(0,w*.6), y: rand(0,h*.3), vx: rand(4,8), vy: rand(2,4), life: 1 });
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    // stars
    ctx.fillStyle = '#fff';
    stars.forEach(s => {
      s.tw += s.speed;
      const alpha = .4 + Math.sin(s.tw)*.4;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // drifting hearts / petals / sparkles
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    drifters.forEach(d => {
      d.y += d.speedY; d.sway += d.swaySpeed;
      const x = d.x + Math.sin(d.sway)*18;
      if (d.y < -30) d.y = h + 30;
      ctx.globalAlpha = d.opacity;
      ctx.font = `${d.size}px serif`;
      ctx.fillText(d.glyph, x, d.y);
    });
    ctx.globalAlpha = 1;

    // shooting stars
    shooters.forEach((s, i) => {
      s.x += s.vx; s.y += s.vy; s.life -= .02;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0,s.life)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx*6, s.y - s.vy*6); ctx.stroke();
      if (s.life <= 0) shooters.splice(i,1);
    });
    if (Math.random() < 0.006) spawnShooter();

    requestAnimationFrame(draw);
  }

  function init(){
    resize(); makeStars(); makeDrifters();
    window.addEventListener('resize', () => { resize(); makeStars(); });
    draw();
  }
  return { init };
})();

/* ---------------------------------------------------------------
   CUSTOM CURSOR: glow + ring follow, hearts trail on desktop.
---------------------------------------------------------------- */
const CursorFX = (() => {
  const glow = qs('#cursor-glow'), ring = qs('#cursor-ring');
  let mx=innerWidth/2, my=innerHeight/2, rx=mx, ry=my;
  function loop(){
    rx += (mx-rx)*.18; ry += (my-ry)*.18;
    glow.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    ring.style.transform  = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  function spawnTrailHeart(x,y){
    const el = document.createElement('div');
    el.textContent = '❤';
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9998;
      font-size:${rand(10,16)}px;color:#ff6f9c;opacity:.8;transform:translate(-50%,-50%);`;
    document.body.appendChild(el);
    gsap.to(el, { y:'-=40', opacity:0, duration:1, ease:'power1.out', onComplete:()=>el.remove() });
  }
  function init(){
    if (isTouch) { glow.style.display='none'; ring.style.display='none'; return; }
    let last = 0;
    window.addEventListener('mousemove', e => {
      mx=e.clientX; my=e.clientY;
      if (Date.now()-last > 60){ last = Date.now(); if (Math.random()<.35) spawnTrailHeart(mx,my); }
    });
    loop();
  }
  return { init };
})();

/* ---------------------------------------------------------------
   TOUCH RIPPLE (mobile): quick ring on tap.
---------------------------------------------------------------- */
function initTouchRipple(){
  window.addEventListener('touchstart', e => {
    const t = e.touches[0]; if (!t) return;
    const el = document.createElement('div');
    el.className = 'touch-ripple';
    el.style.left = t.clientX+'px'; el.style.top = t.clientY+'px';
    document.body.appendChild(el);
    gsap.to(el, { width:60, height:60, opacity:0, duration:.6, ease:'power1.out', onComplete:()=>el.remove() });
  }, { passive:true });
}

/* ---------------------------------------------------------------
   HEART RAIN — tap anywhere (outside interactive controls) to
   trigger a short burst of falling hearts, with vibration where
   supported.
---------------------------------------------------------------- */
function triggerHeartRain(x,y){
  if (navigator.vibrate) navigator.vibrate(30);
  const n = 18;
  for (let i=0;i<n;i++){
    const el = document.createElement('div');
    el.className = 'falling-heart';
    el.textContent = '❤';
    const startX = x + rand(-120,120);
    el.style.left = startX+'px';
    el.style.top = (y-40)+'px';
    el.style.color = Math.random()<.5 ? '#ff6f9c' : '#f3c977';
    el.style.fontSize = rand(14,26)+'px';
    document.body.appendChild(el);
    gsap.to(el, {
      y: window.innerHeight + 80, x: `+=${rand(-60,60)}`, rotation: rand(-90,90),
      opacity:0, duration: rand(1.6,2.6), ease:'power1.in', delay: i*0.02,
      onComplete: () => el.remove()
    });
  }
}
function initHeartRainTaps(){
  document.addEventListener('click', e => {
    if (e.target.closest('button, a, .polaroid, .letter, .hidden-star, #gift-box, #moon-wrap, input, .quiz-opt')) return;
    triggerHeartRain(e.clientX, e.clientY);
  });
}

/* ---------------------------------------------------------------
   LOADER
---------------------------------------------------------------- */
function runLoader(onDone){
  const loader = qs('#loader'), pctEl = qs('#loader-pct'), labelEl = qs('#loader-label');
  const labels = ['gathering starlight...', 'unfolding old messages...', 'warming up the moon...', 'almost there...'];
  let pct = 0;
  const timer = setInterval(() => {
    pct += rand(4, 14);
    if (pct >= 100){ pct = 100; clearInterval(timer); }
    pctEl.textContent = Math.floor(pct)+'%';
    labelEl.textContent = labels[Math.min(labels.length-1, Math.floor(pct/28))];
    if (pct === 100){
      setTimeout(() => { loader.classList.add('hide'); onDone && onDone(); }, 500);
    }
  }, 220);
}

/* ---------------------------------------------------------------
   SCROLL REVEAL (generic .reveal elements)
---------------------------------------------------------------- */
function initScrollReveal(){
  const els = qsa('.reveal');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting){
        gsap.to(en.target, { opacity:1, y:0, duration:1.1, ease:'power3.out' });
        io.unobserve(en.target);
      }
    });
  }, { threshold:.2 });
  els.forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------
   INTRO — typewriter narration + a small Three.js scene (drifting
   starfield + a glowing moon rising) behind the opening lines.
---------------------------------------------------------------- */
function initIntroScene(){
  const canvas = qs('#intro-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, .1, 100);
  camera.position.z = 8;

  function resize(){
    const el = qs('#intro');
    renderer.setSize(el.clientWidth, el.clientHeight);
    camera.aspect = el.clientWidth/el.clientHeight; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 1400;
  const positions = new Float32Array(starCount*3);
  for (let i=0;i<starCount;i++){
    positions[i*3]   = rand(-30,30);
    positions[i*3+1] = rand(-20,20);
    positions[i*3+2] = rand(-30,5);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const starMat = new THREE.PointsMaterial({ color:0xffffff, size:.05, transparent:true, opacity:.85 });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  const moonGeo = new THREE.SphereGeometry(1.4, 48, 48);
  const moonMat = new THREE.MeshStandardMaterial({ color:0xf3e7c9, emissive:0xf3c977, emissiveIntensity:.35, roughness:.9 });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(2.2, -2.5, -6);
  scene.add(moon);
  const moonGlow = new THREE.PointLight(0xffcf8b, 2.2, 20);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
  scene.add(new THREE.AmbientLight(0x8866aa, .6));

  gsap.to(moon.position, { y:1.2, duration:6, ease:'power2.out', delay:.6 });
  gsap.to(moonGlow.position, { y:1.2, duration:6, ease:'power2.out', delay:.6 });
  gsap.to(moonMat, { emissiveIntensity:.7, duration:4, delay:.6 });

  function tick(){
    starField.rotation.y += .0004;
    moon.rotation.y += .0015;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  return { camera, scene };
}

function typeLines(el, lines, opts={}){
  const { speed=45, pause=900, onDone } = opts;
  el.innerHTML = '';
  let li = 0;
  function typeLine(){
    if (li >= lines.length){ onDone && onDone(); return; }
    const line = lines[li];
    const span = document.createElement('div');
    const bar = document.createElement('span'); bar.className='cursor-bar'; bar.style.height='1em';
    el.innerHTML = '';
    el.appendChild(span); el.appendChild(bar);
    let ci = 0;
    (function typeChar(){
      if (ci <= line.length){
        span.textContent = line.slice(0, ci);
        ci++;
        setTimeout(typeChar, speed);
      } else {
        setTimeout(() => { li++; typeLine(); }, pause);
      }
    })();
  }
  typeLine();
}

function initIntro(){
  initIntroScene();
  const tw = qs('#typewriter');
  const beginBtn = qs('#begin-btn');
  typeLines(tw, CONFIG.openingLines.map(fillNames), {
    onDone: () => { gsap.to(beginBtn, { opacity:1, y:-4, duration:1 }); }
  });
  beginBtn.addEventListener('click', () => {
    qs('#counter-section').scrollIntoView({ behavior:'smooth' });
  });
}

/* ---------------------------------------------------------------
   LOVE COUNTER — live, updates every second.
---------------------------------------------------------------- */
function initCounter(){
  const start = new Date(CONFIG.startDate).getTime();
  const els = { d: qs('#c-days'), h: qs('#c-hours'), m: qs('#c-mins'), s: qs('#c-secs') };
  function tick(){
    const diff = Math.max(0, Date.now() - start);
    const s = Math.floor(diff/1000);
    els.d.textContent = Math.floor(s/86400);
    els.h.textContent = Math.floor((s%86400)/3600);
    els.m.textContent = Math.floor((s%3600)/60);
    els.s.textContent = s%60;
  }
  tick(); setInterval(tick, 1000);
}

/* ---------------------------------------------------------------
   GALLERY — 3D-tilt polaroids with a zoom + caption + floating
   hearts on tap.
---------------------------------------------------------------- */
function initGallery(){
  const track = qs('#gallery-track');
  const overlay = qs('#gallery-overlay');
  CONFIG.photos.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'polaroid';
    card.innerHTML = `<div class="polaroid-img">${p.img ? '' : 'your photo here'}</div><div class="polaroid-cap">${p.caption}</div>`;
    if (p.img) {
    const img = card.querySelector(".polaroid-img");
    img.style.backgroundImage = `url("${p.img}")`;
    img.style.backgroundSize = "cover";
    img.style.backgroundPosition = "center";
    img.style.backgroundRepeat = "no-repeat";
}
    track.appendChild(card);

    if (!isTouch){
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top)/r.height - .5) * -14;
        const ry = ((e.clientX - r.left)/r.width - .5) * 14;
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
      });
      card.addEventListener('mouseleave', () => card.style.transform = '');
    }

    card.addEventListener('click', () => {
      overlay.classList.add('show');
      card.classList.add('zoomed');
      for (let k=0;k<10;k++){
        setTimeout(() => triggerHeartRain(innerWidth/2 + rand(-80,80), innerHeight/2), k*40);
      }
    });
  });
  overlay.addEventListener('click', () => {
    overlay.classList.remove('show');
    qsa('.polaroid.zoomed').forEach(c => c.classList.remove('zoomed'));
  });
}

/* ---------------------------------------------------------------
   TIMELINE — unlock each card with a scroll-triggered animation.
---------------------------------------------------------------- */
function initTimeline(){
  const list = qs('#timeline-list');
  CONFIG.timeline.forEach(item => {
    const el = document.createElement('div');
    el.className = 'tl-item';
    el.innerHTML = `<div class="tl-dot">${item.icon}</div><div class="tl-card glass"><div class="tl-title">${item.title}</div><div class="tl-text">${item.text}</div></div>`;
    list.appendChild(el);
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('unlocked'); });
  }, { threshold:.5 });
  qsa('.tl-item').forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------
   REASONS I LOVE YOU — one per click, no repeats until exhausted.
---------------------------------------------------------------- */
function initReasons(){
  const stage = qs('#reason-text');
  const btn = qs('#reason-btn');
  const countEl = qs('#reason-count');
  let pool = [];
  let shown = 0;
  const total = CONFIG.reasons.length; // honest count — no padded duplicates

  function refillPool(){
    pool = CONFIG.reasons.slice();
    for (let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  }
  refillPool();

  function confettiBurst(x,y){
    for (let i=0;i<24;i++){
      const el = document.createElement('div');
      const isHeart = Math.random() < .5;
      el.textContent = isHeart ? '❤' : ['✨','🎉','💫'][Math.floor(rand(0,3))];
      el.style.cssText = `position:fixed; left:${x}px; top:${y}px; z-index:8000; pointer-events:none; font-size:${rand(10,20)}px;`;
      document.body.appendChild(el);
      gsap.to(el, {
        x: rand(-160,160), y: rand(-160,160), opacity:0, rotation:rand(-180,180),
        duration: rand(.9,1.6), ease:'power2.out', onComplete:()=>el.remove()
      });
    }
  }

  btn.addEventListener('click', (e) => {
    if (!pool.length) { refillPool(); shown = 0; }
    const reason = pool.pop();
    shown = Math.min(total, shown+1);
    gsap.timeline()
      .to(stage, { opacity:0, y:-10, duration:.3 })
      .call(() => { stage.textContent = reason; })
      .to(stage, { opacity:1, y:0, duration:.5 });
    countEl.textContent = `${shown} of ${total} discovered`;
    confettiBurst(e.clientX, e.clientY);
  });
}

/* ---------------------------------------------------------------
   FLOATING LOVE LETTERS
---------------------------------------------------------------- */
function initLetters(){
  const field = qs('#letters-field');
  const reader = qs('#letter-reader');
  const paper = qs('#letter-paper');
  const closeBtn = qs('#letter-close');

  CONFIG.letters.forEach((letter, i) => {
    const el = document.createElement('div');
    el.className = 'letter';
    el.style.left = (10 + (i * 30) % 80) + '%';
    el.style.top = (10 + (i * 37) % 70) + '%';
    field.appendChild(el);
    gsap.to(el, { y: rand(-16,16), duration: rand(2.4,3.6), yoyo:true, repeat:-1, ease:'sine.inOut', delay: rand(0,1) });

    el.addEventListener('click', () => {
      reader.classList.add('show');
      paper.innerHTML = `<div class="hand" style="font-size:1.6rem;margin-bottom:1rem;">${letter.title}</div>` +
        fillNames(letter.body).split('\n').map(l => `<p style="margin-bottom:.8rem;">${l}</p>`).join('');
    });
  });

  closeBtn.addEventListener('click', () => reader.classList.remove('show'));
  reader.addEventListener('click', (e) => { if (e.target === reader) reader.classList.remove('show'); });
}

/* ---------------------------------------------------------------
   HIDDEN SECRET STARS
---------------------------------------------------------------- */
function initHiddenStars(){
  // A couple live right on the "Hidden Heartbeats" section itself so it's
  // never an empty page; the rest are scattered further down the story.
  const hosts = ['#secrets-section', '#secrets-section', '#timeline-section', '#dreams-section', '#moon-section'];
  const total = CONFIG.hiddenMessages.length;
  qs('#secret-total').textContent = total;
  let found = 0;
  const foundEl = qs('#secret-found-count');

  function showToast(msg){
    const el = document.createElement('div');
    el.className = 'glass hand';
    el.style.cssText = `position:fixed; left:50%; bottom:6rem; transform:translate(-50%,20px); z-index:9000;
      padding:1.1rem 1.8rem; font-size:1.2rem; color:#fbf3e7; opacity:0; max-width:80vw; text-align:center;`;
    el.textContent = msg;
    document.body.appendChild(el);
    gsap.to(el, { opacity:1, y:0, duration:.6 });
    setTimeout(() => gsap.to(el, { opacity:0, y:20, duration:.6, onComplete:()=>el.remove() }), 3200);
  }

  hosts.slice(0, total).forEach((sel, i) => {
    const host = qs(sel);
    if (!host) return;
    host.style.position = 'relative';
    const star = document.createElement('div');
    star.className = 'hidden-star';
    star.style.left = rand(4,90)+'%';
    star.style.top = rand(6,88)+'%';
    host.appendChild(star);
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      if (star.classList.contains('found')) return;
      star.classList.add('found');
      found++;
      foundEl.textContent = `${found} found`;
      showToast(CONFIG.hiddenMessages[i]);
      triggerHeartRain(e.clientX, e.clientY);
    });
  });
}

/* ---------------------------------------------------------------
   COUPLE QUIZ
---------------------------------------------------------------- */
function initQuiz(){
  const card = qs('#quiz-card');
  let qi = 0;
  function render(){
    if (qi >= CONFIG.quiz.length){
      card.innerHTML = `<div class="quiz-q hand" style="font-size:1.6rem;">That's the quiz — and somehow, we both win every round.</div>`;
      return;
    }
    const item = CONFIG.quiz[qi];
    card.innerHTML = `<div class="quiz-q">${item.q}</div>
      <div class="quiz-options">${item.options.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${o}</button>`).join('')}</div>`;
    qsa('.quiz-opt', card).forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.quiz-opt', card).forEach(b=>b.classList.remove('picked'));
        btn.classList.add('picked');
        const correct = Number(btn.dataset.i) === item.correct;
        if (correct) triggerHeartRain(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
        setTimeout(() => { qi++; render(); }, 900);
      });
    });
  }
  render();
}

/* ---------------------------------------------------------------
   FUTURE DREAMS ROADMAP
---------------------------------------------------------------- */
function initDreams(){
  const road = qs('#dream-road');
  CONFIG.dreams.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dream-item';
    el.innerHTML = `<div class="dream-icon">${d.icon}</div><div><div class="dream-title">${d.title}</div><div class="dream-text">${d.text}</div></div>`;
    road.appendChild(el);
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('glow'); });
  }, { threshold:.6 });
  qsa('.dream-item').forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------
   OUR CONSTELLATION — stars connect to sketch initials either
   side of a small heart, drawn progressively as the section
   comes into view.
---------------------------------------------------------------- */
function initConstellation(){
  const canvas = qs('#constellation-canvas');
  const ctx = canvas.getContext('2d');
  function size(){
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }
  size(); window.addEventListener('resize', size);

  const initials = (CONFIG.names.him[0] + CONFIG.names.her[0]).toUpperCase();
  // Hand-placed star points sketching: [initial 1] -- heart -- [initial 2]
  // Coordinates are in a 700x340 logical box, percentage-based so it scales.
  const w = () => canvas.clientWidth, h = () => canvas.clientHeight;
  const pct = (x,y) => ({ x: x/700*w(), y: y/340*h() });
  const points = [
    // left initial (simple upward stroke pair)
    pct(70,260), pct(90,120), pct(110,260), pct(78,190), pct(102,190),
    // heart shape (small loop) in the middle
    pct(310,150), pct(330,110), pct(360,110), pct(380,150), pct(350,210), pct(320,150),
    // right initial (simple diagonal pair)
    pct(560,120), pct(560,260), pct(560,190), pct(600,120), pct(600,260)
  ];

  let drawn = 0;
  function drawStep(){
    ctx.clearRect(0,0,w(),h());
    ctx.strokeStyle = 'rgba(255,111,156,.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i=0;i<drawn && i<points.length;i++){
      const p = points[i];
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
    for (let i=0;i<drawn && i<points.length;i++){
      const p = points[i];
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.beginPath(); ctx.arc(p.x,p.y,7,0,Math.PI*2); ctx.fill();
    }
    ctx.font = '600 20px Marcellus, serif';
    ctx.fillStyle = 'rgba(243,201,119,.9)';
    ctx.textAlign = 'center';
    if (drawn > points.length){
      ctx.fillText(initials[0], pct(90,290).x, pct(90,290).y);
      ctx.fillText(initials[1] || '', pct(580,290).x, pct(580,290).y);
    }
  }

  let started = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !started){
        started = true;
        const t = setInterval(() => {
          drawn++;
          drawStep();
          if (drawn > points.length + 4) clearInterval(t);
        }, 160);
      }
    });
  }, { threshold:.3 });
  io.observe(canvas);
  drawStep();
}

/* ---------------------------------------------------------------
   INTERACTIVE MOON — a plain canvas-2D sphere (radial-gradient
   shading, faint craters) rather than WebGL. This guarantees the
   tap/click always works, on every device, with no dependency on
   Three.js or a WebGL context being available.
---------------------------------------------------------------- */
function initInteractiveMoon(){
  const wrap = qs('#moon-wrap');
  const canvas = qs('#moon-canvas');
  const ctx = canvas.getContext('2d');

  const palette = ['#f3e7c9', '#ffb3cf', '#d8b8ff', '#a9e6ff', '#ffe08a'];
  let ci = 0;
  let glow = 0; // 0..1, decays after each tap
  const craters = Array.from({length:6}, () => ({
    x: rand(-.5,.5), y: rand(-.5,.5), r: rand(.06,.14)
  }));

  function size(){
    const s = wrap.clientWidth * devicePixelRatio;
    canvas.width = s; canvas.height = s;
    canvas.style.width = wrap.clientWidth+'px';
    canvas.style.height = wrap.clientWidth+'px';
  }
  size(); window.addEventListener('resize', size);

  function draw(){
    const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, r = w*.42;
    ctx.clearRect(0,0,w,h);

    // outer glow (grows briefly on tap)
    const glowR = r * (1.3 + glow*.6);
    const outer = ctx.createRadialGradient(cx,cy,r*.7,cx,cy,glowR);
    outer.addColorStop(0, palette[ci] + 'aa');
    outer.addColorStop(1, palette[ci] + '00');
    ctx.fillStyle = outer;
    ctx.beginPath(); ctx.arc(cx,cy,glowR,0,Math.PI*2); ctx.fill();

    // sphere body with soft directional shading
    const body = ctx.createRadialGradient(cx - r*.3, cy - r*.3, r*.1, cx, cy, r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(.5, palette[ci]);
    body.addColorStop(1, shade(palette[ci], -30));
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

    // craters
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
    craters.forEach(c => {
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.beginPath(); ctx.arc(cx + c.x*w, cy + c.y*w, c.r*w, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    if (glow > 0) glow = Math.max(0, glow - .02);
    requestAnimationFrame(draw);
  }
  function shade(hex, amt){
    const n = parseInt(hex.slice(1),16);
    const r = Math.max(0,Math.min(255,(n>>16)+amt));
    const g = Math.max(0,Math.min(255,((n>>8)&255)+amt));
    const b = Math.max(0,Math.min(255,(n&255)+amt));
    return `rgb(${r},${g},${b})`;
  }
  draw();

  function dropStars(){
    const r = wrap.getBoundingClientRect();
    for (let i=0;i<12;i++){
      const el = document.createElement('div');
      el.textContent = '✦';
      el.style.cssText = `position:fixed; left:${r.left + r.width/2}px; top:${r.top + r.height/2}px;
        color:#f3c977; font-size:${rand(8,16)}px; z-index:200; pointer-events:none;`;
      document.body.appendChild(el);
      gsap.to(el, { x: rand(-90,90), y: rand(60,160), opacity:0, duration: rand(.9,1.5), ease:'power2.in', onComplete:()=>el.remove() });
    }
  }

  function onTap(){
    ci = (ci+1) % palette.length;
    glow = 1;
    canvas.style.transform = 'scale(1.08)';
    setTimeout(() => { canvas.style.transform = 'scale(1)'; }, 250);
    dropStars();
  }
  canvas.style.transition = 'transform .3s cubic-bezier(.22,.9,.28,1)';
  wrap.addEventListener('click', onTap);
  wrap.addEventListener('touchstart', (e) => { e.preventDefault(); onTap(); }, { passive:false });
}

/* ---------------------------------------------------------------
   LOVE METER — starts at 99%, creeps upward, ends at ∞ once seen.
---------------------------------------------------------------- */
function initLoveMeter(){
  const fill = qs('#meter-fill');
  const pctEl = qs('#meter-pct');
  const caption = qs('#meter-caption');
  let done = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !done){
        done = true;
        let v = 99;
        const t = setInterval(() => {
          v += rand(.3,1.1);
          if (v >= 100){
            clearInterval(t);
            fill.style.width = '100%';
            pctEl.textContent = '∞%';
            caption.textContent = "Told you it wasn't going down.";
            return;
          }
          fill.style.width = v+'%';
          pctEl.textContent = v.toFixed(1)+'%';
        }, 120);
      }
    });
  }, { threshold:.5 });
  io.observe(qs('#meter-section'));
}

/* ---------------------------------------------------------------
   SURPRISE GIFT BOX — shake, then open.
---------------------------------------------------------------- */
function initGiftBox(){
  const box = qs('#gift-box');
  const msg = qs('#gift-message');
  let opened = false;
  gsap.to(box, { rotation:3, duration:.15, repeat:-1, yoyo:true, ease:'sine.inOut', repeatDelay:1.4 });
  box.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    box.classList.add('open');
    for (let i=0;i<14;i++){
      setTimeout(() => {
        const r = box.getBoundingClientRect();
        const el = document.createElement('div');
        el.textContent = '🦋';
        el.style.cssText = `position:fixed; left:${r.left+r.width/2}px; top:${r.top}px; font-size:${rand(14,22)}px; z-index:300; pointer-events:none;`;
        document.body.appendChild(el);
        gsap.to(el, { x: rand(-140,140), y: rand(-180,-60), opacity:0, rotation: rand(-60,60), duration: rand(1.4,2.2), ease:'power1.out', onComplete:()=>el.remove() });
      }, i*60);
    }
    gsap.to(msg, { opacity:1, y:-6, duration:1, delay:.6 });
  });
}

/* ---------------------------------------------------------------
   FINAL PROPOSAL SCENE
---------------------------------------------------------------- */
function initFinalScene(){
  const canvas = qs('#final-canvas');
  const ctx = canvas.getContext('2d');
  let w,h,stars=[];
  function resize(){ w=canvas.width=innerWidth; h=canvas.height=qs('#final-scene').offsetHeight; }
  function makeStars(){ stars = Array.from({length:200}, ()=>({x:rand(0,w),y:rand(0,h),r:rand(.5,1.6),a:rand(.2,.9)})); }
  resize(); makeStars(); window.addEventListener('resize', ()=>{resize();makeStars();});
  function draw(){
    ctx.clearRect(0,0,w,h);
    stars.forEach(s=>{ ctx.globalAlpha=s.a; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  draw();

  const tw = qs('#final-typewriter');
  const heartBtn = qs('#proposal-heart-btn');
  const ring = qs('#ring-animation');
  const question = qs('#final-question');

  let started = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !started){
        started = true;
        typeLines(tw, [
          "I don't know what tomorrow brings...",
          "But if I get to spend it with you...",
          "I already have everything."
        ], { onDone: () => gsap.to(heartBtn, { opacity:1, duration:1.2 }) });
      }
    });
  }, { threshold:.4 });
  io.observe(qs('#final-scene'));

  heartBtn.addEventListener('click', () => {
    gsap.to(heartBtn, { scale:1.3, duration:.3, yoyo:true, repeat:1 });
    gsap.fromTo(ring, { scale:.4, opacity:0 }, { scale:1, opacity:1, duration:1, ease:'elastic.out(1,.6)' });
    for (let i=0;i<20;i++){
      setTimeout(() => {
        const el = document.createElement('div');
        el.textContent = '✦';
        const r = heartBtn.getBoundingClientRect();
        el.style.cssText = `position:fixed; left:${r.left+r.width/2}px; top:${r.top}px; color:#f3c977; font-size:${rand(8,16)}px; z-index:400; pointer-events:none;`;
        document.body.appendChild(el);
        gsap.to(el, { x:rand(-140,140), y:rand(-140,140), opacity:0, duration:rand(1,1.8), onComplete:()=>el.remove() });
      }, i*40);
    }
    setTimeout(() => gsap.to(question, { opacity:1, y:-6, duration:1.2 }), 900);
  });
}

/* ---------------------------------------------------------------
   ENDING — fireworks + rose petal fall, final line.
---------------------------------------------------------------- */
function initEndingFireworks(){
  const canvas = qs('#fireworks-canvas');
  const ctx = canvas.getContext('2d');
  let w,h,particles=[];
  function resize(){ w=canvas.width=innerWidth; h=canvas.height=qs('#ending').offsetHeight; }
  resize(); window.addEventListener('resize', resize);

  function burst(x,y,color){
    for (let i=0;i<40;i++){
      const a = (Math.PI*2*i)/40;
      const speed = rand(1.5,4.5);
      particles.push({ x,y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, life:1, color });
    }
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += .02; p.life -= .012;
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.4,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
    requestAnimationFrame(draw);
  }
  draw();

  let fired = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !fired){
        fired = true;
        const colors = ['#ff6f9c','#f3c977','#c73866','#fff'];
        let n = 0;
        const t = setInterval(() => {
          burst(rand(w*.2,w*.8), rand(h*.2,h*.6), colors[Math.floor(rand(0,colors.length))]);
          n++; if (n>6) clearInterval(t);
        }, 500);
        startTimeCapsule();
      }
    });
  }, { threshold:.5 });
  io.observe(qs('#ending'));
}

/* ---------------------------------------------------------------
   TIME CAPSULE — the site appears to end, then one last message.
---------------------------------------------------------------- */
let capsuleShown = false;
function startTimeCapsule(){
  if (capsuleShown) return;
  capsuleShown = true;
  setTimeout(() => {
    const capsule = qs('#time-capsule');
    const notice = qs('#capsule-notice');
    const letter = qs('#capsule-letter');
    capsule.classList.add('show');
    gsap.to(notice, { opacity:1, duration:1.2 });
    setTimeout(() => {
      letter.innerHTML = `<div class="hand" style="margin-bottom:1rem;">Dear ${CONFIG.names.her},</div>` +
        fillNames(CONFIG.capsuleLetter).split('\n').slice(1).filter(Boolean)
          .map(l => `<p style="margin-bottom:.8rem;">${l}</p>`).join('');
      gsap.to(letter, { opacity:1, y:0, duration:1.4, ease:'power3.out' });
    }, 1800);
  }, CONFIG.timeCapsuleDelay);
}

/* ---------------------------------------------------------------
   MUSIC PLAYER
---------------------------------------------------------------- */
function initMusicPlayer(){
  const player = qs('#music-player');
  const btn = qs('#music-toggle');
  const audio = qs('#bg-audio');
  let playing = false;
  btn.addEventListener('click', () => {
    playing = !playing;
    if (playing){
      audio.play().catch(()=>{ /* no track loaded yet — replace src in index.html */ });
      player.classList.add('playing');
      btn.textContent = '❚❚';
    } else {
      audio.pause();
      player.classList.remove('playing');
      btn.textContent = '▶';
    }
  });
}

/* ---------------------------------------------------------------
   BOOT
---------------------------------------------------------------- */
function safe(fn, label){
  try { fn(); }
  catch (err) { console.error(`[love-story] "${label}" failed to start:`, err); }
}

window.addEventListener('DOMContentLoaded', () => {
  safe(() => BackgroundField.init(), 'background');
  safe(() => CursorFX.init(), 'cursor');
  safe(() => initTouchRipple(), 'touch ripple');
  safe(() => initHeartRainTaps(), 'heart rain');

  let started = false;
  function startExperience(){
    if (started) return;
    started = true;
    safe(initIntro, 'intro');
    safe(initScrollReveal, 'scroll reveal');
    safe(initCounter, 'counter');
    safe(initGallery, 'gallery');
    safe(initTimeline, 'timeline');
    safe(initReasons, 'reasons');
    safe(initLetters, 'letters');
    safe(initHiddenStars, 'hidden stars');
    safe(initQuiz, 'quiz');
    safe(initDreams, 'dreams');
    safe(initConstellation, 'constellation');
    safe(initInteractiveMoon, 'moon');
    safe(initLoveMeter, 'love meter');
    safe(initGiftBox, 'gift box');
    safe(initFinalScene, 'final scene');
    safe(initEndingFireworks, 'fireworks');
    safe(initMusicPlayer, 'music player');
  }

  // Failsafe: no matter what goes wrong (a slow/blocked CDN script, a
  // typo, anything) the loader is NEVER allowed to trap the visitor.
  const failsafe = setTimeout(() => {
    console.warn('[love-story] loader failsafe triggered — continuing without waiting further.');
    const loader = qs('#loader');
    if (loader) loader.classList.add('hide');
    startExperience();
  }, 6000);

  safe(() => runLoader(() => {
    clearTimeout(failsafe);
    startExperience();
  }), 'loader');
});
