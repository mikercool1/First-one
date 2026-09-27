// Rosenberg World bridge. Include this in any mini-game:
//
//   <script src="../rw-bridge.js"></script>
//
// When a round ends (the game keeps showing its own end screen):
//
//   RosenbergBridge.report({ score: 1234, stars: 3 });          // stars: 0-10, banked right away
//
// To hand control back to the world immediately with a result:
//
//   RosenbergBridge.finish({ score: 1234, stars: 3 });
//   RosenbergBridge.finish({ score: 5, stars: 1, collectibles: ["baseball"] });
//
// To go back to the world (shows the results of anything reported, then the player walks out):
//
//   RosenbergBridge.exit();
//
// Any element with a data-rw-back attribute (normally a hidden "BACK TO ROSENBERG WORLD"
// button on the game's end screens) is shown and wired to exit() when running inside the world.
//
// RosenbergBridge.inWorld tells you if the game is running inside Rosenberg World,
// and RosenbergBridge.player is "reuben", "jonah" or "ellie" (or null when standalone).
// When the game is opened on its own, everything here does nothing, so the same file
// works standalone and inside the hub.

(function () {
  var params = new URLSearchParams(location.search);
  var named = /^rw:/.test(window.name || "");
  var inWorld = (params.get("rw") === "1" || named) && window.parent && window.parent !== window;
  function send(msg) {
    if (!inWorld) return false;
    try { window.parent.postMessage(msg, "*"); return true; } catch (e) { return false; }
  }
  function pack(type, result) {
    result = result || {};
    return { type: type, score: Number(result.score) || 0, stars: Number(result.stars) || 0, collectibles: result.collectibles || [] };
  }
  var bridge = window.RosenbergBridge = {
    inWorld: inWorld,
    player: inWorld ? params.get("player") || (named ? window.name.slice(3) : null) : null,
    report: function (result) { return send(pack("rosenberg-world:report", result)); },
    finish: function (result) { return send(pack("rosenberg-world:finish", result)); },
    exit: function () { return send({ type: "rosenberg-world:exit" }); },
    // Called just before the world closes the game (the ✕ button), so a round in progress
    // can still report() what it earned: RosenbergBridge.onLeave(function () { ... });
    onLeave: function (cb) { leaveCbs.push(cb); },
  };
  var leaveCbs = [];
  window.addEventListener("message", function (e) {
    if (!inWorld || e.source !== window.parent || !e.data || e.data.type !== "rosenberg-world:leaving") return;
    for (var i = 0; i < leaveCbs.length; i++) { try { leaveCbs[i](); } catch (err) { /* keep going */ } }
  });
  // Lets a game's CSS make room for the hub's close button: .rw-in-world .hud { ... }
  if (inWorld) document.documentElement.classList.add("rw-in-world");
  function wire() {
    if (!inWorld) return;
    var els = document.querySelectorAll("[data-rw-back]");
    for (var i = 0; i < els.length; i++) {
      var b = els[i];
      b.hidden = false;
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); bridge.exit(); });
      b.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      b.addEventListener("touchstart", function (e) { e.stopPropagation(); }, { passive: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
