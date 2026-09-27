// Rosenberg World: the UI. Title, character select, HUD, map, collection book, portal cards,
// the game host (where mini-games run). Also boots everything.

(() => {
  const RW = window.RW, A = RW.art, U = RW.util, E = RW.engine, world = RW.world;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const show = (n, on = true) => { n.hidden = !on; };
  const STAR_SVG = '<svg viewBox="0 0 24 24" class="star-ico" aria-hidden="true"><path d="M12 2.2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.3 1.3-6.6L2.5 9.1l6.6-.8z"/></svg>';
  const LOCK = "🔒";

  // ---------- collection items (the hub's own) ----------
  [
    { id: "baseball", name: "Baseball", icon: "⚾", hint: "Near a dugout…" },
    { id: "soccerball", name: "Golden Soccer Ball", icon: "⚽", hint: "In a goal somewhere sporty." },
    { id: "crown", name: "Crown", icon: "👑", hint: "Somewhere fancy, near a fountain." },
    { id: "dogbone", name: "Dog Bone", icon: "🦴", hint: "The dog knows. Keep bugging him." },
    { id: "moonrock", name: "Moon Rock", icon: "🌑", hint: "The moon is ticklish…" },
    { id: "chefhat", name: "Chef Hat", icon: "👨‍🍳", hint: "Wave at the kitchen window." },
  ].forEach((it) => RW.collection.add(it));
  const SECRETS = ["moonFart", "dogSteal", "ellieHigh", "jonahDog", "calledShot", "maxRun", "maxBush", "raccoon", "statueWink", "caveEcho", "snooze", "tremfya", "fartWish", "carAlarm", "scoopSplat"];

  // =====================================================================
  // TITLE
  // =====================================================================
  const title = $("#title"), select = $("#select"), hud = $("#hud");
  let titleReady = false;
  function buildLogo() {
    const l1 = $("#logo .l1"), l2 = $("#logo .l2");
    [["ROSENBERG", l1], ["WORLD", l2]].forEach(([word, host], w) => {
      host.innerHTML = "";
      [...word].forEach((ch, i) => { const s = el("span", "ch", ch); s.style.animationDelay = (0.25 + w * 0.5 + i * 0.05) + "s"; host.appendChild(s); });
    });
  }
  // Returning players skip the character screen: the title says "PLAY AS MAX", with a small
  // "Switch player" link underneath.
  function returningPlayer() {
    const id = RW.store.last;
    const pr = RW.profile(id);
    return id && A.CHARS[id] && RW.PLAYERS.includes(id) && pr && (RW.totalTime(pr) > 0 || pr.stars > 0) ? id : null;
  }
  function setupTitleButton() {
    const id = returningPlayer(), btn = $("#tapEnter");
    if (!id) return;
    btn.classList.add("quick");
    btn.style.setProperty("--c", A.CHARS[id].color);
    btn.textContent = `▶ PLAY AS ${A.CHARS[id].name.toUpperCase()}`;
    $("#switchPlayer").hidden = false;
  }
  function leaveTitle(then) {
    RW.sfx.unlock();
    RW.sfx.play("pop");
    title.classList.add("leaving");
    setTimeout(() => { show(title, false); title.classList.remove("leaving"); then(); }, 350);
  }
  function onTitleTap() {
    if (!titleReady || title.hidden) return;
    const id = returningPlayer();
    leaveTitle(id ? () => startPlay(id) : openSelect);
  }
  $("#switchPlayer").addEventListener("click", (ev) => { ev.stopPropagation(); if (!titleReady || title.hidden) return; leaveTitle(openSelect); });
  $("#switchPlayer").addEventListener("pointerdown", (ev) => ev.stopPropagation());
  RW.bus.on("titleTap", onTitleTap);
  title.addEventListener("click", onTitleTap);

  // =====================================================================
  // CHARACTER SELECT
  // =====================================================================
  const cards = [];
  let selAnim = null, switching = false;
  function buildSelect() {
    const wrap = $("#cards");
    RW.PLAYERS.forEach((id) => {
      const s = A.CHARS[id];
      const b = el("button", "card");
      b.type = "button";
      b.style.setProperty("--c", s.color);
      b.innerHTML = `<canvas width="360" height="420"></canvas><span class="nm">${s.name.toUpperCase()}</span><span class="tag">${s.tag}</span>${s.age ? `<span class="age">AGE ${s.age}</span>` : ""}<span class="mem"></span>`;
      b.addEventListener("click", () => choose(id, b));
      wrap.appendChild(b);
      cards.push({ id, b, cv: b.querySelector("canvas") });
    });
    $("#selectBack").addEventListener("click", () => {
      stopSelectAnim(); show(select, false);
      if (switching) { switching = false; show(hud, true); E.mode = "play"; }
      else { show(title, true); }
    });
  }
  function openSelect(isSwitch) {
    switching = !!isSwitch;
    show(select, true);
    $("#selectBack").textContent = switching ? "✕" : "←";
    cards.forEach((c) => {
      c.b.classList.toggle("last", c.id === RW.store.last);
      const pr = RW.profile(c.id), tt = RW.totalTime(pr);
      c.b.querySelector(".mem").innerHTML = pr && (tt || pr.stars) ? `${STAR_SVG} ${pr.stars} · ${RW.fmtTime(tt)} played` : "New player!";
    });
    const t0 = performance.now();
    const loop = (now) => {
      const t = (now - t0) / 1000;
      cards.forEach((cd, i) => {
        const c = cd.cv.getContext("2d"), s = A.CHARS[cd.id];
        c.clearRect(0, 0, 360, 420);
        A.shadow(c, 180, 370, 90, 22, 0.3);
        c.save();
        const k = 3.3 * (cd.id === "ellie" ? 1.12 : cd.id === "jonah" ? 1.05 : 1);
        c.translate(180, 372); c.scale(k, k);
        const pose = cd.b.classList.contains("picked") ? "celebrate" : ["fist", "jump", "wave", "spoon"][i];
        const hop = pose === "jump" ? Math.abs(Math.sin(t * 3.2)) * 18 : 0;
        c.translate(0, -hop);
        A.drawChar(c, s, { t: t + i, move: 0, side: 0, dir: 1, pose: t % 6 < 2.2 ? pose : null, pt: 0.9, blink: (t + i * 1.3) % 3.2 < 0.12, prop: cd.id === "reuben" && t % 6 >= 2.2 ? "bat" : cd.id === "max" ? "spoon" : null });
        c.restore();
      });
      selAnim = requestAnimationFrame(loop);
    };
    stopSelectAnim();
    selAnim = requestAnimationFrame(loop);
  }
  function stopSelectAnim() { if (selAnim) cancelAnimationFrame(selAnim); selAnim = null; }
  function choose(id, b) {
    RW.sfx.unlock();
    RW.sfx.play("magic");
    b.classList.add("picked");
    setTimeout(() => { b.classList.remove("picked"); stopSelectAnim(); show(select, false); startPlay(id); }, 650);
  }

  // =====================================================================
  // PLAY
  // =====================================================================
  function startPlay(id) {
    // "log in": switch to this player's own stars, items, records and play time
    const returning = RW.totalTime(RW.profile(id)) > 0;
    if (RW.profileId !== id) { RW.useProfile(id); world.refreshProgress(); mapDirty = true; }
    if (id === "max") world.clearMaxCameos();
    RW.store.last = id;
    RW.save.time.sessions = (RW.save.time.sessions || 0) + 1;
    RW.persist();
    const firstRun = !returning;
    const wasPlaying = !!E.player;
    world.endTitle();
    if (wasPlaying) {
      const old = E.player;
      E.player = E.makePlayer(id, old.x, old.y);
      E.player.emerge = 0;
      E.burst(old.x, old.y, 40, "puff", 10);
      E.burst(old.x, old.y, 60, "sparkle", 10);
    } else {
      const d = world.DEST.house;
      E.player = E.makePlayer(id, d.arrive[0], d.arrive[1]);
      E.player.emerge = 0;
      E.later(0.1, () => E.burst(d.arrive[0], d.arrive[1], 30, "sparkle", 12));
    }
    switching = false;
    E.mode = "play";
    updateWho();
    show(hud, true);
    syncStars(true);
    RW.sfx.play("whoosh");
    E.later(0.7, () => E.say(E.player, { reuben: "Let's go, Rosenbergs!", jonah: "Race you!", ellie: "Yay! Me turn!", max: "Hehehe! My turn!" }[id], 2));
    E.later(1.2, () => toast(returning ? `Welcome back, ${A.CHARS[id].name}! ⭐ ${RW.save.stars}` : `Hi ${A.CHARS[id].name}! This is your own Rosenberg World.`, "👋"));
    if (firstRun) {
      E.later(2.2, () => toast("Drag anywhere to walk, or tap where you want to go!", "👆"));
      E.later(7.5, () => toast("Find hidden Rosenberg Stars all over the world!", "⭐"));
      E.later(13, () => toast("Tap things! Lots of things do something funny.", "✨"));
    }
  }

  // =====================================================================
  // HUD
  // =====================================================================
  const face = $("#face"), whoName = $("#whoName"), starCount = $("#starCount");
  function updateWho() {
    const id = E.player ? E.player.id : RW.store.last || "reuben";
    A.portrait(face, id, { t: 0 });
    whoName.textContent = A.CHARS[id].name.toUpperCase();
    $("#who").style.setProperty("--c", A.CHARS[id].color);
  }
  setInterval(() => { if (!hud.hidden && E.player) A.portrait(face, E.player.id, { blink: true }); setTimeout(() => { if (!hud.hidden && E.player) A.portrait(face, E.player.id, {}); }, 140); }, 3700);
  $("#who").addEventListener("click", () => { RW.sfx.play("tap"); if (E.player && E.player.lock) return; E.mode = "select"; show(hud, false); show(portalCard, false); openSelect(true); });
  const soundBtn = $("#sound");
  const setSoundIcon = () => { soundBtn.innerHTML = RW.store.muted ? "🔇" : "🔊"; soundBtn.setAttribute("aria-label", RW.store.muted ? "Sound off" : "Sound on"); };
  soundBtn.addEventListener("click", () => { RW.sfx.unlock(); RW.sfx.setMuted(!RW.store.muted); setSoundIcon(); RW.sfx.play("tap"); });
  setSoundIcon();

  // Displayed star count lags behind the bank so stars can fly in and land.
  let shown = RW.save.stars, flying = 0, syncTimer = null;
  function syncStars(force) {
    // hold the old number while a game is up, so earned stars can fly in afterwards
    const holding = RW.host && RW.host.current;
    if (force || (flying === 0 && !holding)) { shown = RW.save.stars; starCount.textContent = shown; }
  }
  RW.bus.on("stars", () => { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncStars(), 3500); });
  function flyStars(sx, sy, n, delay = 0) {
    const target = $("#stars").getBoundingClientRect();
    const tx = target.left + 26, ty = target.top + target.height / 2;
    for (let i = 0; i < n; i++) {
      flying++;
      setTimeout(() => {
        const s = el("div", "flystar", STAR_SVG);
        $("#fx").appendChild(s);
        const midX = (sx + tx) / 2 + U.rand(-80, 80), midY = Math.min(sy, ty) - U.rand(40, 140);
        const anim = s.animate([
          { transform: `translate(${sx}px, ${sy}px) scale(.4)`, opacity: 0 },
          { transform: `translate(${sx}px, ${sy - 30}px) scale(1.3)`, opacity: 1, offset: 0.2 },
          { transform: `translate(${midX}px, ${midY}px) scale(1.1)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${tx}px, ${ty}px) scale(.7)`, opacity: 1 },
        ], { duration: 900, easing: "cubic-bezier(.5,0,.4,1)" });
        anim.onfinish = () => {
          s.remove(); flying--;
          shown = Math.min(RW.save.stars, shown + 1);
          starCount.textContent = shown;
          const pill = $("#stars");
          pill.classList.remove("pulse"); void pill.offsetWidth; pill.classList.add("pulse");
          RW.sfx.play("sparkle");
          if (flying === 0) syncStars();
        };
      }, delay + i * 160);
    }
  }
  RW.bus.on("starFly", ({ sx, sy, n }) => flyStars(sx, sy, n));

  // ---------- toasts ----------
  const toastQ = [];
  let toastBusy = false;
  function toast(text, icon) { toastQ.push({ text, icon }); if (!toastBusy) nextToast(); }
  function nextToast() {
    const t = toastQ.shift();
    if (!t) { toastBusy = false; return; }
    toastBusy = true;
    const n = $("#toast");
    n.innerHTML = `${t.icon ? `<span class="ti">${t.icon}</span>` : ""}<span>${t.text}</span>`;
    n.classList.add("on");
    setTimeout(() => { n.classList.remove("on"); setTimeout(nextToast, 350); }, 3000);
  }
  RW.bus.on("toast", (d) => toast(d.text, d.icon));
  RW.bus.on("collectible", (it) => toast(`NEW! ${it.name} added to your Collection Book`, it.icon));

  // =====================================================================
  // PORTAL CARD (appears at a game's door)
  // =====================================================================
  const portalCard = $("#portal");
  let portalDest = null;
  RW.bus.on("portal", (d) => {
    if (d && world.destStatus(d) === "locked") d = null; // locked places stay quiet
    portalDest = d;
    if (!d || E.mode !== "play") { portalCard.classList.remove("on"); setTimeout(() => { if (!portalDest) show(portalCard, false); }, 250); return; }
    const status = world.destStatus(d);
    if (status === "travel") { // the sea plane: a FLY card instead of PLAY
      portalCard.style.setProperty("--c", "#18A0B8");
      portalCard.innerHTML = `<div class="p-ico">✈️</div><div class="p-txt"><div class="p-title">${d.name.toUpperCase()}</div><div class="p-sub">${d.to === "bahamar" ? "Splash Down and the Lazy River are on the island!" : "Back to Rosenberg World"}</div></div><button class="p-btn" type="button">FLY</button>`;
      portalCard.querySelector(".p-btn").addEventListener("click", (ev) => { ev.stopPropagation(); world.flyTo(d.to); });
      show(portalCard, true);
      requestAnimationFrame(() => portalCard.classList.add("on"));
      RW.sfx.play("pop");
      return;
    }
    const g = RW.games.forDestination(d.id);
    const locked = status === "locked";
    const titleTxt = locked ? d.name : world.destTitle(d);
    const st = g ? RW.games.stats(g.id) : null;
    portalCard.style.setProperty("--c", g && g.color && !locked ? g.color : "#6C4AC9");
    portalCard.innerHTML = `
      <div class="p-ico">${locked ? LOCK : (g && g.icon) || d.icon}</div>
      <div class="p-txt">
        <div class="p-title">${titleTxt}</div>
        <div class="p-sub">${locked ? "COMING SOON · a new game is on its way!" : st && st.plays ? `Best ${st.highScore} · ${st.starsEarned} ${STAR_SVG} earned` : (g && g.subtitle) || ""}</div>
      </div>
      <button class="p-btn ${locked ? "locked" : ""}" type="button">${locked ? "COMING SOON" : "PLAY"}</button>`;
    portalCard.querySelector(".p-btn").addEventListener("click", (ev) => { ev.stopPropagation(); enterPortal(d); });
    show(portalCard, true);
    requestAnimationFrame(() => portalCard.classList.add("on"));
    RW.sfx.play(locked ? "lock" : "pop");
  });
  RW.bus.on("portalEnter", (d) => enterPortal(d));
  function enterPortal(d) {
    const status = world.destStatus(d);
    if (status === "travel") { world.flyTo(d.to); return; }
    if (status === "locked") {
      RW.sfx.play("lock");
      portalCard.classList.remove("shake"); void portalCard.offsetWidth; portalCard.classList.add("shake");
      E.say(E.player, U.pick(["Locked! Coming soon!", "I can't wait for this one!", "What's in there?!"]), 1.8);
      return;
    }
    const g = RW.games.forDestination(d.id);
    RW.host.launch(g, d);
  }

  // =====================================================================
  // GAME HOST — where mini-games run
  // =====================================================================
  const host = $("#host"), mount = $("#gameMount"), wipe = $("#wipe");
  let current = null;
  function irisTo(cover, x, y) {
    return new Promise((res) => {
      wipe.style.setProperty("--x", x + "px"); wipe.style.setProperty("--y", y + "px");
      show(wipe, true);
      wipe.classList.toggle("cover", !cover);
      void wipe.offsetWidth;
      wipe.classList.toggle("cover", cover);
      setTimeout(() => { if (!cover) show(wipe, false); res(); }, 520);
    });
  }
  RW.host = {
    get current() { return current; },
    async launch(game, dest) {
      if (current) return;
      const P = E.player;
      const [sx, sy] = P ? E.worldToScreen(P.x, P.y - 60) : [innerWidth / 2, innerHeight / 2];
      RW.sfx.play("whoosh");
      show(portalCard, false); portalCard.classList.remove("on");
      await irisTo(true, sx, sy);
      current = { game, dest, cleanup: null, frame: null, session: { rounds: 0, score: 0, stars: 0, newHigh: false, newItems: [] } };
      E.pause(true);
      RW.sfx.duck(true);
      show(hud, false);
      mount.innerHTML = "";
      host.style.setProperty("--c", game.color || "#2F6BFF");
      const api = makeApi(game);
      if (game.entry) {
        const f = document.createElement("iframe");
        const sep = game.entry.includes("?") ? "&" : "?";
        f.src = `${game.entry}${sep}rw=1&player=${encodeURIComponent(P ? P.id : "reuben")}`;
        f.allow = "autoplay; fullscreen";
        f.title = game.title;
        mount.appendChild(f);
        current.frame = f;
        try { f.addEventListener("load", () => { try { f.contentWindow.RosenbergWorld = window.RosenbergWorld; } catch (e) { /* cross-origin: postMessage still works */ } }); } catch (e) { /* ignore */ }
        $("#hostExit").hidden = false;
      } else if (game.mount) {
        const box = el("div", "mod-mount");
        mount.appendChild(box);
        current.cleanup = game.mount(box, api) || null;
        $("#hostExit").hidden = false;
      } else {
        mount.appendChild(placeholder(game, dest));
        $("#hostExit").hidden = true;
      }
      show(host, true);
      await irisTo(false, innerWidth / 2, innerHeight / 2);
    },
    // A round ended but the game stays open (it shows its own end screen). Stars are banked now.
    report(result) {
      if (!current) return;
      const rec = RW.games.record((current.active || current.game).id, result || {});
      const s = current.session;
      s.rounds++; s.stars += rec.stars; s.score = Math.max(s.score, rec.score);
      s.newHigh = s.newHigh || rec.newHigh; s.newItems.push(...rec.newItems);
    },
    // Hand straight back to the world with a result.
    finish(result) {
      if (!current) return;
      RW.host.report(result);
      RW.host.exit();
    },
    // Back to the world: walk out of the door and the stars from this visit fly into the total.
    async exit() {
      if (!current || current.leaving) return;
      current.leaving = true;
      const { dest, session } = current;
      await irisTo(true, innerWidth / 2, innerHeight / 2);
      closeGame();
      backToWorld(dest, session.stars, session);
    },
  };
  function closeGame() {
    if (!current) return;
    try { if (current.cleanup) current.cleanup(); } catch (e) { console.error(e); }
    mount.innerHTML = "";
    show(host, false);
    RW.sfx.duck(false);
    current.closed = true;
    lastGame = current;
    current = null;
  }
  let lastGame = null;
  function makeApi(game) {
    const P = E.player;
    return {
      player: P ? { id: P.id, name: A.CHARS[P.id].name } : { id: "reuben", name: "Reuben" },
      stars: RW.save.stars,
      report: (r) => RW.host.report(r),
      finish: (r) => RW.host.finish(r),
      exit: () => RW.host.exit(),
      // small per-game save slot
      load: (k) => ((RW.save.gameData || {})[game.id] || {})[k],
      save: (k, v) => { RW.save.gameData = RW.save.gameData || {}; (RW.save.gameData[game.id] = RW.save.gameData[game.id] || {})[k] = v; RW.persist(); },
    };
  }
  // Games inside an iframe talk to the hub with postMessage (works from file:// too).
  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d || typeof d !== "object" || !current || !current.frame || ev.source !== current.frame.contentWindow) return;
    if (d.type === "rosenberg-world:hello") { current.active = RW.games.list.find((g) => g.entry && g.entry.split("/")[1] === d.folder) || null; return; }
    if (d.type === "rosenberg-world:report") RW.host.report({ score: d.score, stars: d.stars, collectibles: Array.isArray(d.collectibles) ? d.collectibles : [] });
    else if (d.type === "rosenberg-world:finish") RW.host.finish({ score: d.score, stars: d.stars, collectibles: Array.isArray(d.collectibles) ? d.collectibles : [] });
    else if (d.type === "rosenberg-world:exit") RW.host.exit();
  });
  // Same-origin games can also call these directly.
  window.RosenbergWorld = {
    report: (r) => RW.host.report(r),
    finish: (r) => RW.host.finish(r),
    exit: () => RW.host.exit(),
    get player() { const P = E.player; return P ? { id: P.id, name: A.CHARS[P.id].name } : null; },
    registerGame: (def) => RW.games.register(def),
    addCollectible: (it) => RW.collection.add(it),
  };
  $("#hostExit").addEventListener("click", () => RW.host.exit());

  function placeholder(game, dest) {
    const n = el("div", "ph");
    const P = E.player;
    n.innerHTML = `
      <div class="ph-bg"><span>⭐</span><span>${game.icon}</span><span>⭐</span><span>${game.icon}</span><span>⭐</span></div>
      <div class="ph-card">
        <div class="ph-ico">${game.icon}</div>
        <div class="ph-kicker">${(world.destTitle(dest) || game.title).toUpperCase()}</div>
        <h2>GAME COMING TO<br>ROSENBERG WORLD</h2>
        <p>This game's building is ready. The game will plug in right here.</p>
        <canvas class="ph-kid" width="220" height="220"></canvas>
        <div class="ph-btns">
          ${RW.dev ? '<button class="btn ghost" type="button" data-act="test">Test finish (dev)</button>' : ""}
          <button class="btn primary" type="button" data-act="back">BACK TO ROSENBERG WORLD</button>
        </div>
      </div>`;
    n.querySelector('[data-act="back"]').addEventListener("click", () => RW.host.exit());
    const t = n.querySelector('[data-act="test"]');
    if (t) t.addEventListener("click", () => RW.host.finish({ score: U.randi(5, 40), stars: U.randi(1, 4), collectibles: [] }));
    // the player waits at the door, waving
    const cv = n.querySelector(".ph-kid");
    let raf = 0; const t0 = performance.now();
    const loop = (now) => {
      if (!n.isConnected) { cancelAnimationFrame(raf); return; }
      const c = cv.getContext("2d"), tt = (now - t0) / 1000;
      c.clearRect(0, 0, 220, 220);
      A.shadow(c, 110, 200, 50, 12, 0.25);
      c.save(); c.translate(110, 200); c.scale(1.7, 1.7);
      A.drawChar(c, A.CHARS[P ? P.id : "reuben"], { t: tt, move: 0, side: 0, dir: 1, pose: "wave", blink: tt % 3 < 0.12 });
      c.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return n;
  }

  // Come back out of the destination's door, then the earned stars fly into the total.
  function backToWorld(dest, stars, session) {
    E.pause(false);
    const P = E.player;
    if (P && dest && dest.arrive) {
      P.x = dest.arrive[0]; P.y = dest.arrive[1];
      P.path = null; P.pose = null; P.lock = false; P.lift = 0;
      P.emerge = 0; P.dir = 1; P.side = 0;
      E.snap();
      E.burst(P.x, P.y, 30, "puff", 10);
      E.burst(P.x, P.y, 60, "sparkle", 12);
    }
    E.mode = "play";
    show(hud, true);
    RW.sfx.play("pop");
    irisTo(false, innerWidth / 2, innerHeight / 2);
    if (stars > 0 && P) {
      setTimeout(() => {
        const [sx, sy] = E.worldToScreen(P.x, P.y - 90);
        flyStars(sx, sy, stars);
        RW.sfx.play("cheer");
        E.act("celebrate", 1.4, { lock: false });
        E.say(P, session && session.newHigh ? "New high score!" : stars > 1 ? `${stars} stars!` : "A star!", 1.8);
      }, 700);
    } else syncStars();
    if (session) session.newItems.forEach((id, i) => { const it = RW.collection.byId[id]; if (it) setTimeout(() => toast(`NEW! ${it.name} added to your Collection Book`, it.icon), 1400 + i * 400); });
    // re-open the door card
    E.nearPortal = null;
  }

  // =====================================================================
  // MAP
  // =====================================================================
  const mapEl = $("#map"), mapCv = $("#mapCanvas"), pins = $("#pins");
  const MAP = { x0: -100, y0: 90, x1: 6100, y1: 3260 };
  let mapDirty = true;
  RW.bus.on("stars", () => (mapDirty = true));
  function renderMapCanvas() {
    const W = 1600, H = Math.round(W * (MAP.y1 - MAP.y0) / (MAP.x1 - MAP.x0));
    mapCv.width = W; mapCv.height = H;
    const c = mapCv.getContext("2d");
    const s = W / (MAP.x1 - MAP.x0);
    c.save();
    c.scale(s, s); c.translate(-MAP.x0, -MAP.y0);
    world.drawBackdrop(c, { cam: { x: 2500 }, t: 0 }, { x0: MAP.x0, y0: MAP.y0, w: MAP.x1 - MAP.x0, h: MAP.y1 - MAP.y0 });
    RW.layout.paintGround(c, MAP.x0, 300, MAP.x1, MAP.y1, false);
    const skip = new Set(["star", "item", "npc", "dog", "butterfly", "car", "ball", "fartman", "moon"]);
    const list = E.entities.filter((e) => !skip.has(e.kind) && !e.hidden && e.draw).sort((a, b) => (a.layer === "ground" ? -1e6 : 0) + (a.sortY != null ? a.sortY : a.y) - ((b.layer === "ground" ? -1e6 : 0) + (b.sortY != null ? b.sortY : b.y)));
    const fakeE = Object.assign({}, E, { t: 0, player: null });
    list.forEach((e) => { try { c.save(); c.translate(e.x, e.y); e.draw(c, fakeE, e); if (e.live) e.live(c, fakeE, e); c.restore(); } catch (err) { c.restore(); } });
    c.restore();
    mapDirty = false;
  }
  function openMap() {
    if (E.player && E.player.lock) return;
    RW.sfx.play("whoosh");
    if (mapDirty) renderMapCanvas();
    pins.innerHTML = "";
    const pct = (x, y) => [((x - MAP.x0) / (MAP.x1 - MAP.x0)) * 100, ((y - MAP.y0) / (MAP.y1 - MAP.y0)) * 100];
    world.DESTINATIONS.forEach((d) => {
      if (d.noPin) return;
      const status = world.destStatus(d);
      if (status === "locked" || status === "place" || status === "travel") return; // only games you can play
      const [px, py] = pct(d.map[0], d.map[1]);
      const p = el("button", `pin ${status}`);
      p.type = "button";
      p.style.left = px + "%"; p.style.top = py + "%";
      const g = RW.games.forDestination(d.id);
      const icon = status === "locked" ? LOCK : (g && g.icon) || d.icon;
      const label = status === "locked" ? d.name : world.destTitle(d);
      p.innerHTML = `<span class="pi">${icon}</span><span class="pl">${label}</span>${status === "locked" ? '<span class="ps">COMING SOON</span>' : status === "place" ? "" : '<span class="ps play">PLAY</span>'}`;
      p.addEventListener("click", (ev) => { ev.stopPropagation(); travel(d, p); });
      pins.appendChild(p);
    });
    if (E.player) {
      const [px, py] = pct(E.player.x, E.player.y);
      const me = el("div", "me");
      me.style.left = px + "%"; me.style.top = py + "%";
      const cv = el("canvas"); cv.width = cv.height = 96;
      A.portrait(cv, E.player.id, {});
      me.appendChild(cv); me.appendChild(el("span", "", "YOU"));
      pins.appendChild(me);
    }
    show(mapEl, true);
    requestAnimationFrame(() => mapEl.classList.add("on"));
    show(portalCard, false);
  }
  function closeMap() { mapEl.classList.remove("on"); setTimeout(() => show(mapEl, false), 260); if (portalDest) show(portalCard, true); }
  async function travel(d, pinEl) {
    if (d.unreachable) {
      RW.sfx.play("lock");
      pinEl.classList.remove("shake"); void pinEl.offsetWidth; pinEl.classList.add("shake");
      toast(`${d.name}: no way to get there… yet!`, d.icon);
      return;
    }
    RW.sfx.play("magic");
    const r = pinEl.getBoundingClientRect();
    await irisTo(true, r.left + r.width / 2, r.top + r.height / 2);
    show(mapEl, false); mapEl.classList.remove("on");
    const P = E.player;
    const [ax, ay] = d.arrive || d.portal || d.map;
    const f = E.nearestFree(ax, ay) || [ax, ay];
    P.x = f[0]; P.y = f[1]; P.path = null; P.pose = null; P.lock = false; P.lift = 0; P.emerge = 0;
    E.snap();
    E.burst(P.x, P.y, 40, "sparkle", 14);
    await irisTo(false, innerWidth / 2, innerHeight / 2);
    RW.sfx.play("pop");
    if (world.destStatus(d) !== "locked" && d.portal) setTimeout(() => enterPortal(d), 350);
  }
  $("#mapBtn").addEventListener("click", openMap);
  RW.bus.on("openMap", () => { if (E.mode === "play" && !RW.host.current) openMap(); });

  // Area names: pop up for a moment when you walk into a new neighbourhood
  const zoneEl = $("#zone");
  let zoneNow = null, zoneTimer = 0;
  setInterval(() => {
    const P = E.player;
    if (!P || E.mode !== "play" || RW.host.current || P.hidden) return;
    const z = world.zoneAt(P.x, P.y);
    if (!z || z === zoneNow) { if (!z) zoneNow = null; return; }
    zoneNow = z;
    zoneEl.style.setProperty("--c", z.color);
    zoneEl.innerHTML = `<span>${z.icon}</span><span>${z.name}</span>`;
    zoneEl.classList.add("on");
    clearTimeout(zoneTimer); zoneTimer = setTimeout(() => zoneEl.classList.remove("on"), 2200);
  }, 400);
  $("#mapClose").addEventListener("click", closeMap);
  mapEl.addEventListener("click", (ev) => { if (ev.target === mapEl) closeMap(); });

  // =====================================================================
  // ALL GAMES: pick any game without walking there
  // =====================================================================
  const allEl = $("#allgames");
  function openAll() {
    if (E.player && E.player.lock) return;
    RW.sfx.play("pop");
    const grid = $("#allGrid");
    grid.innerHTML = "";
    RW.games.list.filter((g) => RW.games.status(g) !== "locked" && !g.menu).forEach((g) => {
      const d = world.DEST[g.destination || g.room];
      const st = RW.games.stats(g.id);
      const b = el("button", "g-card");
      b.type = "button";
      b.style.setProperty("--c", g.color || "#2F6BFF");
      b.innerHTML = `<span class="g-ico">${g.icon}</span><span class="g-title">${g.title}</span><span class="g-where">${d ? d.name : ""}</span>`
        + `<span class="g-rec">${st.plays ? `Best ${st.highScore} · ${st.starsEarned} ${STAR_SVG}` : ""}</span><span class="g-play">PLAY</span>`;
      b.addEventListener("click", () => {
        closeAll(true);
        const P = E.player;
        // the player "was" at that game's door, so they walk back out of it afterwards
        if (P && d && d.arrive) { P.x = d.arrive[0]; P.y = d.arrive[1]; P.path = null; E.snap(); }
        RW.host.launch(g, d);
      });
      grid.appendChild(b);
    });
    show(allEl, true);
    requestAnimationFrame(() => allEl.classList.add("on"));
    show(portalCard, false);
  }
  function closeAll(silent) { allEl.classList.remove("on"); setTimeout(() => show(allEl, false), 260); if (!silent && portalDest) show(portalCard, true); }
  $("#allBtn").addEventListener("click", openAll);
  $("#allClose").addEventListener("click", () => closeAll());
  allEl.addEventListener("click", (ev) => { if (ev.target === allEl) closeAll(); });

  // =====================================================================
  // COLLECTION BOOK
  // =====================================================================
  const book = $("#book");
  function openBook() {
    RW.sfx.play("paper");
    const found = Object.keys(RW.save.foundStars).length;
    const secrets = SECRETS.filter((s) => RW.save.secrets[s]).length;
    const items = RW.collection.items;
    const got = items.filter((it) => RW.collection.has(it.id)).length;
    const body = $("#bookBody");
    body.innerHTML = `
      <div class="b-stats">
        <div><b>${RW.save.stars}</b><span>${STAR_SVG} Rosenberg Stars</span></div>
        <div><b>${found}/${world.HIDDEN_STARS.length}</b><span>Hidden stars found</span></div>
        <div><b>${secrets}/${SECRETS.length}</b><span>Secrets discovered</span></div>
        <div><b>${got}/${items.length}</b><span>Collectibles</span></div>
      </div>
      <h3>COLLECTIBLES</h3>
      <div class="b-grid" id="bItems"></div>
      <h3>ROSENBERG HOUSE UPGRADES</h3>
      <div class="b-list" id="bUp"></div>
      <h3>GAMES</h3>
      <div class="b-list" id="bGames"></div>
      <button class="btn ghost b-stats-btn" type="button" id="bookStats">📊 FAMILY STATS</button>
      <button class="reset" type="button" id="resetBtn">Reset all progress</button>`;
    const grid = $("#bItems");
    items.forEach((it) => {
      const has = RW.collection.has(it.id);
      const card = el("div", "b-item" + (has ? " got" : ""));
      const cv = el("canvas"); cv.width = cv.height = 120;
      const c = cv.getContext("2d");
      c.translate(60, 60);
      if (has) { world.drawItem(c, it.id, 34); }
      else { c.fillStyle = "rgba(120,110,160,.25)"; c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill(); A.text(c, "?", 0, 2, 48, "rgba(100,90,150,.6)", { weight: 700 }); }
      card.appendChild(cv);
      card.appendChild(el("div", "b-nm", has ? it.name : "???"));
      if (!has && it.hint) card.appendChild(el("div", "b-hint", it.hint));
      grid.appendChild(card);
    });
    for (let i = 0; i < 6; i++) {
      const card = el("div", "b-item future");
      card.innerHTML = `<div class="b-q">?</div><div class="b-nm">Future game prize</div>`;
      grid.appendChild(card);
    }
    const up = $("#bUp");
    world.UPGRADES.forEach((u) => {
      const on = world.upgradeUnlocked(u);
      up.appendChild(el("div", "b-row" + (on ? " on" : ""), `<span class="b-ri">${on ? "✅" : LOCK}</span><span class="b-rt">${u.name}</span><span class="b-rv">${on ? "BUILT!" : `${u.cost} ${STAR_SVG}`}</span>`));
    });
    const gl = $("#bGames");
    RW.games.list.forEach((g) => {
      const status = RW.games.status(g);
      const d = world.DEST[g.destination];
      if (status === "locked") return;
      const st = RW.games.stats(g.id);
      gl.appendChild(el("div", "b-row on", `<span class="b-ri">${g.icon}</span><span class="b-rt">${g.title}</span><span class="b-rv">${st.plays ? `Best ${st.highScore} · ${st.starsEarned} ${STAR_SVG}` : status === "placeholder" ? "Coming soon" : "Not played yet"}</span>`));
    });
    const futureCount = RW.games.list.filter((g) => RW.games.status(g) === "locked").length;
    gl.appendChild(el("div", "b-row", `<span class="b-ri">${LOCK}</span><span class="b-rt">${futureCount} more games</span><span class="b-rv">COMING SOON</span>`));
    $("#resetBtn").addEventListener("click", () => { if (confirm("Erase ALL Rosenberg World progress for every player on this device?")) RW.resetSave(); });
    $("#bookStats").addEventListener("click", () => { closeBook(); openStats(); });
    show(book, true);
    requestAnimationFrame(() => book.classList.add("on"));
    show(portalCard, false);
  }
  function closeBook() { book.classList.remove("on"); setTimeout(() => show(book, false), 260); if (portalDest) show(portalCard, true); }
  $("#bookBtn").addEventListener("click", openBook);
  $("#bookClose").addEventListener("click", closeBook);
  book.addEventListener("click", (ev) => { if (ev.target === book) closeBook(); });

  // =====================================================================
  // FAMILY STATS: who played, how long, and which games
  // =====================================================================
  const statsEl = $("#stats");
  function openStats() {
    RW.persist();
    RW.sfx.play("paper");
    const body = $("#statsBody");
    body.innerHTML = "";
    const today = RW.today();
    RW.PLAYERS.forEach((id) => {
      const s = A.CHARS[id], pr = RW.profile(id);
      const col = el("div", "st-kid");
      col.style.setProperty("--c", s.color);
      const cv = el("canvas"); cv.width = cv.height = 120; A.portrait(cv, id, {});
      const head = el("div", "st-head"); head.appendChild(cv);
      head.appendChild(el("div", "st-name", `<b>${s.name.toUpperCase()}</b><span>${pr && pr.time && pr.time.last ? "Last played " + new Date(pr.time.last).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Hasn't played yet"}</span>`));
      col.appendChild(head);
      if (!pr) { col.appendChild(el("p", "st-empty", "No games yet. Pick " + s.name + " on the character screen to start!")); body.appendChild(col); return; }
      const t = pr.time || {};
      const games = RW.games.list.filter((g) => RW.games.status(g) !== "locked").map((g) => ({ g, secs: (t.games || {})[g.id] || 0, st: (pr.games || {})[g.id] || {} })).filter((x) => x.secs || x.st.plays).sort((a, b) => b.secs - a.secs);
      col.appendChild(el("div", "st-nums", `
        <div><b>${RW.fmtTime(RW.totalTime(pr))}</b><span>total</span></div>
        <div><b>${RW.fmtTime((t.days || {})[today] || 0)}</b><span>today</span></div>
        <div><b>${pr.stars}</b><span>${STAR_SVG} stars</span></div>`));
      col.appendChild(el("div", "st-line", `🌍 Exploring the world <b>${RW.fmtTime(t.world || 0)}</b>`));
      col.appendChild(el("div", "st-line", `🎮 Visits <b>${t.sessions || 0}</b> · Games played <b>${games.reduce((a, x) => a + (x.st.plays || 0), 0)}</b>`));
      const list = el("div", "st-games");
      if (!games.length) list.appendChild(el("p", "st-empty", "No mini-games yet."));
      const max = Math.max(1, ...games.map((x) => x.secs));
      games.forEach(({ g, secs, st }) => {
        const row = el("div", "st-game");
        row.innerHTML = `<span class="st-gi">${g.icon}</span><span class="st-gt"><b>${g.title}</b><small>${st.plays || 0} ${st.plays === 1 ? "round" : "rounds"}${st.plays ? ` · best ${st.highScore}` : ""}</small><i style="width:${Math.max(4, (secs / max) * 100)}%"></i></span><span class="st-gs">${RW.fmtTime(secs)}</span>`;
        list.appendChild(row);
      });
      col.appendChild(list);
      body.appendChild(col);
    });
    show(statsEl, true);
    requestAnimationFrame(() => statsEl.classList.add("on"));
    show(portalCard, false);
  }
  function closeStats() { statsEl.classList.remove("on"); setTimeout(() => show(statsEl, false), 260); if (portalDest && E.mode === "play") show(portalCard, true); }
  $("#statsClose").addEventListener("click", closeStats);
  statsEl.addEventListener("click", (ev) => { if (ev.target === statsEl) closeStats(); });
  $("#selectStats").addEventListener("click", (ev) => { ev.stopPropagation(); openStats(); });

  // Count play time once a second while the page is visible: in a game, or out exploring.
  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    const cur = RW.host.current;
    if (cur && cur.game) RW.addTime(1, (cur.active || cur.game).id);
    else if (E.mode === "play" && E.player) RW.addTime(1);
    else return;
    if (++tick % 15 === 0) RW.persist();
  }, 1000);
  window.addEventListener("pagehide", () => RW.persist());
  document.addEventListener("visibilitychange", () => { if (document.hidden) RW.persist(); });

  // =====================================================================
  // BOOT
  // =====================================================================
  function boot() {
    buildLogo();
    buildSelect();
    world.build(E);
    world.startTitle();
    E.start();
    // build the ground around the title shot, then reveal
    const v = E.view, z = E.zoomFor("title"), sw = innerWidth / z, sh = innerHeight / z;
    RW.layout.warmGround(2450 - sw / 2 - 200, 1720 - sh / 2 - 100, 2450 + sw / 2 + 200, 1720 + sh / 2 + 100, A.spriteScale);
    document.body.classList.add("ready");
    setupTitleButton();
    setTimeout(() => { titleReady = true; title.classList.add("can-enter"); }, 1500);
    // keep warming chunks near the house quietly
    setTimeout(() => RW.layout.warmGround(1700, 1000, 3300, 2300, A.spriteScale), 2500);
  }
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]) : Promise.resolve();
  fontsReady.then(() => {
    // make sure the rounded display font is actually loaded before canvases use it
    const f = document.fonts && document.fonts.load ? document.fonts.load(`700 20px ${A.FONT}`).catch(() => {}) : Promise.resolve();
    Promise.race([f, new Promise((r) => setTimeout(r, 1200))]).then(boot);
  });
})();
