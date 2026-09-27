// Witch Mountain: the spelling words. 3rd-grade words that have a clear picture.
// tier 1 = the low witches, tier 2 = the middle, tier 3 = the high witches near the top.
// Add a word: { w: "word", e: "picture emoji", tier: 1-3 }. Only letters a-z.

window.WM = window.WM || {};

window.WM.WORDS = [
  // tier 1: short words, regular spelling
  { w: "frog", e: "🐸", tier: 1 }, { w: "snail", e: "🐌", tier: 1 }, { w: "whale", e: "🐳", tier: 1 },
  { w: "shark", e: "🦈", tier: 1 }, { w: "zebra", e: "🦓", tier: 1 }, { w: "tiger", e: "🐯", tier: 1 },
  { w: "camel", e: "🐫", tier: 1 }, { w: "snake", e: "🐍", tier: 1 }, { w: "sheep", e: "🐑", tier: 1 },
  { w: "horse", e: "🐴", tier: 1 }, { w: "mouse", e: "🐭", tier: 1 }, { w: "lemon", e: "🍋", tier: 1 },
  { w: "bread", e: "🍞", tier: 1 }, { w: "pizza", e: "🍕", tier: 1 }, { w: "grapes", e: "🍇", tier: 1 },
  { w: "crown", e: "👑", tier: 1 }, { w: "ghost", e: "👻", tier: 1 }, { w: "robot", e: "🤖", tier: 1 },
  { w: "train", e: "🚂", tier: 1 }, { w: "kite", e: "🪁", tier: 1 }, { w: "tent", e: "⛺", tier: 1 },
  { w: "clock", e: "⏰", tier: 1 }, { w: "drum", e: "🥁", tier: 1 }, { w: "moon", e: "🌙", tier: 1 },
  { w: "broom", e: "🧹", tier: 1 }, { w: "truck", e: "🚚", tier: 1 }, { w: "corn", e: "🌽", tier: 1 },
  { w: "socks", e: "🧦", tier: 1 }, { w: "cake", e: "🎂", tier: 1 }, { w: "bell", e: "🔔", tier: 1 },
  { w: "shell", e: "🐚", tier: 1 }, { w: "duck", e: "🦆", tier: 1 }, { w: "crab", e: "🦀", tier: 1 },

  // tier 2: blends, digraphs, double letters
  { w: "turtle", e: "🐢", tier: 2 }, { w: "monkey", e: "🐒", tier: 2 }, { w: "parrot", e: "🦜", tier: 2 },
  { w: "lizard", e: "🦎", tier: 2 }, { w: "spider", e: "🕷️", tier: 2 }, { w: "dragon", e: "🐉", tier: 2 },
  { w: "rabbit", e: "🐇", tier: 2 }, { w: "cherry", e: "🍒", tier: 2 }, { w: "cookie", e: "🍪", tier: 2 },
  { w: "pretzel", e: "🥨", tier: 2 }, { w: "popcorn", e: "🍿", tier: 2 }, { w: "tomato", e: "🍅", tier: 2 },
  { w: "pumpkin", e: "🎃", tier: 2 }, { w: "pencil", e: "✏️", tier: 2 }, { w: "castle", e: "🏰", tier: 2 },
  { w: "guitar", e: "🎸", tier: 2 }, { w: "trumpet", e: "🎺", tier: 2 }, { w: "balloon", e: "🎈", tier: 2 },
  { w: "feather", e: "🪶", tier: 2 }, { w: "cactus", e: "🌵", tier: 2 }, { w: "anchor", e: "⚓", tier: 2 },
  { w: "hammer", e: "🔨", tier: 2 }, { w: "rainbow", e: "🌈", tier: 2 }, { w: "basket", e: "🧺", tier: 2 },
  { w: "camera", e: "📷", tier: 2 }, { w: "jacket", e: "🧥", tier: 2 }, { w: "crayon", e: "🖍️", tier: 2 },
  { w: "trophy", e: "🏆", tier: 2 }, { w: "bucket", e: "🪣", tier: 2 }, { w: "ladder", e: "🪜", tier: 2 },
  { w: "snowman", e: "⛄", tier: 2 }, { w: "penguin", e: "🐧", tier: 2 }, { w: "dolphin", e: "🐬", tier: 2 },
  { w: "octopus", e: "🐙", tier: 2 }, { w: "chicken", e: "🐔", tier: 2 }, { w: "turkey", e: "🦃", tier: 2 },
  { w: "thumb", e: "👍", tier: 2 }, { w: "wrench", e: "🔧", tier: 2 }, { w: "bridge", e: "🌉", tier: 2 },
  { w: "rocket", e: "🚀", tier: 2 }, { w: "carrot", e: "🥕", tier: 2 }, { w: "candle", e: "🕯️", tier: 2 },
  { w: "magnet", e: "🧲", tier: 2 }, { w: "cheese", e: "🧀", tier: 2 }, { w: "cupcake", e: "🧁", tier: 2 },

  // tier 3: long words and tricky spellings
  { w: "elephant", e: "🐘", tier: 3 }, { w: "giraffe", e: "🦒", tier: 3 }, { w: "squirrel", e: "🐿️", tier: 3 },
  { w: "butterfly", e: "🦋", tier: 3 }, { w: "kangaroo", e: "🦘", tier: 3 }, { w: "flamingo", e: "🦩", tier: 3 },
  { w: "dinosaur", e: "🦕", tier: 3 }, { w: "unicorn", e: "🦄", tier: 3 }, { w: "pineapple", e: "🍍", tier: 3 },
  { w: "watermelon", e: "🍉", tier: 3 }, { w: "strawberry", e: "🍓", tier: 3 }, { w: "broccoli", e: "🥦", tier: 3 },
  { w: "scissors", e: "✂️", tier: 3 }, { w: "umbrella", e: "☂️", tier: 3 }, { w: "helicopter", e: "🚁", tier: 3 },
  { w: "airplane", e: "✈️", tier: 3 }, { w: "bicycle", e: "🚲", tier: 3 }, { w: "tractor", e: "🚜", tier: 3 },
  { w: "volcano", e: "🌋", tier: 3 }, { w: "island", e: "🏝️", tier: 3 }, { w: "mushroom", e: "🍄", tier: 3 },
  { w: "violin", e: "🎻", tier: 3 }, { w: "backpack", e: "🎒", tier: 3 }, { w: "lightning", e: "⚡", tier: 3 },
  { w: "tornado", e: "🌪️", tier: 3 }, { w: "hedgehog", e: "🦔", tier: 3 }, { w: "peacock", e: "🦚", tier: 3 },
  { w: "lobster", e: "🦞", tier: 3 }, { w: "sailboat", e: "⛵", tier: 3 }, { w: "snowflake", e: "❄️", tier: 3 },
  { w: "glasses", e: "👓", tier: 3 }, { w: "ambulance", e: "🚑", tier: 3 }, { w: "envelope", e: "✉️", tier: 3 },
  { w: "telescope", e: "🔭", tier: 3 }, { w: "pancakes", e: "🥞", tier: 3 }, { w: "lollipop", e: "🍭", tier: 3 },
  { w: "skateboard", e: "🛹", tier: 3 }, { w: "hamburger", e: "🍔", tier: 3 }, { w: "sandwich", e: "🥪", tier: 3 },
];

// Kindergarten and 1st-grade words, used when Jonah is playing (he's 6).
// tier 1 = three-letter words, tier 2 = easy four-letter words, tier 3 = first-grade blends.
window.WM.EASY_WORDS = [
  { w: "cat", e: "🐱", tier: 1 }, { w: "dog", e: "🐶", tier: 1 }, { w: "pig", e: "🐷", tier: 1 },
  { w: "sun", e: "☀️", tier: 1 }, { w: "hat", e: "👒", tier: 1 }, { w: "bus", e: "🚌", tier: 1 },
  { w: "bed", e: "🛏️", tier: 1 }, { w: "cup", e: "🥤", tier: 1 }, { w: "fox", e: "🦊", tier: 1 },
  { w: "hen", e: "🐔", tier: 1 }, { w: "bat", e: "🦇", tier: 1 }, { w: "bug", e: "🐛", tier: 1 },
  { w: "egg", e: "🥚", tier: 1 }, { w: "ant", e: "🐜", tier: 1 }, { w: "box", e: "📦", tier: 1 },
  { w: "map", e: "🗺️", tier: 1 }, { w: "pen", e: "🖊️", tier: 1 }, { w: "web", e: "🕸️", tier: 1 },
  { w: "van", e: "🚐", tier: 1 }, { w: "log", e: "🪵", tier: 1 }, { w: "fan", e: "🪭", tier: 1 },
  { w: "cow", e: "🐮", tier: 1 }, { w: "bee", e: "🐝", tier: 1 }, { w: "car", e: "🚗", tier: 1 },

  { w: "fish", e: "🐟", tier: 2 }, { w: "ball", e: "⚽", tier: 2 }, { w: "milk", e: "🥛", tier: 2 },
  { w: "cake", e: "🎂", tier: 2 }, { w: "kite", e: "🪁", tier: 2 }, { w: "boat", e: "⛵", tier: 2 },
  { w: "moon", e: "🌙", tier: 2 }, { w: "duck", e: "🦆", tier: 2 }, { w: "bear", e: "🐻", tier: 2 },
  { w: "lion", e: "🦁", tier: 2 }, { w: "book", e: "📖", tier: 2 }, { w: "door", e: "🚪", tier: 2 },
  { w: "sock", e: "🧦", tier: 2 }, { w: "king", e: "🤴", tier: 2 }, { w: "ring", e: "💍", tier: 2 },
  { w: "nest", e: "🪺", tier: 2 }, { w: "hand", e: "✋", tier: 2 }, { w: "corn", e: "🌽", tier: 2 },

  { w: "frog", e: "🐸", tier: 3 }, { w: "star", e: "⭐", tier: 3 }, { w: "tree", e: "🌳", tier: 3 },
  { w: "crab", e: "🦀", tier: 3 }, { w: "drum", e: "🥁", tier: 3 }, { w: "ship", e: "🚢", tier: 3 },
  { w: "snow", e: "❄️", tier: 3 }, { w: "sled", e: "🛷", tier: 3 }, { w: "clock", e: "⏰", tier: 3 },
  { w: "train", e: "🚂", tier: 3 }, { w: "truck", e: "🚚", tier: 3 }, { w: "shell", e: "🐚", tier: 3 },
  { w: "chick", e: "🐤", tier: 3 }, { w: "plane", e: "✈️", tier: 3 }, { w: "brush", e: "🪥", tier: 3 },
];
