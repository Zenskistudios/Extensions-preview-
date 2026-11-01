const CHARACTERS = {
  cat: {
    label: '🐱 Whiskers the Cat', type: 'pet', accent: '#ffe08a',
    gif: 'gifs/1.gif',
    song: 'purrs a cheerful little tune',
    melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
  },
  dog: {
    label: '🐶 Biscuit the Dog', type: 'pet', accent: '#ffcf9e',
    gif: 'gifs/9.gif',
    song: 'tail-wagging chaos ensues',
    melody: [[392, 0.15], [392, 0.15], [523, 0.2], [440, 0.2], [392, 0.3]]
  },
  rabbit: {
    label: '🐰 Bun-Bun the Rabbit', type: 'pet', accent: '#ffe6f5',
    gif: 'gifs/6.gif',
    song: 'a surprisingly funky hop',
    melody: [[659, 0.12], [784, 0.12], [880, 0.12], [784, 0.12], [659, 0.24]]
  },
  demogorgon: {
    label: '👹 Demogorgon', type: 'horror', accent: '#ff3355',
    gif: 'gifs/3.gif',
    song: 'singing from the Upside Down',
    melody: [[110, 0.4], [98, 0.4], [87, 0.5], [73, 0.7]]
  },
  vecna: {
    label: '🧠 Vecna', type: 'horror', accent: '#d6b06a',
    gif: 'gifs/2.gif',
    song: 'crooning your worst nightmares',
    melody: [[130, 0.5], [123, 0.5], [110, 0.6], [98, 0.9]]
  },
  mindflayer: {
    label: '🕷️ Mind Flayer', type: 'horror', accent: '#9b5cff',
    gif: 'gifs/5.gif',
    song: 'orchestral horror swells',
    melody: [[80, 0.6], [85, 0.4], [75, 0.6], [65, 1.0]]
  },
  demodogs: {
    label: '🐕 Demo-dogs', type: 'horror', accent: '#ff7a3d',
    gif: 'gifs/4.gif',
    song: 'pack singing, off in the distance',
    melody: [[147, 0.2], [147, 0.2], [165, 0.2], [147, 0.2], [131, 0.4]]
  },
  eleven: {
    label: '⚡ Eleven', type: 'pet', accent: '#66e0ff',
    gif: 'gifs/8.gif',
    song: 'telekinetic disco',
    melody: [[880, 0.12], [988, 0.12], [1046, 0.12], [1318, 0.24], [988, 0.3]]
  }
};

(function(){
  'use strict';
  const $ = id => document.getElementById(id);

  // If a GIF can't be loaded (usually the gifs/ folder isn't next to index.html),
  // say which file is missing instead of leaving a blank box.
  function missingNote(path){
    const d = document.createElement('div');
    d.className = 'img-missing';
    d.textContent = 'Missing ' + path;
    return d;
  }

  const galleryGrid = $('gallery-grid');
  Object.keys(CHARACTERS).forEach(key => {
    const cfg = CHARACTERS[key];
    const [emoji, ...nameParts] = cfg.label.split(' ');
    const card = document.createElement('button');
    card.className = 'char-card';
    card.style.setProperty('--glow', cfg.accent);
    card.innerHTML = `
      <div class="thumb"><img src="${cfg.gif}" alt=""></div>
      <div class="name">${emoji} ${nameParts.join(' ')}</div>
      <div class="desc">${cfg.song}</div>
      <div class="tag">${cfg.type === 'horror' ? 'UPSIDE DOWN' : 'PET'}</div>
      <div class="go">Preview →</div>
    `;
    const thumbImg = card.querySelector('img');
    thumbImg.onerror = () => thumbImg.replaceWith(missingNote(cfg.gif));
    card.onclick = () => showOverlay(key, true);
    galleryGrid.appendChild(card);
  });

  const settings = { timeoutMinutes: 2, forcedRestMinutes: 1, audioEnabled: true };
  $('btn-settings').onclick = () => $('settings-panel').classList.toggle('open');
  $('in-timeout').oninput = e => { settings.timeoutMinutes = Math.max(0.05, parseFloat(e.target.value) || 2); if (timer) restartTimer(); };
  $('in-forced').oninput = e => { settings.forcedRestMinutes = Math.max(0, parseFloat(e.target.value) || 0); };
  $('in-audio').onchange = e => settings.audioEnabled = e.target.checked;

  function setStatus(text, watching){
    const el = $('status-text');
    el.textContent = text;
    el.className = watching ? 'watching' : '';
  }

  let timer = null;
  class IdleTimer {
    constructor(minutes, onTimeout){
      this.ms = Math.max(3, minutes * 60) * 1000;
      this.cb = onTimeout;
      this.last = Date.now();
      this.fired = false;
      this._onEvent = () => { this.last = Date.now(); this.fired = false; };
      this._events = ['mousemove','mousedown','keydown','scroll','touchstart'];
    }
    start(){
      this._events.forEach(ev => window.addEventListener(ev, this._onEvent, {passive:true}));
      this._interval = setInterval(() => this._check(), 1000);
      setStatus('watching for idle…', true);
    }
    _check(){
      if (this.fired) return;
      const idle = Date.now() - this.last;
      if (idle >= this.ms){ this.fired = true; this.cb(); }
    }
    dispose(){
      this._events.forEach(ev => window.removeEventListener(ev, this._onEvent));
      clearInterval(this._interval);
    }
  }
  function restartTimer(){
    if (timer) timer.dispose();
    const firstKey = Object.keys(CHARACTERS)[0];
    timer = new IdleTimer(settings.timeoutMinutes, () => showOverlay(firstKey, false));
    timer.start();
  }
  $('btn-start').onclick = () => { restartTimer(); $('btn-start').disabled = true; $('btn-stop').disabled = false; };
  $('btn-stop').onclick = () => { if (timer){ timer.dispose(); timer = null; } setStatus('stopped', false); $('btn-start').disabled = false; $('btn-stop').disabled = true; };

  let audioCtx = null;
  function playMelody(melody){
    if (!settings.audioEnabled || !melody || !melody.length) return 0;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    let t = audioCtx.currentTime;
    melody.forEach(([freq, dur]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
      t += dur;
    });
    return t - audioCtx.currentTime;
  }

  let melodyLoopId = null;
  let flashLoopId = null;

  function showOverlay(key, isPreview){
    const cfg = CHARACTERS[key];
    const overlay = $('overlay');
    overlay.classList.add('show');
    overlay.classList.toggle('horror', cfg.type === 'horror');
    document.body.classList.add('overlay-open');

    $('char-name').textContent = cfg.label;
    $('char-name').style.color = cfg.accent;
    $('char-song').textContent = cfg.label.split(' ').slice(1).join(' ') + ' ' + cfg.song;
    $('char-gif').alt = 'Missing ' + cfg.gif;
    $('char-gif').onerror = () => console.error('Could not load ' + cfg.gif + '. The gifs folder must sit next to index.html.');
    $('char-gif').src = cfg.gif;

    clearInterval(melodyLoopId);
    if (settings.audioEnabled){
      const dur = playMelody(cfg.melody);
      if (dur) melodyLoopId = setInterval(() => playMelody(cfg.melody), (dur + 0.6) * 1000);
    }

    clearInterval(flashLoopId);
    if (cfg.type === 'horror'){
      flashLoopId = setInterval(() => {
        if (Math.random() < 0.15){
          const flash = $('lightning');
          flash.style.transition = 'none'; flash.style.opacity = 0.6;
          setTimeout(() => { flash.style.transition = 'opacity .4s ease'; flash.style.opacity = 0; }, 60);
        }
      }, 400);
    }

    const resumeBtn = $('resume-btn');
    const forcedSeconds = isPreview ? 0 : Math.round(settings.forcedRestMinutes * 60);
    $('forced-banner').style.display = isPreview ? 'none' : 'block';
    $('countdown').style.display = forcedSeconds > 0 ? 'block' : 'none';
    $('countdown-label').style.display = forcedSeconds > 0 ? 'block' : 'none';

    let remaining = forcedSeconds;
    resumeBtn.disabled = remaining > 0;
    resumeBtn.textContent = isPreview ? 'Close preview' : 'Resume work';

    clearInterval(overlay._countdownInterval);
    if (remaining > 0){
      const tick = () => {
        const m = String(Math.floor(remaining/60)).padStart(2,'0');
        const s = String(remaining%60).padStart(2,'0');
        $('countdown').textContent = `${m}:${s}`;
      };
      tick();
      overlay._countdownInterval = setInterval(() => {
        remaining -= 1; tick();
        if (remaining <= 0){ clearInterval(overlay._countdownInterval); resumeBtn.disabled = false; }
      }, 1000);
    }

    resumeBtn.onclick = () => hideOverlay();
  }

  function hideOverlay(){
    const overlay = $('overlay');
    overlay.classList.remove('show');
    document.body.classList.remove('overlay-open');
    clearInterval(melodyLoopId);
    clearInterval(flashLoopId);
    clearInterval(overlay._countdownInterval);
    if (timer){ timer.last = Date.now(); timer.fired = false; }
    setStatus(timer ? 'watching for idle…' : 'stopped', !!timer);
  }

  console.log('%c🐾 ZENSKI — web demo', 'color:#8b5cf6;font-weight:bold;font-size:14px');
})();
