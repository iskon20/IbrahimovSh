(() => {
  const POOL_SIZE = 14;
  const ALPHABET = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮЯ";
  const $ = id => document.getElementById(id);
  const el = { level: $("level"), bar: $("bar"), pics: $("pics"), hint: $("hint"),
    slots: $("slots"), msg: $("msg"), pool: $("pool"), next: $("next"),
    erase: $("erase"), clear: $("clear"), end: $("end"), errors: $("errors"), restart: $("restart") };

  let idx = 0, errors = 0, locked = false;
  let pool = [];   // [{ch, used}]
  let slots = [];  // индекс буквы из pool или null

  // Детерминированный перемешиватель, чтобы набор букв не менялся при перезагрузке уровня
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

  function buildPool(word, n) {
    const r = rng(n * 7919 + 13);
    const letters = word.split("");
    while (letters.length < POOL_SIZE) letters.push(ALPHABET[Math.floor(r() * ALPHABET.length)]);
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.map(ch => ({ ch, used: false }));
  }

  function load() {
    const lv = LEVELS[idx];
    locked = false;
    pool = buildPool(lv.word, idx + 1);
    slots = Array(lv.word.length).fill(null);
    el.level.textContent = `Уровень ${idx + 1} из ${LEVELS.length}`;
    el.bar.style.width = (idx / LEVELS.length * 100) + "%";
    el.hint.textContent = lv.hint;
    el.pics.innerHTML = lv.pics.map(p => `<div class="pic" aria-hidden="true">${p}</div>`).join("");
    el.next.hidden = true;
    el.erase.disabled = el.clear.disabled = false;
    say("", "");
    render();
  }

  function say(text, kind) { el.msg.textContent = text; el.msg.className = "msg " + kind; }

  function render() {
    el.slots.innerHTML = "";
    slots.forEach((pi, i) => {
      const b = document.createElement("button");
      b.className = "slot" + (pi !== null ? " filled" : "");
      b.textContent = pi !== null ? pool[pi].ch : "";
      b.setAttribute("aria-label", pi !== null ? `Буква ${pool[pi].ch}, убрать` : "Пустая клетка");
      b.onclick = () => removeAt(i);
      el.slots.appendChild(b);
    });
    el.pool.innerHTML = "";
    pool.forEach((p, i) => {
      const b = document.createElement("button");
      b.className = "tile";
      b.textContent = p.ch;
      b.disabled = p.used || locked;
      b.onclick = () => pick(i);
      el.pool.appendChild(b);
    });
  }

  function pick(i) {
    if (locked || pool[i].used) return;
    const s = slots.indexOf(null);
    if (s === -1) return;
    slots[s] = i; pool[i].used = true;
    say("", "");
    render();
    if (slots.indexOf(null) === -1) check();
  }

  function removeAt(s) {
    if (locked || slots[s] === null) return;
    pool[slots[s]].used = false; slots[s] = null;
    say("", ""); render();
  }

  function eraseLast() {
    for (let s = slots.length - 1; s >= 0; s--) if (slots[s] !== null) return removeAt(s);
  }

  function clearAll() {
    if (locked) return;
    slots.forEach((pi, s) => { if (pi !== null) { pool[pi].used = false; slots[s] = null; } });
    say("", ""); render();
  }

  function check() {
    const answer = slots.map(pi => pool[pi].ch).join("");
    if (answer === LEVELS[idx].word) {
      locked = true;
      el.slots.classList.add("ok");
      say("Правильно! Слово угадано.", "good");
      el.erase.disabled = el.clear.disabled = true;
      el.bar.style.width = ((idx + 1) / LEVELS.length * 100) + "%";
      el.next.textContent = idx === LEVELS.length - 1 ? "Завершить" : "Дальше";
      el.next.hidden = false; el.next.focus();
      render();
    } else {
      errors++;
      locked = true; render();
      el.slots.classList.add("bad");
      say("Неверно. Попробуйте ещё раз.", "bad");
      setTimeout(() => {
        el.slots.classList.remove("bad");
        locked = false; clearAll();
      }, 900);
    }
  }

  function next() {
    el.slots.classList.remove("ok");
    if (idx === LEVELS.length - 1) {
      el.errors.textContent = errors;
      el.end.hidden = false;
      return;
    }
    idx++; load();
  }

  function restart() {
    idx = 0; errors = 0; el.end.hidden = true; el.slots.classList.remove("ok"); load();
  }

  el.next.onclick = next;
  el.erase.onclick = eraseLast;
  el.clear.onclick = clearAll;
  el.restart.onclick = restart;

  // Ввод с клавиатуры: буквы, Backspace, Enter
  document.addEventListener("keydown", e => {
    if (!el.end.hidden) return;
    if (e.key === "Backspace") return eraseLast();
    if (e.key === "Enter" && !el.next.hidden) return next();
    const ch = e.key.toUpperCase().replace("Ё", "Е");
    const i = pool.findIndex(p => !p.used && p.ch === ch);
    if (e.key.length === 1 && i !== -1) pick(i);
  });

  load();
})();
