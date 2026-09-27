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
// Games on the Game Room bookshelf are opened with &room=1. Any element with a data-rw-room
// attribute (a hidden "BACK TO THE GAME ROOM" button) is then shown and goes back to the room.
//
// RosenbergBridge.inWorld tells you if the game is running inside Rosenberg World,
// and RosenbergBridge.player is "reuben", "jonah", "ellie" or "max" (or null when standalone).
// When the game is opened on its own, everything here does nothing, so the same file
// works standalone and inside the hub.

(function () {
  var params = new URLSearchParams(location.search);
  var inWorld = params.get("rw") === "1" && window.parent && window.parent !== window;
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
    player: inWorld ? params.get("player") : null,
    report: function (result) { return send(pack("rosenberg-world:report", result)); },
    finish: function (result) { return send(pack("rosenberg-world:finish", result)); },
    exit: function () { return send({ type: "rosenberg-world:exit" }); },
  };
  // Lets a game's CSS make room for the hub's close button: .rw-in-world .hud { ... }
  if (inWorld) document.documentElement.classList.add("rw-in-world");
  bridge.fromRoom = params.get("room") === "1";
  bridge.roomUrl = function () {
    var q = new URLSearchParams(location.search); q.delete("room"); q.set("back", "1");
    return "../game-room/index.html?" + q.toString();
  };
  function wire() {
    if (bridge.fromRoom) {
      var rooms = document.querySelectorAll("[data-rw-room]");
      for (var j = 0; j < rooms.length; j++) {
        rooms[j].hidden = false;
        rooms[j].addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); location.href = bridge.roomUrl(); });
        rooms[j].addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      }
    }
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
