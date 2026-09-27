// Perfect Sunday: the card deck.
//
// Card fields
//   id        unique string
//   space     which space draws it: happy | annoy | event | friend | perfect
//   world     "any" or a world id (wilmot, prospect, river, ues)
//   for       who can draw it: "any", a character id, or a list of ids
//   title, text   {self} = whoever drew it, {target} = the friend they picked
//   fx        Happiness changes. Keys: self, target, others, all, or a character id
//   fxFor     { characterId: fx } replaces fx when that character drew the card
//   lines     speech bubbles: [who, text]. who = self | target | a character id
//   react     { characterId: text } extra line when that character drew it
//   tags      used by passives (quiet, lego, nerd, sushi, family, park, river,
//             rivertown, outdoor, golf, fashion, design, house, fancy)
//   stats     end-of-game counters to bump
//   target    true = the drawer picks a friend
//   roll      [{ max, text, fx, lines, stats, skip }] resolved by a die roll
//   choices   [{ label, text, fx, roll, lines, stats, cpu: {id: weight} }]
//   skip      "self" or an id: that character misses their next turn
//   special   receipt | coyote | lego | phone | golf  (little animations)
//   stamp     big dramatic caption
//   weight    draw frequency (default 1)

const CARDS = [
  // ================= UNIVERSAL: HAPPY =================
  { id: "u-72", space: "happy", world: "any", for: "any", title: "Seventy-Two and Sunny", text: "Not a cloud. Not one plan canceled.", fx: { self: 1 }, tags: ["outdoor"] },
  { id: "u-coffee", space: "happy", world: "any", for: "any", title: "Great Coffee", text: "The barista gets the order right on the first try.", fx: { self: 1 } },
  { id: "u-nap", space: "happy", world: "any", for: "any", title: "Unscheduled Nap", text: "Twenty minutes on the couch. Nobody needed {self}.", fx: { self: 1 }, tags: ["quiet"] },
  { id: "u-brunch", space: "happy", world: "any", for: "any", title: "No-Wait Brunch", text: "Walked right in. Table by the window.", fx: { self: 1 }, react: { mike: "Statistically, this never happens at 11:30." } },
  { id: "u-kids", space: "happy", world: "any", for: "any", title: "The Kids Are Getting Along", text: "For a full hour. Nobody can explain it.", fx: { self: 1 }, tags: ["family"] },
  { id: "u-groupchat", space: "happy", world: "any", for: "any", title: "Group Chat Gold", text: "Someone posts a photo from 2004. It's devastating.", fx: { self: 1 } },
  { id: "u-bagel", space: "happy", world: "any", for: "any", title: "Warm Bagel", text: "Still warm. Correct amount of cream cheese.", fx: { self: 1 }, react: { mike: "This is the third-best bagel in the county." } },
  { id: "u-parking", space: "happy", world: "any", for: "any", title: "Rock-Star Parking", text: "Right out front. Nobody believes it.", fx: { self: 1 } },

  // ================= UNIVERSAL: ANNOYANCE =================
  { id: "u-circling", space: "annoy", world: "any", for: "any", title: "Third Lap Around the Block", text: "Still no parking.", fx: { self: -1 } },
  { id: "u-rain", space: "annoy", world: "any", for: "any", title: "Surprise Rain", text: "The app said 10%.", fx: { self: -1 }, react: { mike: "Ten percent means something specific, actually." } },
  { id: "u-email", space: "annoy", world: "any", for: "any", title: "Work Email on a " + DAY, text: "Subject line: “Quick question.”", fx: { self: -1 } },
  { id: "u-party", space: "annoy", world: "any", for: "any", title: "Kid's Birthday Party", text: "Two hours. A bounce house. A magician named Gary.", fx: { self: -1 } },
  { id: "u-battery", space: "annoy", world: "any", for: "any", title: "Phone at 2%", text: "Right when {self} needed the address.", fx: { self: -1 }, react: { mike: "This is a crisis." } },
  { id: "u-youths", space: "annoy", world: "any", for: "any", title: "Sidewalk Dance Video", text: "Teenagers are filming a dance in the exact middle of the sidewalk.", fx: { self: -1 }, react: { adam: "Youths." }, stats: { youths: 1 } },
  { id: "u-leafblower", space: "annoy", world: "any", for: "any", title: "Leaf Blower, 8:02 a.m.", text: "On a " + DAY + ".", fx: { self: -1 }, react: { adam: "Unbelievable." } },
  { id: "u-line", space: "annoy", world: "any", for: "any", title: "The Forty-Minute Line", text: "It's for a sandwich.", choices: [
    { label: "Wait it out", cpu: { mike: 4, adam: 0.4 }, roll: [
      { max: 3, text: "Sold out two people ahead.", fx: { self: -1 } },
      { max: 6, text: "It was worth it. It was so worth it.", fx: { self: 2 } } ] },
    { label: "Walk away", text: "Dignity intact. Still hungry.", fx: {}, cpu: { adam: 3 } } ] },

  // ================= UNIVERSAL: EVENT =================
  { id: "u-sitcom", space: "event", world: "any", for: "any", title: "Sitcom Logic", text: "Something completely ridiculous happens. Everyone accepts it immediately and moves on.", fx: { self: 1 } },
  { id: "u-exec", space: "event", world: "any", for: "any", title: "Executive Energy", text: "{self} announces a plan with total confidence. It is not a plan.", roll: [
    { max: 3, text: "Nobody follows. Nobody.", fx: { self: -1 } },
    { max: 6, text: "Somehow, it works.", fx: { self: 2 } } ] },
  { id: "u-nynonsense", space: "event", world: "any", for: "any", title: "New York Nonsense", text: "Getting across town now requires two trains, a shuttle bus and an apology.", fx: { self: -1 }, react: { mike: "There was a faster way. I sent it to the group." } },
  { id: "u-package", space: "event", world: "any", for: "any", title: "Mystery Package", text: "A box arrives. Nobody remembers ordering it.", roll: [
    { max: 3, text: "It's more charging cables.", fx: {} },
    { max: 6, text: "It's great, whatever it is.", fx: { self: 2 } } ] },
  { id: "u-rewatch", space: "event", world: "any", for: "any", title: "The Rewatch", text: "Someone suggests rewatching a certain rapid-fire NBC workplace comedy. Season three. Everyone agrees instantly.", fx: { all: 1 }, tags: ["quiet"] },
  { id: "u-reservation", space: "event", world: "any", for: "any", title: "5:15 or 8:45", text: "Those are the only two tables left.", choices: [
    { label: "5:15", text: "Home by seven. Glorious.", fx: { self: 1 }, cpu: { adam: 4, marshall: 2 } },
    { label: "8:45", cpu: { billy: 3 }, roll: [
      { max: 3, text: "Asleep at the table by dessert.", fx: { self: -1 } },
      { max: 6, text: "Big night. Legendary, even.", fx: { self: 2 } } ] } ] },
  { id: "u-where", space: "event", world: "any", for: ["adam", "marshall", "billy"], title: "Where Should We Eat?", text: "The group has to pick a restaurant.", choices: [
    { label: "Just pick one", text: "{self} picks. Mike visibly struggles.", fx: { self: 1, mike: -1 }, lines: [["mike", "Okay but did you check—"]], cpu: { adam: 2, billy: 2 } },
    { label: "Let Mike research it", roll: [
      { max: 2, text: "Forty minutes later, Mike is comparing parking.", fx: { self: -1, mike: 1 }, stats: { lookedUp: 1 } },
      { max: 6, text: "Honestly? Incredible spot.", fx: { self: 2, mike: 1 }, stats: { lookedUp: 1 } } ], cpu: { marshall: 1 } } ] },
  { id: "u-speech", space: "event", world: "any", for: "any", title: "Unprompted Toast", text: "{self} stands up at brunch and gives a speech about synergy. It goes on.", roll: [
    { max: 2, text: "The waiter starts clearing plates mid-sentence.", fx: { self: -1 } },
    { max: 6, text: "Standing ovation. Slightly ironic, but still.", fx: { self: 1 } } ] },
  { id: "u-market", space: "event", world: "any", for: "any", title: "Farmers Market", text: "Fourteen-dollar jam. {self} buys two.", fx: { self: 1 }, tags: ["outdoor"] },
  { id: "u-hot-take", space: "event", world: "any", for: "any", title: "Hot Take", text: "{self} declares a sandwich is not a taco. This becomes a two-hour conversation.", fx: { self: 1 }, lines: [["mike", "Technically—"]] },

  // ================= UNIVERSAL: FRIEND =================
  { id: "u-app", space: "friend", world: "any", for: "any", target: true, title: "Split the Appetizer", text: "{target} orders the good dumplings. {self} gets half.", fx: { self: 1, target: 1 } },
  { id: "u-cancel", space: "friend", world: "any", for: "any", target: true, title: "Mutual Cancellation", text: "{target} cancels. {self} is secretly thrilled. So is {target}.", fx: { self: 1, target: 1 }, tags: ["quiet"] },
  { id: "u-throwback", space: "friend", world: "any", for: "any", target: true, title: "Throwback Photo", text: "{self} posts an old photo of {target}. The hair. The jeans.", fx: { self: 1, target: -1 }, lines: [["target", "Delete that."]] },
  { id: "u-debate", space: "friend", world: "any", for: "any", title: "The Bagel Debate", text: "Best bagel in the tri-state. Voices are raised. Nobody wins. Everyone had fun.", fx: { all: 1 }, lines: [["mike", "I have a ranked list."], ["billy", "Of course you do."]] },
  { id: "u-host", space: "friend", world: "any", for: "any", target: true, title: "{target} Hosts", text: "Great snacks. Reasonable end time. Perfect.", fx: { self: 1, target: 1 }, tags: ["family"] },
  { id: "u-borrowed", space: "friend", world: "any", for: "any", target: true, title: "The Borrowed Thing", text: "{target} finally returns the thing {self} lent them in 2019.", fx: { self: 1 } },
  { id: "u-quick-q", space: "friend", world: "any", for: ["adam", "marshall", "billy"], title: "A Quick Question for Mike", text: "{self} asks Mike a quick question. It is not quick.", fx: { self: -1, mike: 2 }, lines: [["mike", "Okay, so interestingly…"]], stats: { lookedUp: 1 } },
  { id: "u-spreadsheet", space: "friend", world: "any", for: "any", title: "Mike's Spreadsheet", text: "Mike made a spreadsheet for the group trip. It has tabs.", roll: [
    { max: 3, text: "Tab 7 is labeled “Contingencies (Weather).”", fx: { others: -1, mike: 1 }, lines: [["billy", "Why."]] },
    { max: 6, text: "It's genuinely helpful. Nobody says so.", fx: { all: 1 } } ], stats: { lookedUp: 1 } },
  { id: "u-golf-outing", space: "friend", world: "any", for: "any", title: "Group Golf Outing", text: "Everyone plays nine holes together.", roll: [
    { max: 3, text: "Mike talks during Billy's backswing. About hotel points.", fx: { billy: -2, mike: 1 }, lines: [["billy", "…"], ["mike", "What?"]], stats: { golf: 1 } },
    { max: 6, text: "Flawless etiquette all day. Billy is visibly moved.", fx: { billy: 2, others: 1 }, tags: ["golf"] } ] },
  { id: "u-westchester", space: "friend", world: "any", for: "any", title: "“There's Actually a Great Place in—”", text: "Someone starts recommending a restaurant elsewhere in Westchester.", lines: [["marshall", "Where?"]], roll: [
    { max: 2, text: "It's in Dobbs Ferry. A Rivertown. Marshall allows it.", fx: { marshall: 1, self: 1 } },
    { max: 6, text: "It's in White Plains. Marshall is skeptical for the rest of the day.", fx: { marshall: -1 } } ] },

  // ================= UNIVERSAL: PERFECT =================
  { id: "u-perfect-hour", space: "perfect", world: "any", for: "any", title: "The Perfect Hour", text: "Great weather. Great food. Everyone's phones are away.", fx: { self: 3 }, react: { mike: "Mine was in my pocket. On silent. Checking." } },
  { id: "u-all-free", space: "perfect", world: "any", for: "any", title: "Everyone's Free", text: "All four friends are free at the same time. Unprecedented.", fx: { self: 2 } },
  { id: "u-ninth", space: "perfect", world: "any", for: "any", title: "Walk-Off in the Ninth", text: "{self} was there. Great seats.", fx: { self: 3 }, react: { mike: "I knew the bullpen numbers were bad." } },
  { id: "u-golden", space: "perfect", world: "any", for: "any", title: "Golden Hour", text: "The light hits just right. Everyone looks great in the photo.", fx: { self: 2 }, tags: ["outdoor"], react: { billy: "Finally, good lighting." } },

  // ================= ADAM =================
  { id: "a-lego", space: "happy", world: "any", for: "adam", title: "Rare LEGO Set", text: "Adam finds the set he has wanted for years. Unopened.", fx: { self: 2 }, tags: ["lego"], stats: { lego: 1 }, special: "lego", lines: [["self", "Oh."]] },
  { id: "a-pie", space: "happy", world: "any", for: "adam", title: "Rhubarb Pie", text: "Someone unexpectedly has excellent rhubarb pie.", fx: { self: 2 }, lines: [["self", "Is this rhubarb?"]] },
  { id: "a-sushi", space: "happy", world: "any", for: "adam", title: "Perfect Sushi", text: "The sushi is excellent and nobody needs to discuss it for 25 minutes.", fx: { self: 2 }, tags: ["sushi"] },
  { id: "a-daughters", space: "happy", world: "any", for: "adam", title: "The Recital", text: "Front row for his daughters. He tears up a little. He denies it.", fx: { self: 2 }, tags: ["family"] },
  { id: "a-marathon", space: "happy", world: "any", for: "adam", title: "Space Saga Marathon", text: "The original trilogy. A quiet couch. Nobody talking.", fx: { self: 1 }, tags: ["nerd", "quiet"] },
  { id: "a-youths", space: "annoy", world: "any", for: "adam", title: "Youths", text: "Teenagers are being slightly too loud nearby. Adam is irrationally irritated.", fx: { self: -1 }, lines: [["self", "Youths."]], stats: { youths: 1 } },
  { id: "a-incident", space: "annoy", world: "any", for: "adam", title: "The Incident", text: "A brief, unfortunate emergency. New pants. Nobody speaks of it.", fx: { self: -1 }, weight: 0.6 },
  { id: "a-ipo", space: "event", world: "any", for: "adam", title: "IPO Rumor", text: "Someone tells Adam he is about to become unimaginably rich.", fx: { self: 1 }, lines: [["self", "We'll see."]], stats: { ipo: 1 } },
  { id: "a-la", space: "event", world: "any", for: "adam", title: "Los Angeles Again", text: "Adam realizes he has another trip to LA.", roll: [
    { max: 3, text: "Red-eye home. Middle seat.", fx: { self: -1 } },
    { max: 6, text: "Good sushi involved.", fx: { self: 1 }, tags: ["sushi"] } ] },
  { id: "a-penn", space: "event", world: "any", for: "adam", title: "Penn Person", text: "Someone casually mentions Penn. Adam somehow knows them.", fx: { self: 1 } },
  { id: "a-product", space: "event", world: "any", for: "adam", title: "Terrible Checkout Flow", text: "Adam uses a consumer app with seven unnecessary steps.", choices: [
    { label: "Let it go", text: "He lets it go. His eye twitches.", fx: {}, cpu: { adam: 1 } },
    { label: "Redesign it in his head", text: "Fixed. Mentally. Nobody will ever know.", fx: { self: 1 }, cpu: { adam: 3 } } ] },
  { id: "a-silence", space: "perfect", world: "any", for: "adam", title: "Total Silence", text: "The kids are at a friend's. The house is silent. The LEGO is out.", fx: { self: 3 }, tags: ["quiet", "lego"], stats: { lego: 1 } },

  // ================= MARSHALL =================
  { id: "m-riverwalk", space: "happy", world: "any", for: "marshall", title: "River Walk", text: "The Hudson looks incredible. Marshall reminds everyone this is why he lives here.", fx: { self: 2 }, tags: ["river"] },
  { id: "m-bbq", space: "happy", world: "any", for: "marshall", title: "BBQ", text: "Excellent brisket appears. Bark on point.", fx: { self: 2 } },
  { id: "m-family", space: "happy", world: "any", for: "marshall", title: "Family Day", text: "Beautiful day in the park with the family.", fx: { self: 2 }, tags: ["park", "family"] },
  { id: "m-train", space: "happy", world: "any", for: "marshall", title: "Metro-North Is On Time", text: "To the minute. Marshall takes a picture of the board.", fx: { self: 1 }, tags: ["rivertown"] },
  { id: "m-otherfood", space: "annoy", world: "any", for: "marshall", title: "Other Westchester Food", text: "Someone claims another suburb has excellent restaurants.", fx: { self: -1 }, lines: [["self", "Where?"]] },
  { id: "m-marnina", space: "annoy", world: "any", for: "marshall", title: "Marnina", text: "Someone inexplicably brings up Marnina from middle school. Marshall would like this conversation to end.", fx: { self: -1 }, weight: 0.4 },
  { id: "m-creditors", space: "annoy", world: "any", for: "marshall", title: "Creditor Call", text: "On a " + DAY + ". The unsecured creditors have thoughts.", fx: { self: -1 }, weight: 0.6 },
  { id: "m-restaurant", space: "event", world: "any", for: "marshall", title: "New Irvington Restaurant", text: "Marshall discovers another great restaurant within three miles of his house.", fx: { self: 2 }, tags: ["rivertown"], stats: { rivertown: 1 } },
  { id: "m-coyote", space: "event", world: "any", for: "marshall", title: "Coyote", text: "A coyote trots by.", special: "coyote", stats: { coyotes: 1 }, roll: [
    { max: 3, text: "Marshall spends the rest of the turn discussing coyotes.", fx: {} },
    { max: 6, text: "Everyone agrees it was very cool.", fx: { self: 1 }, tags: ["outdoor"] } ] },
  { id: "m-city", space: "event", world: "any", for: "marshall", title: "Someone Suggests the City", text: "“What if we all went into Manhattan?”", choices: [
    { label: "Go", cpu: { marshall: 0.3 }, roll: [
      { max: 3, text: "Traffic on the Saw Mill. Of course.", fx: { self: -1 } },
      { max: 6, text: "Fine. It was fine.", fx: { self: 1 } } ] },
    { label: "Stay up here", text: "Why don't we just stay up here?", fx: { self: 1 }, tags: ["rivertown"], cpu: { marshall: 5 } } ] },
  { id: "m-sunset", space: "perfect", world: "any", for: "marshall", title: "Hudson Sunset From the Deck", text: "BBQ going. Kids happy. River glowing.", fx: { self: 3 }, tags: ["river"], lines: [["self", "I mean. Come on."]] },

  // ================= BILLY =================
  { id: "b-backswing", space: "happy", world: "any", for: "billy", title: "Perfect Backswing", text: "Nobody says anything during Billy's backswing. Not a word.", fx: { self: 2 }, tags: ["golf"], special: "golf" },
  { id: "b-house", space: "happy", world: "any", for: "billy", title: "Beautiful House", text: "Billy sees a beautifully designed house. Proportions. Materials. Restraint.", fx: { self: 2 }, tags: ["house"] },
  { id: "b-jacket", space: "happy", world: "any", for: "billy", title: "Great Jacket", text: "Billy spots an excellent jacket in the wild.", fx: { self: 1 }, tags: ["fashion"] },
  { id: "b-talks", space: "annoy", world: "any", for: "billy", title: "Someone Talks", text: "Someone talks during Billy's backswing. Billy stares at them.", fx: { self: -2 }, lines: [["self", "…"]], stats: { golf: 1 } },
  { id: "b-line", space: "annoy", world: "any", for: "billy", title: "Putting Line", text: "Someone walks directly through Billy's line.", fx: { self: -1 }, lines: [["self", "Are you serious?"]], stats: { golf: 1 } },
  { id: "b-reno", space: "annoy", world: "any", for: "billy", title: "Bad Renovation", text: "Billy spots a renovation with inexplicable finishes.", fx: { self: -1 }, lines: [["self", "Why is the grout that color?"]] },
  { id: "b-citarella", space: "event", world: "any", for: "billy", title: "“What's Citarella?”", text: "Billy is stunned. Then delighted, because now he gets to explain it.", fx: { self: 1 }, tags: ["fancy"], stats: { citarella: 1 } },
  { id: "b-debbie", space: "event", world: "any", for: "billy", title: "Something for Debbie", text: "Billy buys Debbie another piece of clothing.", fx: { self: 1 }, tags: ["fashion"], special: "receipt" },
  { id: "b-development", space: "event", world: "any", for: "billy", title: "Some Random Development", text: "Billy is somehow involved in another real estate project. Nobody fully understands what it is. Mixed-use, possibly.", fx: { self: 1 } },
  { id: "b-shoes", space: "event", world: "any", for: "billy", title: "The Shoes", text: "Billy notices someone's shoes.", choices: [
    { label: "Say something", cpu: { billy: 1 }, roll: [
      { max: 3, text: "It becomes a whole thing.", fx: { self: -1 } },
      { max: 6, text: "They thank him. They're buying new ones.", fx: { self: 2 }, tags: ["fashion"] } ] },
    { label: "Judge silently", text: "A long, silent look. Message received.", fx: { self: 1 }, cpu: { billy: 2 } } ] },
  { id: "b-mock", space: "friend", world: "any", for: "billy", title: "Why Did You Research This?", text: "Mike explains the history of the golf course. Unprompted.", fx: { self: 1, mike: 1 }, lines: [["self", "Why did you research this?"], ["mike", "Because I wanted to know."]], stats: { mock: 1 } },
  { id: "b-ace", space: "perfect", world: "any", for: "billy", title: "Hole in One", text: "Par 3. Witnesses. Nobody spoke.", fx: { self: 3 }, tags: ["golf"], special: "golf" },

  // ================= MIKE =================
  { id: "k-houseprice", space: "event", world: "any", for: "mike", title: "What Did That Sell For?", text: "Mike casually wonders what a nearby house sold for.", special: "phone", roll: [
    { max: 2, text: "He lets it go. (He does not let it go.)", fx: {} },
    { max: 6, text: "He now knows the sale price, prior owner, property taxes and lot size.", fx: { self: 2 }, stats: { lookedUp: 1 } } ] },
  { id: "k-hotel", space: "event", world: "any", for: "mike", title: "Hotel Research", text: "Mike opens 31 browser tabs comparing hotels.", special: "phone", stats: { lookedUp: 1 }, roll: [
    { max: 2, text: "Found the perfect hotel. Lost the rest of the day.", fx: { self: 2 }, skip: "self" },
    { max: 6, text: "Found the perfect hotel. Upgrade likely.", fx: { self: 2 } } ] },
  { id: "k-factcheck", space: "event", world: "any", for: "mike", title: "Fact Check", text: "Someone makes a questionable factual statement. Mike immediately investigates.", special: "phone", roll: [
    { max: 2, text: "Inconclusive. He'll get back to everyone.", fx: {} },
    { max: 6, text: "Mike was right. He sends a screenshot.", fx: { self: 2 }, stats: { lookedUp: 1 } } ] },
  { id: "k-calories", space: "happy", world: "any", for: "mike", title: "Food Calculation", text: "Mike estimates the calories in someone's lunch without being asked. “About 1,140. Give or take the aioli.”", fx: { self: 1 } },
  { id: "k-yankees", space: "happy", world: "any", for: "mike", title: "Yankees Deep Dive", text: "A casual question about a 1998 middle reliever. Mike has the full stat line.", fx: { self: 1 }, stats: { lookedUp: 1 } },
  { id: "k-upgrade", space: "happy", world: "any", for: "mike", title: "Upgrade Secured", text: "The research paid off. Suite upgrade.", fx: { self: 2 }, lines: [["self", "Tuesday check-in. Always Tuesday."]] },
  { id: "k-pickone", space: "annoy", world: "any", for: "mike", title: "Just Pick One", text: "Someone tells Mike: “Just pick one.”", fx: { self: -1 }, lines: [["self", "There are actually three things to consider."]] },
  { id: "k-whocares", space: "annoy", world: "any", for: "mike", title: "“Who Cares?”", text: "Someone says “who cares?” Mike cares.", fx: { self: -1 } },
  { id: "k-wrong", space: "annoy", world: "any", for: "mike", title: "Mike Was Wrong", text: "Mike confidently researched something and was incorrect. Billy was there.", fx: { self: -2, billy: 1 }, lines: [["billy", "Say it."], ["self", "I was… misinformed."]], weight: 0.4 },
  { id: "k-billywhy", space: "friend", world: "any", for: "mike", title: "Billy Asks Why", text: "Mike mentions the exact square footage of a random house.", fx: { self: 1 }, lines: [["billy", "Why would you possibly know this?"], ["self", "Because I looked it up."]], stats: { mock: 1 } },
  { id: "k-nobody", space: "friend", world: "any", for: ["mike", "billy"], title: "Nobody Cares", text: "Mike is explaining mortgage rate history.", fx: { mike: -1, billy: 1 }, lines: [["billy", "Nobody cares."], ["mike", "That's not the point."]], stats: { mock: 1 } },
  { id: "k-hours", space: "friend", world: "any", for: ["mike", "billy"], title: "How Many Hours?", text: "Mike presents a restaurant ranking. With footnotes.", fx: { mike: 1, billy: 1 }, lines: [["billy", "How many hours did you spend on this?"], ["mike", "That's irrelevant."]], stats: { mock: 1 } },
  { id: "k-owner", space: "friend", world: "any", for: "mike", title: "Who Owns That House?", text: "Mike asks one simple question. Two turns later:", fx: { self: 2, others: -1 }, lines: [["self", "Okay, so interestingly…"], ["billy", "Please."]], stats: { lookedUp: 1 } },
  { id: "k-right", space: "perfect", world: "any", for: "mike", title: "Mike Was Right", text: "Everyone discovers Mike's unnecessary research was actually useful.", fx: { self: 3 }, stamp: "THIS IS WHY I LOOKED IT UP.", stats: { lookedUp: 1 } },

  // ================= FRIEND PAIRS =================
  { id: "p-sushi", space: "friend", world: "any", for: ["adam", "mike"], title: "Sushi Sourcing", text: "Mike explains exactly where the fish was caught. Adam just wanted to eat it.", fx: { adam: -1, mike: 1 }, lines: [["adam", "Can we just…"], ["mike", "Hokkaido. Tuesday."]] },
  { id: "p-jacket", space: "friend", world: "any", for: ["adam", "billy"], title: "The 2011 Jacket", text: "Billy compliments Adam's jacket. It's from 2011. Billy is confused by how good it looks.", fx: { adam: 1 }, lines: [["billy", "Where is this from?"], ["adam", "A store."]] },
  { id: "p-openhouse", space: "friend", world: "any", for: ["marshall", "billy"], title: "Irvington Open House", text: "Billy tours a house near Marshall's and approves.", fx: { marshall: 1, billy: 1 }, tags: ["house", "rivertown"], lines: [["marshall", "This is what I'm saying."]] },
  { id: "p-dads", space: "friend", world: "any", for: ["adam", "marshall"], title: "Dad Summit", text: "Adam and Marshall quietly agree that everything was better before.", fx: { adam: 1, marshall: 1 }, tags: ["quiet"] },
  { id: "p-coyote-talk", space: "friend", world: "any", for: ["mike", "marshall"], title: "Coyote Facts", text: "Marshall mentions a coyote. Mike already knows their territorial range.", fx: { marshall: 1, mike: 1 }, stats: { coyotes: 1, lookedUp: 1 } },

  // ================= WILMOT WOODS =================
  { id: "w-forsale", space: "event", world: "wilmot", for: "any", title: "House for Sale", text: "A sign goes up down the street.", fx: { self: 1, mike: 1 }, special: "phone", lines: [["mike", "Wait, how much are they asking?"]], stats: { lookedUp: 1 } },
  { id: "w-second", space: "event", world: "wilmot", for: "any", title: "Second Floor Addition", text: "Someone mentions adding a second story. Mike immediately develops six possible floor plans.", fx: { mike: 2 }, fxFor: { billy: { self: 1, mike: 1 } }, tags: ["house"], stats: { lookedUp: 1 } },
  { id: "w-neighbor", space: "friend", world: "wilmot", for: "any", title: "Random Neighbor", text: "Nobody remembers his name. Mike knows the purchase price, renovation date and square footage.", fx: { mike: 1, self: 1 }, lines: [["mike", "Bought in '17. Kitchen in '21."]], stats: { lookedUp: 1 } },
  { id: "w-contractor", space: "annoy", world: "wilmot", for: "any", title: "Bad Contractor", text: "The contractor said two weeks. That was March.", fx: { self: -1 } },
  { id: "w-pickup", space: "annoy", world: "wilmot", for: "any", title: "School Pickup Line", text: "It moves four feet every ten minutes.", fx: { self: -1 } },
  { id: "w-suv", space: "annoy", world: "wilmot", for: "any", title: "Three-Row SUV, Parallel", text: "Someone attempts to parallel park a three-row SUV. Six minutes. Everyone watches.", fx: { self: -1 }, react: { billy: "Painful." } },
  { id: "w-house", space: "happy", world: "wilmot", for: "any", title: "Beautiful House", text: "A perfect colonial. Black shutters. Good bones.", fx: { self: 1 }, tags: ["house"] },
  { id: "w-playground", space: "happy", world: "wilmot", for: "any", title: "Empty Playground", text: "The kids have the whole playground. Nobody is crying.", fx: { self: 1 }, tags: ["family", "park"] },
  { id: "w-leaves", space: "perfect", world: "wilmot", for: "any", title: "The Leaf Pile", text: "The kids jump into a giant leaf pile. Nobody gets hurt. The coffee is still warm.", fx: { self: 3 }, tags: ["family"] },

  // ================= PROSPECT PARK =================
  { id: "pp-morning", space: "happy", world: "prospect", for: "any", title: "Perfect Park Morning", text: "Nice weather. Kids happy. Nobody bothers anyone.", fx: { self: 1 }, fxFor: { adam: { self: 2 } }, tags: ["park", "quiet"] },
  { id: "pp-ebikes", space: "annoy", world: "prospect", for: "any", title: "Youths on E-Bikes", text: "A group of youths zips through the path at inconsiderate speeds.", fx: { self: -1 }, lines: [["adam", "Youths."]], stats: { youths: 1 } },
  { id: "pp-lego", space: "event", world: "prospect", for: "adam", title: "LEGO Delivery", text: "A suspiciously large LEGO box arrives.", fx: { self: 2 }, tags: ["lego"], lines: [["self", "It's for the kids."]], stats: { lego: 1 }, special: "lego" },
  { id: "pp-flight", space: "annoy", world: "prospect", for: "adam", title: "Flight to LA", text: "Adam receives another flight notification. He sighs.", fx: { self: -1 } },
  { id: "pp-strollers", space: "annoy", world: "prospect", for: "any", title: "Stroller Formation", text: "The path is fully blocked by six strollers walking side by side.", fx: { self: -1 } },
  { id: "pp-croissant", space: "happy", world: "prospect", for: "any", title: "Last Croissant", text: "The bakery has exactly one croissant left. It's {self}'s.", fx: { self: 1 } },
  { id: "pp-stoop", space: "happy", world: "prospect", for: "any", title: "Stoop Time", text: "Sitting on a brownstone stoop with an iced coffee. That's it. That's the whole thing.", fx: { self: 1 }, tags: ["quiet", "design"] },
  { id: "pp-market", space: "event", world: "prospect", for: "any", title: "Grand Army Market", text: "Twenty stands of heirloom tomatoes.", lines: [["mike", "Which stand has the best ratio of price to ripeness?"]], roll: [
    { max: 3, text: "Mike finds out. It takes an hour.", fx: { mike: 1, self: -1 }, fxFor: { mike: { self: 1 } }, stats: { lookedUp: 1 } },
    { max: 6, text: "Best tomatoes of the summer.", fx: { self: 2 } } ] },
  { id: "pp-bench", space: "perfect", world: "prospect", for: "any", title: "The Long Meadow", text: "A bench. A breeze. Not a single youth in sight.", fx: { self: 3 }, tags: ["quiet", "park"] },

  // ================= THE RIVER =================
  { id: "r-view", space: "happy", world: "river", for: "any", title: "Hudson View", text: "The river is doing that thing it does.", fx: { self: 1, marshall: 1 }, tags: ["river"], lines: [["marshall", "I mean, come on."]] },
  { id: "r-restaurant", space: "event", world: "river", for: "any", title: "Great Local Restaurant", text: "Main Street. Walkable. Fantastic.", fx: { self: 1, marshall: 1 }, tags: ["rivertown"], lines: [["marshall", "This is what I'm saying."]], stats: { rivertown: 1 } },
  { id: "r-scarsdale", space: "annoy", world: "river", for: "any", title: "Someone Suggests Scarsdale", text: "Someone knows a great restaurant down in Scarsdale.", fx: { marshall: -1 }, fxFor: { mike: { self: 1, marshall: -1 } }, lines: [["marshall", "What's it called?"]], react: { mike: "4.6 stars. 900 reviews." } },
  { id: "r-coyote", space: "event", world: "river", for: "any", title: "Coyote!", text: "A coyote strolls along the Aqueduct Trail like it pays taxes here.", special: "coyote", stats: { coyotes: 1 }, roll: [
    { max: 3, text: "Marshall spends the rest of the turn discussing coyotes.", fx: {} },
    { max: 6, text: "Everyone thinks it's very cool.", fx: { self: 1, marshall: 1 }, tags: ["outdoor"] } ] },
  { id: "r-metronorth", space: "annoy", world: "river", for: "any", title: "Metro-North Delay", text: "“Signal problems near Spuyten Duyvil.”", fx: { self: -1 } },
  { id: "r-picnic", space: "happy", world: "river", for: "any", title: "Waterfront Picnic", text: "Blanket, sandwiches, sailboats.", fx: { self: 2 }, tags: ["river", "park", "family"] },
  { id: "r-mainst", space: "happy", world: "river", for: "any", title: "Main Street Stroll", text: "Ice cream, a bookstore, and a view of the river at the bottom of the hill.", fx: { self: 1 }, tags: ["rivertown"] },
  { id: "r-rivertown", space: "friend", world: "river", for: "any", title: "Other Rivertowns", text: "Dobbs Ferry, Hastings, Tarrytown. Marshall accepts them as allies.", fx: { self: 1, marshall: 1 }, tags: ["rivertown"], stats: { rivertown: 1 } },
  { id: "r-sunset", space: "perfect", world: "river", for: "any", title: "Sunset on the Hudson", text: "The whole sky turns orange over the Palisades.", fx: { self: 3 }, tags: ["river"], lines: [["marshall", "Why would anyone leave?"]] },

  // ================= UPPER EAST SIDE =================
  { id: "e-citarella", space: "event", world: "ues", for: "any", title: "Citarella", text: "Someone has never heard of Citarella. Billy looks genuinely disturbed.", fx: { billy: 1 }, fxFor: { billy: { self: 2 } }, tags: ["fancy"], stats: { citarella: 1 }, lines: [["billy", "You've never… okay. Come with me."]] },
  { id: "e-apartment", space: "happy", world: "ues", for: "any", title: "Beautiful Apartment", text: "Prewar. Herringbone floors. Billy approves. This is rare.", fx: { self: 1 }, fxFor: { billy: { self: 2 } }, tags: ["design"] },
  { id: "e-reno", space: "annoy", world: "ues", for: "any", title: "Terrible Renovation", text: "Someone put a gray floor in a prewar classic six.", fx: { self: -1 }, lines: [["billy", "Unacceptable."]] },
  { id: "e-jacket", space: "happy", world: "ues", for: "any", title: "Good Jacket", text: "Madison Avenue window. Perfect cut.", fx: { self: 1 }, tags: ["fashion"] },
  { id: "e-doorman", space: "happy", world: "ues", for: "any", title: "The Doorman Knows Your Name", text: "“Good afternoon, {self}.”", fx: { self: 1 } },
  { id: "e-juice", space: "annoy", world: "ues", for: "any", title: "$19 Juice", text: "It is mostly celery.", fx: { self: -1 }, fxFor: { billy: { self: 1 } }, react: { billy: "Worth it." } },
  { id: "e-openhouse", space: "event", world: "ues", for: "any", title: "Open House", text: "Mike asks the broker fourteen questions. Billy judges the crown molding.", fx: { mike: 1, billy: 1 }, tags: ["house"], stats: { lookedUp: 1 } },
  { id: "e-golfshop", space: "event", world: "ues", for: "any", title: "Golf Shop", text: "A perfectly balanced new putter.", fx: { self: 1, billy: 1 }, fxFor: { billy: { self: 2 } }, tags: ["golf"] },
  { id: "e-park", space: "friend", world: "ues", for: "any", title: "Central Park Edge", text: "A walk along Fifth with a friend.", target: true, fx: { self: 1, target: 1 }, tags: ["park"], react: { marshall: "It's nice. It's not the river." } },
  { id: "e-fifth", space: "perfect", world: "ues", for: "any", title: "Fifth Avenue " + DAY, text: "Museum, lunch, a perfect walk home under the trees.", fx: { self: 3 }, tags: ["design"] },
];

// Funny end-of-game statistics
const STAT_LABELS = {
  rabbitHoles: "Rabbit holes entered",
  lookedUp: "Things Mike looked up",
  youths: "Youths encountered",
  coyotes: "Coyotes spotted",
  golf: "Golf etiquette violations",
  mock: "Times Billy mocked Mike",
  rivertown: "Rivertown restaurants visited",
  lego: "LEGO sets acquired",
  citarella: "Citarella mentions",
  ipo: "IPO rumors (status: we'll see)",
  debbie: "Spent on clothes for Debbie",
  specials: "Special abilities used",
  laps: "Laps of the neighborhood",
};
