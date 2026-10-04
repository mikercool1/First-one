# Probrands

A deal screen for US professional brands: branded chemical products that tradespeople and plant workers hold in their hand (WD-40, CRC, Oatey, Nu-Calgon, Kano and the like), mapped to the companies that own them. Built from the Professional Brands Market Map workbook. It started as a copy of the Home Base profiler but is now its own app, built around one question: which PE- and family-owned companies fit the pro brands playbook?

Live app: https://claude.ai/artifact/UkLSFqKaS38kQqd4JmvNhk (private to the owner until shared)

## Pages

- **The screen**: every owner ranked by its DNA score. Green (70+) at the top, amber (45 to 69) in the middle, red (under 45) at the bottom. Companies that fail "pro brands are most of revenue" are out of scope and hidden behind a toggle. Filter by product family, end market or search.
- **Whitespace**: how far each company is from full distribution, and what filling the gaps could be worth. A chart plots DNA score against reach, so the "great product, under-distributed" corner (DNA 70+, reach under 50%) stands out. The table ranks companies by headroom, lowest reach, or proven missing doors. See "Reach and headroom" below.
- **Roll-up**: pick any set of companies (search, a quick-start list of PE platforms, or "Add to roll-up" on a company page; the selection lives in the URL, so it can be shared). It shows:
  - combined revenue, brands and doors, and how many doors two or more members share
  - each member's cross-sell: distributors another member already sells to that stock its categories but don't carry it, valued at its own revenue per door times the capture rate
  - a "who unlocks whom" matrix and a category-overlap matrix (high = head-to-head, low = complementary)
  - head-to-head brand pairs
  - the best next add-ons: PE, family, ESOP and private owners with DNA 45+, no bigger than the platform, ranked by cross-sell both ways
  - **Save roll-ups**: name a combination and save it. Saved roll-ups live in the `rollups` collection, shared with everyone who can open the page, and list at the bottom of the Roll-up page. A company page links to every saved roll-up it's in.
  - **Cross-sell / Whitespace switch**: Cross-sell covers distributors one member already sells to that another could enter. Whitespace covers distributors none of the members sell to yet, where at least one member has a right to win (10%+ of its SKUs fit).
    - Each whitespace door shows which members fit and by how much, the rivals already there ("proven"), its channel type, and its value. Value is the sum over fitting members of revenue per full door × right to win × door size × the demonstrated rate.
    - Doors are split into the platform's current end markets and new end markets (where 2+ of the members' rivals already sell).
    - **Tracker**: on a saved roll-up, each whitespace door has a status (Not started, Targeted, In discussion, Listed, Passed), saved on the roll-up's document (`doors` field) and filterable.
    - The roll-up plan from Claude now covers the whitespace too.
  - **Pricing** (third switch): the good / better / best ladder the members build together. Each category 2+ members price in shows which member brand sits in Good, Better and Best, flags where combining adds a tier no member had alone, and flags same-tier overlaps to rationalize. Members' price index and price lever are listed, and categories one member prices alone show the gaps an add-on could fill.
  - **Platform** (first switch, the default), top to bottom: the members side by side (DNA, revenue, pro revenue, retail share, employees, brands, SKUs, doors, biggest door and top-3 door share) with a platform total row; **where the revenue sits**, each member's revenue spread over the distributors that carry it by door weight, combined, with the top-3 and top-10 shares and how many members each door touches; and the **value bridge**: combined revenue today, plus cross-sell (at the capture setting), plus price (each member's lever), to pro forma revenue, with procurement savings listed beside it and each lever's confidence. SKU overlap is listed, not sized. Below it, **day-one EBITDA upside**: cross-sell revenue at a gross margin (pro brands run 50–80%; 65% midpoint by default, with a selector from 50% to 80%), plus price and cost savings at 100% to the bottom line, with the total at 50% and 80% and as a share of combined revenue. This is the one place the app shows EBITDA, and it is the upside only, not the members' current EBITDA.
  - **Claude's roll-up plan** sits near the bottom of the page, closed until opened; the name-and-save bar stays at the top.
  - **Brand architecture**: for each category two or more members sell in, which brand leads (biggest range there: SKUs in the category, then reach) and what the others become: value or premium flanker (a different price tier on the like-for-like index), fold into the lead (under 35% of the lead's range in the same tier), split by channel (retail share 25+ points apart) or review (comparable range, same tier or no prices).
  - **SKU overlap**: the members' products (listings de-duplicated by name) in the same category, package format and pack size (sizes converted to ounces and bucketed within about 10%), how many of those slots sit on the same distributor's shelf, each member's share of listings in overlapping slots and a rough revenue at stake. Uses each SKU's own normalized category (`sku` docs, field 9, from v31+ imports).
  - **Procurement scenarios and the savings bridge**: the Procurement tab opens with a bridge of the savings (packaging, raw materials, freight, small buyers to direct pricing, total) with the top formats and raw-material families behind each bar. Clicking the green procurement number at the top of Roll-up opens it. Three scenarios: **Day one** (pool volume on today's specs and suppliers; the editable rates: 3% commodity, 1.5% semi-specialty, 0.5% specialty, the Product tab's packaging rates, 3% freight), **Years 1–2** (buy direct, common specs, fewer suppliers, index-linked contracts: 7% / 4% / 1.5%, packaging rates × 1.6, freight 6%) and **Structural** (plus filling footprint, co-packers and the freight network: 9% / 5.5% / 2.5%, packaging × 2 up to 18%, freight 10%). **Small buyers to direct pricing** (on by default): a member buying under a quarter of the largest buyer's volume of an input gets an extra 4% commodity, 2.5% semi-specialty, 1% specialty or 3% packaging on that spend, for moving off distributor prices. The chosen scenario carries into the value bridge and the EBITDA upside on the Platform tab, which also lists all three. Commodity savings count the margin over the index, not price moves.
  - **Procurement** (fourth switch): procurement synergy from the members' actual overlaps. See "Roll-up procurement synergy" below. The Roll-up page's gauge shows the total and opens this view.
  - **Roll-up plan**: Claude writes a plan for the exact mix selected: thesis, where the cross-sell is, first moves, go-to-market, what to rationalize, next add-ons, and risks. It gets each member's best doors (fit, proof, who opens them), who unlocks whom, category overlap, head-to-head brands, the demonstrated rates with the ITW benchmark, and the next add-ons. Plans are saved in the `rollplans` collection, keyed by the set of members, so the same mix reopens its plan.
- **Engine** (`#engine`): a simple LBO on any roll-up. Pick the current roll-up selection or any saved roll-up. Each business is bought at revenue (shared with the CRM; click to change) × EBITDA margin (25% base, set per business) × entry multiple (13× base, set per business). Synergies come from the deal screen (cross-sell gross profit at the Platform tab's gross margin, price, procurement at the chosen scenario), each switchable, plus a master switch. Debt is 5.5× synergized EBITDA; deal fees 2% of EV and debt fees 2.25% of debt. Revenue grows 6% a year, margin expands 25 bps a year, synergies grow with revenue, exit at 18× in year 3 (multiple and year 2–5 adjustable). It shows sources and uses, equity required, exit equity, MOIC, IRR, total return (profit), the projection and a MOIC grid (exit multiple × exit year). Debt is held flat (no cash sweep or interest). Inputs are remembered in the browser; "Reset to base case" restores them.
- **Strategy** (from any company page):
  - "Where to push": the biggest move in each direction (distribution, new end market, line extension, add-on)
  - the distribution headroom panel
  - "Pricing strategy": the company's good / better / best ladder by category, the category's upper quartile and leaders, a move for each (Take price, Edge up, Add a Best, Hold the premium, Fix channel prices), the price lever, and what each 1% of price is worth in revenue. "Where to push" includes the biggest pricing move.
  - "Extend the line": categories its own distributors already stock that it doesn't sell, with the leading brands there and family, ESOP or private owners it could buy instead of build
  - add-ons that cross-sell
  - "Fix first": DNA gaps with advice
  - "Ask Claude for a growth plan" writes a plan from those facts. It is saved in the `strategy` collection (one document per company), so everyone with access sees the latest one.
- **Company**: the DNA test check by check, SKU mix (package format, end market, brand, distributor), the brand list with who carries each one, deals, the workbook's write-up and sources.
- **Brands**: all 3,094 brands, searchable by brand, owner, product, maker or distributor, and filterable by the workbook's triage bucket (for example Actionable candidate), owner status (including where Claude's owner guess and the market map's disagree), owner type, segment, category, format, end market and distributor. Each brand has a page with its owner, where it's sold (with the broadline, specialty and retail split), package formats and every scraped SKU with links to the distributor listing.
- **Competitors**: every brand page shows the market map's competitor list first (same category, ranked by distributor reach, with each owner's type and sponsor), then up to 8 more rival brands with each one's owner and ownership type (PE, Family, ESOP, Private, Corporate), and the Brands table shows the top 3. Rivals are matched in `import/build_import.py` by how alike their products look on distributor shelves (product categories, hero product and SKU names), ranked higher when they share distributors. Brands with the same owner are left out. Each company page rolls this up into "Who it competes with": the owners of rival brands, ranked by how many of the company's brands they meet.
- **Categories**: a market study of each product category (v29+). See "Category market studies" below.
  - **The list** is an attractiveness screen: every studied category scored 1-5 on seven criteria (repeat purchase, brand loyalty, pricing power, fragmentation, growth, regulatory moat, pro channel). Weights start from the workbook's and can be changed per viewer (saved in that browser). A chart plots attractiveness against pro market size. The table shows the seven scores, pro and US market, growth with sizing confidence, top end markets, owners and private share, and price spread. It sorts by any of these and filters by segment.
  - **A category page** is the study, with no overall score (a single blended number misleads at this level): what it is, the seven research ratings, use occasions, bull and bear case, **end-market mix** (research share of dollars next to where the map finds it listed), the **price ladder** (like-for-like, top 30 brands, with $/oz quartiles), market size with how it was built, form factors, who competes (top brands by reach, private owners with revenue and retail share), adjacent categories (both directions), buying criteria, value chain, channels, regulation, seasonality, substitutes, trends, consolidation, deals, diligence questions and sources. The map's own owners and brands for the category sit in a collapsed section.
- **End markets** (v30+): who buys these products. The list shows the 14 end markets (every distributor belongs to one) with implied spend in our categories, distributors, SKUs, brands, private-owned share, top format and pack, top categories and distributors, plus a **category × end market heatmap** of scraped SKU shares (sort by any end market). An end-market page is its profile: who they are (workforce, spend, cyclicality, demand drivers), jobs to be done, the most common products (research ranking next to what its distributors list, with leading brands), who orders and how, distributors (research and our scrape), formats and pack sizes, top brands, who supplies the shelf (ownership mix and the private owners with the most SKUs), regulation, trends, what wins, associations and sources. Category pages now show their observed mix across these 14 end markets, linked.
- **Product** (v31+, summary layout v47): laid out like a format page. Gauges up front (formats, raw-material families, total raw-material spend, and revenue-weighted raw materials, packaging and gross margin as % of sales), a share-of-SKUs mix by package format next to a share-of-spend mix by raw material, a formats table (SKUs, share, components, packaging % of COGS, savings rate; each opens its format page with the bill of materials) and raw materials ranked by spend (each opens its own page). Chemistry and cost by category, the format mix heatmap and the market-level synergy calculator (top-down, illustrative; for real companies use Roll-up → Procurement) sit closed at the bottom.
- **Oct 2026 research update** (`import/audit/apply_audit.py`, from the consolidated end-market research PDF): corrected the statements it showed were wrong (WD-40's US sales anchor in Penetrants, Washington's postponed copper antifouling rule in Marine, the methylene chloride rule in force since April 28, 2026 in Removers, EPA's 150-GWP aerosol limits in Solvents), widened the market-size range where a published estimate differs (Cutting & metalworking fluids up to $2.77B, confidence now Medium; Greases down to $607M), and added the new published market data to 21 categories' "How big is the market" panel with sources. End-market splits, point estimates, pro shares and scores are unchanged.
- **Raw materials** (`#rm.N`, from Product and Roll-up → Procurement): one page per raw-material family. It shows estimated US pro spend and share of all raw-material spend, how specialized it is (commodity / semi / specialty by category), where the spend sits by category, the biggest buyers (owners by SKUs in those categories), main suppliers, and what the material is in each category (folded).
- **Pricing**: who is premium in each category. One row per category with brands priced, median $/oz, the spread (90th / 10th percentile index, how much room the category gives a premium brand), the premium leaders, the value end, and how many premium brands are PE or family owned. A category page draws the price ladder: every brand's index on a log scale (0.25× to 4×), coloured by owner type, with a line from its lowest to highest price and a shaded premium zone (1.15× and up), plus a table with pro-channel and retail-channel indices. The top of the page has "What pricing teaches" (lessons from the whole ladder) and "Price-lever targets": Good-tier brands (Medium or High confidence) on 5+ pro distributors whose owner is PE, family, ESOP or private with DNA 45+, where distribution already proves pull but the price hasn't followed. A second tab, **Leaders & laggards** (`#premium`), ranks every priced brand by its price multiple, leaders first or laggards first. It can be filtered by price position (click a count), segment, category (which ranks brands on that category alone), owner type, evidence (Medium or High confidence by default, the clear calls) and search. Each row shows the multiple with a bar on a log scale, the range, the categories priced, the share of prices in Best and Good, and pro vs retail. See "Price ladder", "Price position" and "Pricing strategy" below.
- **Distributors**: a summary first, like SKU mix: channel and end-market mix by SKUs, whose brands fill the shelves (brand listings), and three ranked lists (biggest shelves, where PE + family win, most best-fit owners). The full table follows, top 25 with "Show all". A distributor page opens with "The shelf" (owner type, segment, category and package format mixes), then the top owners, other distributors in the same end market with brands in common, and the brand list, each capped with "Show all". The original description: all 186 distributors in the market map. For each one it shows the channel (broadline MRO, trade specialty, retail-leaning), end market, brands found, SKUs scraped and a bar of whose brands fill the shelf by owner type. It also shows the PE + family share, how many green-DNA PE or family owners sell there, and how many brands are carried only there. Sort by PE + family share to find the channels where independent pro brands win. A distributor page lists the owners on its shelf with their DNA scores, a category breakdown and every brand. Brand pages link to their distributors.
- **Consolidators**: who is buying pro brands, ranked by add-on deals in the ledger and then by brands owned; PE sponsors and their platforms; add-ons by year; the deal log.

- **SKU mix**: format, end market, product family, distributors and brands across everything in the filter, plus the broadline, specialty and retail channel split. Every row links: formats to their format page, end markets to the matching end-market profile, segments to Categories (filtered), and categories, distributors and brands to their pages. Company and brand SKU mixes link the same way.
- **Package formats** (`#fmt.N`, from SKU mix, company, brand and distributor pages): one page per scraped format (Bottle/Liquid, Aerosol, Paste/Can, Cartridge, Kit, Squeeze tube, Marker/Paint stick, Powder, Wipe, Other). It shows SKUs and share, brands and owners, the owner-type, segment and category mix, top owners and brands, where it's sold, the categories that use it (Product tab mix), and what the package is made of (packaging % of COGS, typical savings, filling, synergy levers and the bill of materials, folded). All owners; the ownership filter doesn't apply.

The ownership filter in the left rail (PE, Family, ESOP, Private, Corporate) applies to every page. PE + Family is the default.

**Revenue you set.** Click a company's revenue (on its page, or in the Roll-up Platform table) to change it; Enter saves, Escape cancels, Reset goes back to the workbook's figure. It is one number shared with the CRM: it is stored in the CRM's record (`hb_companies/<id>`, `total_revenue_usd_m`, marked Verified and locked), so the CRM shows it, and a revenue changed in the CRM flows back into every Probrands page (the screen, company pages, Whitespace, Roll-up, procurement). Pro revenue scales with it. Edited figures carry an "edited" tag with the workbook's number on hover.

**Long lists and research detail.** Long lists show their top rows with a "Show all" button (distributors, owners on a shelf, missing doors, rivals, consolidators, sponsors, the deal log, private owners in a category). Research-heavy sections open on click: on category pages the uses, form factors, chemistry, adjacent categories, other notes, diligence questions and sources; on end-market pages how products are used, who orders, distributors, other notes, growth and sources; on company pages the sources and the method notes; on Roll-up the method and the demonstrated cross-sell rates.

## CRM

**CRM** (the link under the page list, `#crm`) is a company repository built into Probrands. It was first called Home Base and was renamed so it isn't confused with the separate Home Base app. It uses the Home Base profiler's features in the Probrands look (left rail, hazard stripe, stencil type, safety yellow), but it is a separate module running only on this app's market map. It carries no Home Base data and has no link to any other app.

**Where it lives and how it's built**
- It runs in its own full-screen frame. "← Back to Probrands" returns to the screen. Its pages sit under `#crm/<route>` (for example `#crm/c.zep-inc`; old `#hb/` links still open), so links and the Back button work.
- The source is `crm/crm.html`. `python3 probrands/crm/embed.py` copies it into `index.html` (between the `<!--HB-->` markers). Run it after every change to `crm.html`.
- Its calls to Claude, the database and web search go through a bridge in the Probrands page, which rebuilds each call's arguments in the page's own objects (the claude.ai runtime can refuse objects made in the frame).

**What it shows.** It reads the market map from Probrands when the data loads:
- One profile per owner (1,101). Each has revenue, employees, owner type, sponsor and entry year, parent, HQ, website, business model, the write-up and sourced evidence.
- **Sectors** are the market map's segments (Janitorial / Facility, MRO / Industrial, Plumbing / HVAC and so on). Each company's split comes from its SKU mix.
- **End markets** are the 14 distributor end markets.
- The **product catalog** is the owner's brands by category, with hero products and formats.
- The **deal book** holds the market map's 529 deals.
- Brand names resolve to their owners in search and buyer matching.

**What it keeps.** Everything changed in the CRM is saved over that base in its own collections, `hb_*` (`hb_companies`, `hb_details`, `hb_dealbook`, `hb_sponsors`, `hb_tam`, `hb_chats` and so on; the prefix stays from the old name so nothing saved moves). The market map itself is never touched. Deleting a market-map company there hides it in the CRM only.

**Pages.** Home, Sectors, Companies, Buyer finder, Precedents, End markets, Market size, PE owned, In market and Campaign. There is also the Private equity side: firms, funds, portfolio, exits, fundraising, people and coverage. Company pages have the profile builder (Build), inline editing with confidence and source of truth, and the company chat (Chat, on company pages).

**Left out of this version**
- Other industries and verticals: it is pro brands only.
- EBITDA, margins and EV/EBITDA, the same as the rest of the app.
- Cloud deep research, which needs a scheduled research session. Research runs in the page instead: the builder steps and the chat use Claude, with web search through the Parallel Search connector when the viewer has it connected.

## Look

Rugged shop-floor design: gunmetal and steel, safety yellow used sparingly, a hazard stripe, condensed signage-style headings, and a left control rail. DNA bands are green, amber and red. (A navy and orange version following the Workmark brand board was tried and set aside; it is in commit 2ccfcf2.)

## Categories

Categories come from the market map's normalized categories (Brands tab, Category (normalized)), grouped into segments by the Competition tab. Each brand has one primary category in the workbook, but many sell across several. So each SKU's raw category from the scrape is mapped to the normalized category that most brands using that raw label sit in. A brand then counts in every category where it has 2 or more SKUs, as well as its primary one. CRC, for example, is primarily General cleaners & degreasers but also counts in Lubricants & oils, Greases, Automotive & fleet chemicals and others. Category filters on the screen, Brands and SKU mix use this wider membership, and so does the "Brands selling" count on the Categories page. "Core brands" is the workbook's own count by primary category.

## Prices, reviews and company size

- **Brand page**: shows price position against the category (Premium, Mid or Value, with $/oz and the index) where the Prices tab has data. Positions based on fewer than 3 priced items are marked thin. The brand page also lists every captured price row, including the ones excluded from $/oz and why. Reviews (most-reviewed product, rating and count) show where the workbook has them.
- **Company page**: shows revenue with its size confidence, employees (count, band and LinkedIn baseline), and the size sources. EBITDA and margins are not shown (removed: the workbook's margin model wasn't reliable).
- **The screen**: shows revenue and staff and can be filtered by revenue band.

### Price ladder

Built in `import/build_import.py` and stored in the `data/pricing` document.

- **Headline index (v28+)**: the market map's like-for-like price index (the workbook's price regression, kept on its Margin Model tab, section D; nothing else from that tab is used). It regresses log $/oz on category, distributor, category × form factor and a category-specific size slope, plus a ridge-shrunk brand effect. So each brand is compared with competitors on the same distributor shelves, in the same format and size, and 1.0× is the median brand in the category. Shrinkage pulls thin evidence toward 1.0×, so it reads less extreme than raw $/oz.
- **Confidence** comes from the workbook: High = 5+ items, 2+ distributors and 3+ same-shelf peers; Medium; Low. Low-confidence rows are drawn faint.
- **Spread and channels**: our own per-price indices (each $/oz against the category median for its pack-size band: under 8 oz, 8–32, 32–128, over 128) give the lowest-to-highest line, the pro and retail indices and the per-tier price counts. They are rescaled so their median equals the like-for-like index.
- **Fallback**: 24 brand-categories the model doesn't cover keep the pack-size index and show no confidence. 1,146 rows use the like-for-like index.
- **Tiers** follow the workbook's cutoffs: Good 0.80× and under, Better in between, Best 1.25× and up.
- These are list prices from distributor and retail listings, not net prices.

### Price position

Every priced brand gets a label, shown on its brand page (badge, plus a Price line in the header and a "Price position" line listing each category's index), in the Brands table, on company and category pages, and on the category ladder.

- A brand's **multiple** is the price-weighted geometric mean of its like-for-like category indices.
- **Premium leader**: 1.4× or more with Medium or High confidence, and two thirds or more of its prices in Best.
- **Premium**: 1.25× and up. **At market**: 0.80× to 1.25×. **Discount**: 0.80× and under.
- **Deep discount**: 0.70× and under with Medium or High confidence, and two thirds or more of its prices in Good.
- With only Low confidence a brand gets the plain label, marked thin, and never Premium leader or Deep discount.
- **★ Category price leader**: the highest multiple with Medium or High confidence in a category, when it is 1.4× or more.
- On v28, among brands with Medium or High confidence: 17 premium leaders, 26 premium, 157 at market, 31 discount, 27 deep discount. Leaders & laggards defaults to these clear calls.

### Pricing strategy

- **Tiers**: Good is 0.80× like-for-like or under, Better is between, Best is 1.25× and up. A brand's tier is its median index. Each brand-category row also counts its individual prices per tier, so a single brand that ladders on its own shows up.
- **Upper quartile**: the 75th percentile index among the category's brands with 2+ prices (needs 4 such brands).
- **Price lever**: in each category where the company sits below the upper quartile on 2+ prices, close half the gap, capped at 5%, on the company's share of priced items in that category, times revenue. It is a list-price estimate before any volume loss, not a forecast. Share of priced items stands in for revenue by category.
- **What pricing teaches** is computed by the importer from brand-category pairs with 3+ prices (`learn` in `data/pricing`). On v28 with the like-for-like index:
  - Family-owned brands sit at a median 0.95× (14% Best) against 1.01× for corporate brands (21% Best).
  - PE-owned brands sit at 0.96× (24% Best, 33 brands).
  - Price shows no link to reach: brands on 10+ pro distributors sit at 1.00× and on 0-1 at 0.98×.
  - The same brand prices 7% higher in pro channels than retail at the median.
  - 51 of 97 owner-category pairs with 2+ priced brands span 2+ tiers (ITW in cleaners: LPS and Chemtronics at Best, Permatex and Black Magic at Good).
- Growth plans and roll-up plans get the pricing facts and have a Pricing section.

Prices and reviews do not feed the DNA test yet; coverage is too thin (258 priced brands, 93 with reviews).

## Reach and headroom

- **Right to win** at a door: the share of the company's SKUs whose category that door stocks, meaning it carries 2 or more brands in the category.
- **Door size**: the square root of the door's brand count against the median door, capped between 0.5× and 2×.
- **Door weight**: right to win × door size.
- **Doors**: the scraped distributors, in the end markets the company already sells to, where right to win is at least 10%, plus every door that already carries it.
- **Reach**: weighted doors carried ÷ weighted doors.
- **Revenue per full door**: revenue ÷ weighted doors carried.
- **Value of a missing door**: revenue per full door × its weight × its win rate. The win rate is the demonstrated cross-sell rate below, or a flat capture rate if you pick one.
- **Proven doors**: doors where one of the company's direct competitors already sells. They carry higher win rates.
- **Headroom**: the sum over missing doors. Values need revenue and at least 3 doors; companies on fewer show "thin".
- **New-market doors**: distributors in end markets the company doesn't sell to yet, where 2 or more of its direct rivals already do. They show as upside, not counted in headroom.
- **Roll-up cross-sell** uses the same door weights and win rates.

**Demonstrated cross-sell rates.** Dollar values default to rates measured from the data instead of a flat capture rate:
- Across every owner with 2 or more brands, the app takes the sister brands' distributors that stock a brand's category and measures the share that also carry that brand.
- The rate is split by distributor type: is it a native channel for the category (its end market holds most of the category's shelf presence)? Do the brand's direct rivals already sell there?
- It is also split by portfolio size: focused (up to 6 brands) or sprawling.
- In v16 the overall rate is 23%. A native channel where rivals already sell runs about 30% for focused owners and 23% for sprawling ones; an off-channel distributor with no rivals runs 6–14%.
- Each missing or cross-sell door is valued at its row's rate. The rates are recomputed in the app from each import.
- A flat 10/25/50/100% option is still in the capture menu.

Rates under 50 observations fall back to the broader row.

Every company page has a "Distribution headroom" panel with the missing doors, the rivals already there, and new end markets. The screen's last column is reach.

## Category market studies

From v29 the workbook has a Categories tab and one tab per category (59). `import/build_import.py` reads them:

- **Categories tab**: per category, the seven 1-5 scores, the weights (header row), US TAM point, low and high, pro TAM, CAGR, TAM confidence, owners, private and PE share, median $/oz and SKUs. These ride on `data/cats` (`study`, keyed by category index, plus `crit` for the criteria and weights), with the top three researched end markets added.
- **Category tabs**: the ten sections are parsed by their numbered headings and sub-headings into one document per category in the `study` collection (doc id = category index, about 11 KB each), loaded when a category page opens.
- The attractiveness score in the app is the weighted mean of the seven scores using the viewer's weights; with the workbook's weights (all 1 in v29) it matches the tab's "Attractiveness (weighted)".
- On v29 the most attractive are Lab & cleanroom chemicals (4.6), Firestop sealants (4.1), then wire-pulling lubricants, spill control, pest/turf, boiler and glycol treatments (3.7). The least are ice melt (2.3) and plumber's putty (2.4).

## End markets

From v30 the workbook has an End Markets tab and one "EM-" tab per end market (14). The importer stores the summary rows and the category × end market matrix in `data/ems`, and parses each nine-section profile into the `emstudy` collection (doc id = end market index, 12-22 KB each), loaded when an end-market page opens. Implied spend = Σ category US TAM × research share of that category sold into the end market; Aviation, Electronics & Lab and Woodworking have no figure because the category research files them under "Other". On v30 the largest are Construction & Contractor ($20.1B), Facilities & Jan-San ($15.4B) and Industrial MRO ($13.3B).

## Product, chemistry and secular screen (v31)

- `product/main` holds the Product Category tab: the per-format bill of materials (section A), format mix by category (B), chemistry and cost structure (C), raw-material families (D) and the synergy calculator's inputs (E). It is about 220 KB and loads when the Product page opens.
- Each category study gains section 11: key chemistries, raw materials (role, share of RM cost, suppliers, price driver, commodity or specialty), cost structure (% of sales), shared inputs, regulation and the bill of materials of each package format it uses. It shows on the category page as "Chemistry, raw materials and cost".
- Each end-market profile gains section 10, growth and cyclicality: growth and defensiveness scores, base CAGR, recurring vs project demand, downturn sensitivity, sub-segments with share and CAGR, tailwinds, headwinds and leading indicators. The End markets list adds growth, defensiveness, CAGR and the fastest sub-segment.
- The Secular Screen tab scores each category on its end markets' growth and defensiveness (weighted by its end-market mix) and its own growth. The Categories list shows the score, rank and mix-weighted end-market CAGR and sorts by either; the category page shows only the end-market CAGR, not the composite.

## Roll-up procurement synergy

Worked out from what the selected companies actually share, not from market averages:

1. **What each member buys.** Revenue is split across categories by the member's scraped SKU mix. The Product tab's cost structure per category (raw materials, packaging and freight as % of sales) turns that into spend.
2. **Which inputs overlap.**
   - **Packaging:** split by the member's own scraped pack formats (aerosol, bottle/jug, cartridge…).
   - **Raw materials:** follow each category's raw-material list (study section 11, with its share of raw-material cost and commodity/semi/specialty type). The importer maps the 502 rows onto the Product tab's 31 raw-material families by keyword, preferring families that list the category and the material named first in a mixed row. The mapping is stored in `product/rmc`.
   - **Freight:** only shipments to distributors that 2+ members already sell to.
3. **Where pooling pays.** An input saves money only when 2+ members buy it. The smaller buyers move onto the largest buyer's contract and get the full rate on their spend; the largest buyer gets the same rate on as much of its own spend as the others add, since pooling lifts its volume at most twofold. Saving = rate × min(total, 2 × (total − largest)). Freight on shared lanes pools by the same rule.
4. **Rates** (editable on the page):
   - Packaging: the Product tab's savings rate per format.
   - Raw materials: 3% commodity, 1.5% semi-specialty, 0.5% specialty, blended by each family's mix.
   - Freight: 3%.

So a roll-up dominated by one large buyer saves little (Zep + Kano + Nu-Calgon: $2.9M, 0.3% of revenue), while balanced members with overlapping inputs save more (Kano + Nu-Calgon + B'laster: $1.3M, 1.1%). Spend is estimated from revenue and typical cost structures, not the companies' purchasing data.

## Channels

From v20 the market map gives every distributor a channel type: Pro, Mixed pro-DIY, Retail store, or DIY / enthusiast online.

- **Brand page**: an "SKUs by channel" panel. For each channel type it shows distributors, scraped SKUs and their share, top package formats, common pack sizes, median $/oz from captured prices, and where the brand is sold. Below that is the market map's big-box and mass-retail screen (tier, retailer hits, consumer signals) where it exists.
- **Channel mix** uses the market map's bands: Pro-only under 5% retail, Pro-led 5–19%, Mixed 20–49%, Retail-led 50%+.
  - Companies use the researched channel classification from the Targets tab (v24+) where it exists; brands use "Retail share used" from the Brands tab (owner research or scrape). Both fall back to the scraped share of SKUs in retail stores and DIY sites.
  - Company pages show the researched split: retail share of revenue, pro-channel revenue estimate, confidence, basis, and key retail customers.
  - The screen has a channel filter. Categories show the PE share weighted by pro sales and the average retail share of core brands.
- **Headroom and cross-sell by channel** (v24+): where a company has a pro-channel revenue estimate (or a researched retail share), pro and mixed distributors are valued at pro revenue per pro door, and retail stores and DIY sites at the remaining revenue per retail door.
- **Brands list**: a channel bar and label per brand, and a channel-mix filter.
- **Company page**: the SKU split by channel type.

The DNA test's "sold through pro distributors" check still uses the app's own broadline, specialty and retail split.

## Brand owners

- **Owner verified**: the market map's verified Companies tab (1,089 brands in v10).
- **Owner unverified**: the workbook's prior (78).
- **Claude's guess**: for brands the workbook has no owner for, Claude's best guess from its knowledge and the maker name on distributor listings, with High, Medium or Low confidence.
- **Workbook triage guess**: where Claude had no guess, the owner named by the workbook's triage pass (v9 onward). Every brand page also shows its triage bucket and, when it differs, the triage owner guess. Stored in `import/brand_owners.json`. A guess that names a company already profiled links to it and shows under "Likely also owns" on that company. It does not count toward that company's DNA or SKU mix.
- **Owner not identified**: no clue at all.

## The DNA test

**Scoring is frozen for now (Oct 2026):** while the market map is still being widened and its quality improved, the checks and their data sources stay as they are. New data (such as the v24 researched channel splits) is shown alongside the score, not fed into it. Revisit when the data settles.

Seven checks, each Pass (full points), Partly (half) or Fail:

| Check | Points | Where it comes from |
|---|---|---|
| Fits in your hand | 15 | Share of scraped SKUs that are aerosols, tubes, cartridges, wipes, markers, kits, or bottles, cans and powders up to 1 gal, 4 L or 10 lb |
| Sold through pro distributors | 15 | Pro distributors carrying it (4+) and share of SKUs in pro rather than retail channels (70%+) |
| Pros ask for it by name | 15 | Claude's judgment |
| ITW Pro Brands would want it | 15 | Claude's judgment |
| Pro brands are most of revenue | 20 | Claude's judgment (fail means out of scope) |
| Used up and re-bought | 10 | Share of SKUs that are consumables, not tools, dispensers or equipment |
| Owns its brand | 10 | Business model: not private label, contract fill or a distributor house brand |

Claude's judgments for all owners are in `import/judgments.json`. They come from Claude's knowledge plus the workbook facts, without new web research. On a company page you can click any check to change it, which saves as "Your call", or ask Claude to re-check the three judgment calls. Overrides live in the `dna` collection (one document per company), so re-importing the workbook never erases them. Precedence: your call, then a re-check from the page, then the imported judgment, then the data rule.

**DNA workbook.** `Probrands_DNA_v31.xlsx` holds the DNA test in Excel, ready to paste into the market map. It has three sheets:
- DNA by owner: every check's result, points, source and reason, keyed by the Master tab's Owner ID.
- DNA by brand: each brand's owner score plus the three data checks scored for the brand alone, keyed by the Brands tab's Brand ID.
- How it's scored.

To rebuild it after an import:

```
NODE_PATH=$(npm root -g) node probrands/import/dump_dna.js dna.json
python3 probrands/import/export_dna.py Professional_Brands_Market_Map_v31.xlsx dna.json probrands/Probrands_DNA_v31.xlsx
```

The dump scores with the app's own code, so the numbers match the screen. Overrides saved in the app are not included.

Distributor channels (broadline MRO, trade specialty, retail-leaning) and the end-market groups are set in `import/build_import.py` (`RETAIL`, `BROADLINE`, `MARKET`).

## Data

```
python3 probrands/import/build_import.py Professional_Brands_Market_Map_v31.xlsx
```

This writes `import/out/data/*.json`, one file per document in the app's `data` collection: `co-N` (company summaries), `dt-N` (details), `br-N` (every brand), `deals`, `dists` and `index`. Every SKU goes in `import/out/sku/p-N.json`, the `sku` collection, which loads one document at a time when a brand page opens. Lists are split across documents because the database stores at most 256 KB per document; nothing is dropped. Load them with the ArtifactData tool (a `set` of each file). It also writes `import/out/judge/batch-N.json`, the facts behind the judgment calls, for scoring new owners.

Owners come from the Master tab. Clean-up rules:
- Owners listed twice are merged (17 merges in v16, including DuPont, S.C. Johnson, Kimberly-Clark, Control Solutions, Desco, FPC, FBC Chemical and Protexall).
- "Unknown" placeholder rows (including "Unknown (…)" variants) get no profile; their brands stay unowned.
- Brands that only carry an unverified "Likely owner (PRIOR)" join a matching Master owner, or become an owner marked unverified.

The database still holds the earlier version's `companies`, `details` and `meta` collections. The app no longer reads them, so they can be cleared.

Columns read when the workbook fills them (empty in v9): Est. brand rev, Pro brand rev, the Master % by trade and % by package format splits, and List price. The app shows each one as soon as it has a value. Mfr part # is shown in the product table.

Loaded now: v31 (3 Oct 2026), with 1,101 owners (all judged), all 4,288 brands, 15,728 SKUs, 2,627 usable prices, 529 deals and 201 distributors, 59 category market studies, 14 end-market profiles, the Product Category tab and the Secular Screen. Brands: 1,609 verified owner, 79 workbook prior, 418 not identified, the rest Claude or workbook-triage guesses. Of the 183 brands newly verified in v27 that carried a Claude guess, the guess matched for 85% of High-confidence, 77% of Medium and 51% of Low.
