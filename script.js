// Zenski web demo: idle timer, character gallery and the break screen.
// The images live in gifs.js (GIFS), which has to load before this file.

// bg is the break screen colour. dark: true switches the text to light, which
// the two villains use. melody is a list of [frequency in Hz, seconds] notes.
const CHARACTERS = {
  cat: {
    label: 'Whiskers the Cat', song: 'purrs a cheerful little tune',
    bg: '#ffd166', gif: GIFS.cat,
    melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
  },
  brawler: {
    label: 'Red-Haired Brawler', song: 'squares up and refuses to back down',
    bg: '#f4978e', gif: GIFS.brawler,
    melody: [[392, 0.15], [392, 0.15], [523, 0.2], [440, 0.2], [392, 0.3]]
  },
  kidgoku: {
    label: 'Kid Goku', song: 'rides in on the Flying Nimbus',
    bg: '#a2d2ff', gif: GIFS.kidgoku,
    melody: [[659, 0.12], [784, 0.12], [880, 0.12], [784, 0.12], [659, 0.24]]
  },
  hulk: {
    label: 'Hulk', song: 'smashes first and asks later',
    bg: '#cdb4db', gif: GIFS.hulk,
    melody: [[110, 0.4], [98, 0.4], [87, 0.5], [73, 0.7]]
  },
  taopaipai: {
    label: 'Tao Pai Pai', song: 'sizes you up with one finger raised',
    bg: '#2a1620', dark: true, gif: GIFS.taopaipai,
    melody: [[130, 0.5], [123, 0.5], [110, 0.6], [98, 0.9]]
  },
  thanos: {
    label: 'Thanos', song: 'snaps his fingers, very dramatically',
    bg: '#1b1030', dark: true, gif: GIFS.thanos,
    melody: [[80, 0.6], [85, 0.4], [75, 0.6], [65, 1.0]]
  },
  gohan: {
    label: 'Gohan', song: 'powers up and gets serious',
    bg: '#b7e4c7', gif: GIFS.gohan,
    melody: [[147, 0.2], [147, 0.2], [165, 0.2], [147, 0.2], [131, 0.4]]
  },
  spiderman: {
    label: 'Spider-Man', song: 'swings in mid-pose',
    bg: '#ffcba4', gif: GIFS.spiderman,
    melody: [[880, 0.12], [988, 0.12], [1046, 0.12], [1318, 0.24], [988, 0.3]]
  }
};

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const settings = { timeoutMinutes: 2, breakMinutes: 1, sound: true };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // ---- page: hero stickers and character grid ------------------------------
  $('hero-a').src = GIFS.cat;
  $('hero-b').src = GIFS.kidgoku;
  $('hero-c').src = GIFS.spiderman;

  Object.entries(CHARACTERS).forEach(([key, c]) => {
    const tile = el('button', 'tile' + (c.dark ? ' dark' : ''));
    tile.style.setProperty('--bg', c.bg);

    const art = el('div', 'tile-art');
    const img = el('img', 'sticker');
    img.src = c.gif;
    img.alt = '';
    art.append(img);

    const song = c.song.charAt(0).toUpperCase() + c.song.slice(1);
    tile.append(art, el('span', 'tile-name', c.label), el('span', 'tile-song', song));
    tile.onclick = () => showBreak(key, true);
    $('grid').append(tile);
  });

  // ---- settings ------------------------------------------------------------
  const panel = $('settings-panel');
  $('btn-settings').onclick = () => {
    panel.hidden = !panel.hidden;
    $('btn-settings').setAttribute('aria-expanded', String(!panel.hidden));
  };
  $('in-timeout').oninput = e => {
    settings.timeoutMinutes = Math.max(0.05, parseFloat(e.target.value) || 2);
    if (timer) startTimer();
  };
  $('in-break').oninput = e => { settings.breakMinutes = Math.max(0, parseFloat(e.target.value) || 0); };
  $('in-sound').onchange = e => { settings.sound = e.target.checked; };

  // ---- idle timer ----------------------------------------------------------
  // A web page only sees input on itself, so this counts mouse, key and touch
  // activity in this tab. The Windows app asks the OS instead.
  let timer = null;

  class IdleTimer {
    constructor(minutes, onIdle) {
      this.ms = Math.max(3, minutes * 60) * 1000;
      this.onIdle = onIdle;
      this.reset = this.reset.bind(this);
      this.events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    }
    start() {
      this.reset();
      this.events.forEach(ev => window.addEventListener(ev, this.reset, { passive: true }));
      this.interval = setInterval(() => {
        if (!this.fired && Date.now() - this.last >= this.ms) {
          this.fired = true;
          this.onIdle();
        }
      }, 1000);
    }
    reset() { this.last = Date.now(); this.fired = false; }
    stop() {
      this.events.forEach(ev => window.removeEventListener(ev, this.reset));
      clearInterval(this.interval);
    }
  }

  function describeMinutes(m) {
    if (m < 1) return Math.round(m * 60) + ' seconds';
    return m === 1 ? '1 minute' : m + ' minutes';
  }

  function updateStatus() {
    $('status').textContent = timer
      ? 'Timer is on. Leave this page alone for ' + describeMinutes(settings.timeoutMinutes) + '.'
      : 'Timer is off.';
    $('btn-toggle').textContent = timer ? 'Stop the timer' : 'Start the timer';
  }

  function startTimer() {
    if (timer) timer.stop();
    timer = new IdleTimer(settings.timeoutMinutes, () => {
      const keys = Object.keys(CHARACTERS);
      showBreak(keys[Math.floor(Math.random() * keys.length)], false);
    });
    timer.start();
    updateStatus();
  }

  $('btn-toggle').onclick = () => {
    if (timer) { timer.stop(); timer = null; updateStatus(); }
    else startTimer();
  };

  // ---- sound ---------------------------------------------------------------
  let audioCtx = null;

  function playMelody(notes) {
    if (!settings.sound) return 0;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();   // phones start suspended
    let t = audioCtx.currentTime;
    notes.forEach(([freq, seconds]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
      t += seconds;
    });
    return t - audioCtx.currentTime;
  }

  // ---- break screen --------------------------------------------------------
  const overlay = $('overlay');
  let melodyLoop = null;
  let countdownLoop = null;
  let previewOpen = false;

  function showBreak(key, preview) {
    const c = CHARACTERS[key];
    previewOpen = preview;

    overlay.style.setProperty('--bg', c.bg);
    overlay.classList.toggle('dark', !!c.dark);
    overlay.classList.add('show');
    document.body.classList.add('overlay-open');

    $('ov-kicker').textContent = preview ? 'Preview' : 'Break time';
    $('ov-line').textContent = c.label + ' ' + c.song + '.';
    $('ov-img').src = c.gif;
    $('ov-img').onerror = () => console.error('Could not load the image for ' + key + '. Check that gifs.js loads before script.js.');

    clearInterval(melodyLoop);
    const length = playMelody(c.melody);
    if (length) melodyLoop = setInterval(() => playMelody(c.melody), (length + 0.6) * 1000);

    let remaining = preview ? 0 : Math.round(settings.breakMinutes * 60);
    const resume = $('resume-btn');
    $('countdown').hidden = remaining <= 0;
    $('countdown-label').hidden = remaining <= 0;
    resume.textContent = preview ? 'Close' : 'Back to work';
    resume.disabled = remaining > 0;
    resume.onclick = hideBreak;

    clearInterval(countdownLoop);
    if (remaining > 0) {
      const draw = () => {
        const m = String(Math.floor(remaining / 60)).padStart(2, '0');
        const s = String(remaining % 60).padStart(2, '0');
        $('countdown').textContent = m + ':' + s;
      };
      draw();
      countdownLoop = setInterval(() => {
        remaining -= 1;
        draw();
        if (remaining <= 0) { clearInterval(countdownLoop); resume.disabled = false; }
      }, 1000);
    }
    resume.focus();
  }

  function hideBreak() {
    overlay.classList.remove('show');
    document.body.classList.remove('overlay-open');
    clearInterval(melodyLoop);
    clearInterval(countdownLoop);
    if (timer) timer.reset();
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && previewOpen && overlay.classList.contains('show')) hideBreak();
  });

  updateStatus();
})();
