// Rosenberg World bridge. Include this in any mini-game:
//
//   <script src="../rw-bridge.js"></script>
//
// Then, when a round is over:
//
//   RosenbergBridge.finish({ score: 1234, stars: 3 });          // stars: 0-10
//   RosenbergBridge.finish({ score: 5, stars: 1, collectibles: ["baseball"] });
//
// To quit back to the world without a result:
//
//   RosenbergBridge.exit();
//
// RosenbergBridge.inWorld tells you if the game is running inside Rosenberg World,
// and RosenbergBridge.player is "reuben", "jonah" or "ellie" (or null when standalone).
// When the game is opened on its own, finish() and exit() do nothing, so the same file
// works standalone and inside the hub.

(function () {
  var params = new URLSearchParams(location.search);
  var inWorld = params.get("rw") === "1" && window.parent && window.parent !== window;
  function send(msg) {
    if (!inWorld) return false;
    try { window.parent.postMessage(msg, "*"); return true; } catch (e) { return false; }
  }
  window.RosenbergBridge = {
    inWorld: inWorld,
    player: inWorld ? params.get("player") : null,
    finish: function (result) {
      result = result || {};
      return send({ type: "rosenberg-world:finish", score: Number(result.score) || 0, stars: Number(result.stars) || 0, collectibles: result.collectibles || [] });
    },
    exit: function () { return send({ type: "rosenberg-world:exit" }); },
  };
})();
