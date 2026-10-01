# Probrands

A deal screen for US professional brands: branded chemical products that tradespeople and plant workers hold in their hand (WD-40, CRC, Oatey, Nu-Calgon, Kano and the like), mapped to the companies that own them. Built from the Professional Brands Market Map workbook. It started as a copy of the Home Base profiler but is now its own app, built around one question: which PE- and family-owned companies fit the pro brands playbook?

Live app: https://claude.ai/artifact/UkLSFqKaS38kQqd4JmvNhk (private to the owner until shared)

## Pages

- **The screen**: every owner ranked by its DNA score. Green (70+) at the top, amber (45 to 69) in the middle, red (under 45) at the bottom. Companies that fail "pro brands are most of revenue" are out of scope and hidden behind a toggle. Filter by product family, end market or search.
- **Company**: the DNA test check by check, SKU mix (package format, end market, brand, distributor), the brand list with who carries each one, deals, the workbook's write-up and sources.
- **Brands**: all 3,094 brands, searchable by brand, owner, product, maker or distributor, and filterable by the workbook's triage bucket (for example Actionable candidate), owner status, owner type, product family, format, end market and distributor. Each brand has a page with its owner, where it's sold (with the broadline, specialty and retail split), package formats and every scraped SKU with links to the distributor listing.
- **Competitors**: every brand page lists up to 10 rival brands with each one's owner and ownership type (PE, Family, ESOP, Private, Corporate), and the Brands table shows the top 3. Rivals are matched in `import/build_import.py` by how alike their products look on distributor shelves (product categories, hero product and SKU names), ranked higher when they share distributors. Brands with the same owner are left out. Each company page rolls this up into "Who it competes with": the owners of rival brands, ranked by how many of the company's brands they meet.
- **Consolidators**: who is buying pro brands, ranked by add-on deals in the ledger and then by brands owned; PE sponsors and their platforms; add-ons by year; the deal log.
- **The web**: each consolidator is a hub with its brands on spokes. Brands that came in through an acquisition are yellow, and dashed lines tie PE sponsors to their platforms. Click a hub to list its brands below.
- **SKU mix**: format, end market, product family, distributors and brands across everything in the filter, plus the broadline, specialty and retail channel split.

The ownership filter in the left rail (PE, Family, ESOP, Private, Corporate) applies to every page. PE + Family is the default.

## Look

Rugged shop-floor design: gunmetal and steel, safety yellow used sparingly, a hazard stripe, condensed signage-style headings, and a left control rail. DNA bands are green, amber and red. (A navy and orange version following the Workmark brand board was tried and set aside; it is in commit 2ccfcf2.)

## Brand owners

- **Owner verified**: the market map's verified Companies tab (919 brands in v9).
- **Owner unverified**: the workbook's prior (78).
- **Claude's guess**: for brands the workbook has no owner for, Claude's best guess from its knowledge and the maker name on distributor listings, with High, Medium or Low confidence.
- **Workbook triage guess**: where Claude had no guess, the owner named by the workbook's triage pass (v9 onward). Every brand page also shows its triage bucket and, when it differs, the triage owner guess. Stored in `import/brand_owners.json`. A guess that names a company already profiled links to it and shows under "Likely also owns" on that company. It does not count toward that company's DNA or SKU mix.
- **Owner not identified**: no clue at all.

## The DNA test

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

**DNA workbook.** `Probrands_DNA_v9.xlsx` holds the DNA test in Excel, ready to paste into the market map. It has three sheets:
- DNA by owner: every check's result, points, source and reason, keyed by the Master tab's Owner ID.
- DNA by brand: each brand's owner score plus the three data checks scored for the brand alone, keyed by the Brands tab's Brand ID.
- How it's scored.

To rebuild it after an import:

```
NODE_PATH=$(npm root -g) node probrands/import/dump_dna.js dna.json
python3 probrands/import/export_dna.py Professional_Brands_Market_Map_v9.xlsx dna.json probrands/Probrands_DNA_v9.xlsx
```

The dump scores with the app's own code, so the numbers match the screen. Overrides saved in the app are not included.

Distributor channels (broadline MRO, trade specialty, retail-leaning) and the end-market groups are set in `import/build_import.py` (`RETAIL`, `BROADLINE`, `MARKET`).

## Data

```
python3 probrands/import/build_import.py Professional_Brands_Market_Map_v9.xlsx
```

This writes `import/out/data/*.json`, one file per document in the app's `data` collection: `co-N` (company summaries), `dt-N` (details), `br-N` (every brand), `deals`, `dists` and `index`. Every SKU goes in `import/out/sku/p-N.json`, the `sku` collection, which loads one document at a time when a brand page opens. Lists are split across documents because the database stores at most 256 KB per document; nothing is dropped. Load them with the ArtifactData tool (a `set` of each file). It also writes `import/out/judge/batch-N.json`, the facts behind the judgment calls, for scoring new owners.

Owners come from the Master tab. Clean-up rules:
- Owners listed twice are merged (11 merges in v9, including DuPont, S.C. Johnson, Kimberly-Clark, Control Solutions, Desco and FPC).
- "Unknown" placeholder rows (including "Unknown (…)" variants) get no profile; their brands stay unowned.
- Brands that only carry an unverified "Likely owner (PRIOR)" join a matching Master owner, or become an owner marked unverified.

The database still holds the earlier version's `companies`, `details` and `meta` collections. The app no longer reads them, so they can be cleared.

Columns read when the workbook fills them (empty in v9): Est. brand rev, Pro brand rev, EBITDA reported, Platform EBITDA, EBITDA margin, the Master % by trade and % by package format splits, and List price. The app shows each one as soon as it has a value. Mfr part # is shown in the product table.

Loaded now: v9 (1 Oct 2026), with 630 owners (152 new, all judged), all 3,094 brands, 10,511 SKUs and 382 deals. Brands: 919 verified owner, 78 workbook prior, 1,689 Claude guesses, 61 workbook triage guesses, 347 not identified. The v9 Targets tab is not read separately: its section A owners are already on the screen, and its section B candidates are the brands in the Actionable candidate triage bucket.
