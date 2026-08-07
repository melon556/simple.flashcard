/* =========================================================
   FLASHCARD — script.js
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     0. Konfigurasi & data awal
     --------------------------------------------------------- */

  const RAIN_IMAGE = "gambar1.png"; // ganti/letakkan file ini sendiri
  const STORAGE_KEY = "flashcard-words-v1";

  const DEFAULT_WORDS = [
    ["Butterfly", "Kupu-kupu"],
    ["Journey", "Perjalanan"],
    ["Compass", "Kompas"],
    ["Lantern", "Lentera"],
    ["Feather", "Bulu"],
    ["Horizon", "Cakrawala"],
    ["Puzzle", "Teka-teki"],
    ["Anchor", "Jangkar"],
    ["Blossom", "Kuncup Bunga"],
    ["Whistle", "Peluit"],
    ["Canyon", "Ngarai"],
    ["Drizzle", "Gerimis"],
    ["Umbrella", "Payung"],
    ["Lighthouse", "Mercusuar"],
    ["Meadow", "Padang Rumput"],
    ["Whisper", "Bisikan"],
    ["Ember", "Bara Api"],
    ["Harbor", "Pelabuhan"],
    ["Twilight", "Senja"],
    ["Morning", "Pagi"],
  ];

  /* ---------------------------------------------------------
     1. State
     --------------------------------------------------------- */

  const state = {
    words: loadWords(),
    order: [],
    pos: 0,
    isFlipped: false,
    isShuffled: false,
  };

  function loadWords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {
      /* abaikan, pakai default */
    }
    return DEFAULT_WORDS.slice();
  }

  function saveWords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.words));
    } catch (e) {
      /* penyimpanan tidak tersedia, lanjut tanpa persist */
    }
  }

  function buildOrder() {
    const idx = state.words.map((_, i) => i);
    if (state.isShuffled) shuffleArray(idx);
    state.order = idx;
    state.pos = 0;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* ---------------------------------------------------------
     2. Referensi elemen
     --------------------------------------------------------- */

  const el = {
    editBtn: document.getElementById("editBtn"),
    editBtnLabel: document.getElementById("editBtnLabel"),
    counterCurrent: document.getElementById("counterCurrent"),
    counterTotal: document.getElementById("counterTotal"),

    card: document.getElementById("card"),
    cardFlip: document.getElementById("cardFlip"),
    cardBackShadow: document.getElementById("cardBackShadow"),
    faceArti: document.getElementById("faceArti"),
    wordKata: document.getElementById("wordKata"),
    wordArti: document.getElementById("wordArti"),

    backBtn: document.getElementById("backBtn"),
    nextBtn: document.getElementById("nextBtn"),
    shuffleBtn: document.getElementById("shuffleBtn"),

    prevIconBtn: document.getElementById("prevIconBtn"),
    nextIconBtn: document.getElementById("nextIconBtn"),

    scPrev: document.getElementById("scPrev"),
    scNext: document.getElementById("scNext"),
    scToggle: document.getElementById("scToggle"),

    overlay: document.getElementById("overlay"),
    editArea: document.getElementById("editArea"),
    cancelBtn: document.getElementById("cancelBtn"),
    saveBtn: document.getElementById("saveBtn"),

    rainLayer: document.getElementById("rain-layer"),
    splashLayer: document.getElementById("splash-layer"),

    toast: document.getElementById("toast"),
  };

  const isTouchDevice = matchMedia("(hover:none) and (pointer:coarse)").matches;

  /* ---------------------------------------------------------
     3. Render
     --------------------------------------------------------- */

  function currentPair() {
    const wordIndex = state.order[state.pos];
    return state.words[wordIndex] || ["", ""];
  }

  let censorTimer = null;

  function applyLengthClass(elWord, text) {
    elWord.classList.remove("is-long", "is-very-long");
    if (text.length > 26) {
      elWord.classList.add("is-very-long");
    } else if (text.length > 14) {
      elWord.classList.add("is-long");
    }
  }

  function render({ animateSwitch = false, hideArti = false } = {}) {
    const [kata, arti] = currentPair();
    el.wordKata.textContent = kata;
    el.wordArti.textContent = arti;
    applyLengthClass(el.wordKata, kata);
    applyLengthClass(el.wordArti, arti);

    // nomor mengikuti indeks asli kata (akan "loncat" saat diacak,
    // tapi tetap menjangkau semua kata sebelum berulang)
    const originalIndex = state.order[state.pos];
    el.counterCurrent.textContent = String(originalIndex + 1).padStart(2, "0");
    el.counterTotal.textContent = String(state.words.length).padStart(2, "0");

    el.cardFlip.classList.toggle("is-flipped", state.isFlipped);
    el.cardBackShadow.classList.toggle("is-visible", state.isFlipped);

    // teks tombol mewakili status SAAT INI (bukan aksi selanjutnya)
    const shuffleLabel = state.isShuffled ? "Acak" : "Urut";
    el.shuffleBtn.textContent = shuffleLabel;
    el.shuffleBtn.classList.toggle("is-on", state.isShuffled);
    el.scToggle.classList.toggle("is-shuffled", state.isShuffled);

    if (animateSwitch) {
      el.cardFlip.classList.remove("is-switching");
      // force reflow supaya animasi bisa diulang
      void el.cardFlip.offsetWidth;
      el.cardFlip.classList.add("is-switching");
    }

    clearTimeout(censorTimer);
    if (hideArti) {
      el.faceArti.classList.add("is-hidden");
      censorTimer = setTimeout(() => {
        el.faceArti.classList.remove("is-hidden");
      }, 1000);
    } else {
      el.faceArti.classList.remove("is-hidden");
    }
  }

  /* ---------------------------------------------------------
     4. Navigasi & flip
     --------------------------------------------------------- */

  function flip() {
    state.isFlipped = !state.isFlipped;
    render();
  }

  function goNext() {
    state.isFlipped = false; // selalu buka sisi KATA, bukan ARTI
    state.pos = (state.pos + 1) % state.order.length;
    render({ animateSwitch: true, hideArti: true });
  }

  function goBack() {
    state.isFlipped = false; // selalu buka sisi KATA, bukan ARTI
    state.pos = (state.pos - 1 + state.order.length) % state.order.length;
    render({ animateSwitch: true, hideArti: true });
  }

  function toggleShuffle() {
    state.isShuffled = !state.isShuffled;
    const [currentWordIndex] = [state.order[state.pos]];
    buildOrder();
    if (!state.isShuffled) {
      const found = state.order.indexOf(currentWordIndex);
      if (found !== -1) state.pos = found;
    }
    state.isFlipped = false;
    render({ hideArti: true });
  }

  el.cardFlip.addEventListener("click", flip);
  el.cardFlip.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip();
    }
  });
  el.cardFlip.setAttribute("tabindex", "0");
  el.cardFlip.setAttribute("role", "button");
  el.cardFlip.setAttribute("aria-label", "Balik kartu untuk melihat arti");

  el.backBtn.addEventListener("click", goBack);
  el.nextBtn.addEventListener("click", goNext);
  el.shuffleBtn.addEventListener("click", toggleShuffle);

  el.prevIconBtn.addEventListener("click", goBack);
  el.nextIconBtn.addEventListener("click", goNext);

  el.scPrev.addEventListener("click", goBack);
  el.scNext.addEventListener("click", goNext);
  el.scToggle.addEventListener("click", toggleShuffle);

  document.addEventListener("keydown", (e) => {
    if (el.overlay.classList.contains("is-open")) return;
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goBack();
  });

  /* ---------------------------------------------------------
     5. Overlay edit
     --------------------------------------------------------- */

  function wordsToText(words) {
    return words.map(([k, a]) => `${k},${a}`).join("\n");
  }

  function textToWords(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(",");
        if (idx === -1) return [line.trim(), ""];
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
      .filter(([k]) => k.length > 0);
  }

  function openEdit() {
    el.editArea.value = wordsToText(state.words);
    el.overlay.classList.add("is-open");
    el.editArea.focus();
  }

  function closeEdit() {
    el.overlay.classList.remove("is-open");
  }

  function saveEdit() {
    const parsed = textToWords(el.editArea.value);
    if (!parsed.length) {
      showToast("Minimal harus ada satu kata.");
      return;
    }
    state.words = parsed;
    saveWords();
    buildOrder();
    state.isFlipped = false;
    render();
    closeEdit();
    showToast("Flashcard disimpan.");
  }

  function handleEditRequest() {
    // Di mode landscape mobile, edit diarahkan untuk kembali ke portrait
    const isLandscapeMobile =
      isTouchDevice &&
      matchMedia("(orientation:landscape)").matches &&
      matchMedia("(max-height:640px)").matches;

    if (isLandscapeMobile) {
      requestPortrait();
      return;
    }
    openEdit();
  }

  function requestPortrait() {
    const orientation = screen.orientation;
    if (orientation && orientation.lock) {
      orientation.lock("portrait").catch(() => {
        showToast("Putar perangkat Anda ke mode portrait untuk mengedit.");
      });
    } else {
      showToast("Putar perangkat Anda ke mode portrait untuk mengedit.");
    }
  }

  el.editBtn.addEventListener("click", handleEditRequest);
  el.cancelBtn.addEventListener("click", closeEdit);
  el.saveBtn.addEventListener("click", saveEdit);
  el.overlay.addEventListener("click", (e) => {
    if (e.target === el.overlay) closeEdit();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.overlay.classList.contains("is-open"))
      closeEdit();
  });

  function updateEditLabel() {
    const isLandscapeMobile =
      isTouchDevice &&
      matchMedia("(orientation:landscape)").matches &&
      matchMedia("(max-height:640px)").matches;
    el.editBtnLabel.textContent = isLandscapeMobile
      ? "UBAH KE MODE PORTRAIT"
      : "EDIT";
  }
  updateEditLabel();
  window.addEventListener("resize", updateEditLabel);
  window.addEventListener("orientationchange", updateEditLabel);

  /* ---------------------------------------------------------
     6. Toast kecil
     --------------------------------------------------------- */

  let toastTimer = null;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("is-visible");
    }, 2400);
  }

  /* ---------------------------------------------------------
     7. Partikel dasar (dipakai untuk hujan)
     Pakai div + background-image (bukan <img>) supaya
     gerakannya dijalankan lewat Web Animations API dan
     selalu berjalan mulus & terus-menerus.
     --------------------------------------------------------- */

  function createParticle(className, sizePx) {
    const p = document.createElement("div");
    p.className = className;
    p.style.width = `${sizePx}px`;
    p.style.height = `${sizePx}px`;
    p.style.backgroundImage = `url(${RAIN_IMAGE})`;
    return p;
  }

  /* ---------------------------------------------------------
     8. Efek hujan — partikel jatuh terus-menerus di background
     --------------------------------------------------------- */

  function spawnRainDrop() {
    const size = 16 + Math.random() * 16;
    const p = createParticle("rain-drop", size);

    const left = Math.random() * 100;
    const duration = 6000 + Math.random() * 5000;
    const drift = (Math.random() - 0.5) * 140;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360);

    p.style.left = `${left}vw`;

    el.rainLayer.appendChild(p);

    const anim = p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: `translate(${drift}px, 100vh) rotate(${spin}deg)` },
      ],
      { duration, easing: "linear", fill: "forwards" },
    );

    anim.onfinish = () => p.remove();
  }

  function startRain() {
    // populasi awal supaya langsung terasa "hujan" saat load
    for (let i = 0; i < 14; i++) {
      setTimeout(spawnRainDrop, i * 220);
    }
    setInterval(spawnRainDrop, 480);
  }

  /* ---------------------------------------------------------
     9. Efek splash — beberapa partikel menyebar dari titik
     klik/tap lalu mengecil sampai hilang
     --------------------------------------------------------- */

  function spawnSplash(x, y) {
    const count = 12 + Math.floor(Math.random() * 5); // 12–16 partikel

    for (let i = 0; i < count; i++) {
      const size = 16 + Math.random() * 14;
      // splash pakai gambar1.png yang sama seperti hujan, polos tanpa efek tambahan
      const p = createParticle("splash", size);
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;

      el.splashLayer.appendChild(p);

      // sebar ke segala arah dari titik klik, dengan sedikit variasi acak
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const distance = 60 + Math.random() * 110;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const anim = p.animate(
        [
          {
            transform: "translate(-50%,-50%) translate(0,0) scale(1)",
            opacity: 1,
            offset: 0,
          },
          {
            transform: `translate(-50%,-50%) translate(${dx * 0.6}px, ${dy * 0.6}px) scale(.8)`,
            opacity: 0.9,
            offset: 0.55,
          },
          {
            transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(0)`,
            opacity: 0,
            offset: 1,
          },
        ],
        {
          duration: 2200 + Math.random() * 900,
          easing: "cubic-bezier(.16,.7,.2,1)",
          fill: "forwards",
        },
      );

      anim.onfinish = () => p.remove();
    }
  }

  document.addEventListener("pointerdown", (e) => {
    spawnSplash(e.clientX, e.clientY);
  });

  /* ---------------------------------------------------------
     10. Blokir klik-kanan, copy, dan seleksi teks
     Dikecualikan untuk textarea di overlay Edit.
     --------------------------------------------------------- */

  function isInsideEditArea(target) {
    return !!(target && target.closest && target.closest(".modal-textarea"));
  }

  document.addEventListener("contextmenu", (e) => {
    if (isInsideEditArea(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener("copy", (e) => {
    if (isInsideEditArea(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener("selectstart", (e) => {
    if (isInsideEditArea(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener("dragstart", (e) => {
    if (isInsideEditArea(e.target)) return;
    e.preventDefault();
  });

  /* ---------------------------------------------------------
     11. Init
     --------------------------------------------------------- */

  buildOrder();
  render();
  startRain();
})();
