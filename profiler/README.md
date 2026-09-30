# Profiler

A chemicals company repository for deal work, organised by sector (water treatment, lubricants, personal care and professional beauty, food ingredients, coatings and more; custom sectors can be added). Each company has business lines in one or more sectors and a primary sector. "Build out this sector" on the Sectors page has Claude add a sector's leading companies as starter profiles.

A company repository for deal work. Each company gets a profile with revenue, EBITDA, margin, pie charts by end market, segment and product, and tabs for customers, products, competitors, acquisitions, potential buyers and add-on ideas.

Live app: https://claude.ai/artifact/KCB1rWzeMTqDnqVXoQz3eG (private to the owner until shared)

## How it works

- **Profiles are saved** in the artifact's shared database (`companies/<slug>`), so they persist across sessions.
- **New company**: add a name. The profile starts empty. Click *Run deep dive* and Claude drafts the whole profile, then it saves.
- **Edit anything**: click a number or text, type, press Enter. The change saves, and that field is marked *Your edit*.
- **Source of truth**: edited fields and anything added with *Add a fact* are passed to the next run as ground truth. *Re-run with my facts* re-derives the rest of the profile around them without overwriting them.
- **Targets**: every acquisition, add-on idea and named buyer across all profiles, searchable by target. For a profiled target, it ranks the best-fit platforms by shared end-market exposure.
- **Precedents**: every deal from every profile, plus sponsor entries with a known EV, with EV / revenue.
- **End markets**: rank companies by exposure to an end market, as a share or in dollars.

In-page deep dives run on Claude's own knowledge (no web browsing). For a web-researched dive, ask Claude in chat to research a company into Profiler, and it writes the profile to the same database.

## Profile builder

Profiles are built step by step, each step starting from everything the profile already knows:

1. **Overview**: what the company is, who owns it, how it makes money.
2. **M&A history**: deals in and out, and what each added. This defines the businesses it owns.
3. **Products**: a catalog of real products (category, line or brand, named products, what it does, applications, end markets, made or resold, share of revenue).
4. **Business lines & sectors**.
5. **End-market mix**: built from where each product category goes, then rolled up by category revenue share.
6. **Segment mix**, **Revenue & EBITDA**, **Top customers**, **Top competitors**, **Potential buyers**, **Add-on ideas**.

Each step has its own detailed playbook (goal, what to cover, method, depth, checks). Enhancing a step that already has content runs a "go deeper" pass: for Products, one level further into categories, lines and named products. The builder panel on each profile shows every step's state (not built, from import, pass N, out of date). "Build next" runs the next unbuilt step; "Build all" runs them in order.

## Web research

With the free Parallel Search connector connected in claude.ai (Settings → Connectors), a build first runs the web research itself: about five searches in parallel (identity and ownership, products and brands, M&A, size/customers/competitors) plus a read of the company's own pages. The results are saved on the profile as a research file (`dossier`, reused for 14 days; "Refresh research" re-runs it). Claude then writes the steps from that file in waves: overview, M&A and products first, then the other eight steps in two parallel calls. Each value cites its source ([S1]…), and cited sources go on the Sources tab. Without the connector, steps run on Claude's own knowledge. It all runs on your Claude plan.

## How profiles learn

- Every field carries a confidence: **Verified** (you typed it or clicked its badge), **High**, **Medium** or **Low**, with the basis. Profile strength sums this up.
- Enhance sends Claude everything the profile knows, strongest first, and tells it to derive weaker items from stronger ones. It returns a confidence and basis per field.
- A weaker answer never overwrites a stronger one; it is held as a suggestion.
- Sections depend on each other (deals inform financials, mix, customers, competitors and buyers; end markets inform financials, competitors and buyers; and so on). When a section changes, its dependents are marked out of date and "Update them" refreshes them in order.
- Enhance all runs one section at a time in dependency order, so each step builds on the last.

## Market size (TAM)

Each sector has a Market size page. Sources (research firms, associations, filings, bottom-up estimates) are listed with geography, year, value, growth and reliability. The TAM is triangulated: each source is rolled forward to the base year at its growth rate, weighted by reliability (High 3, Medium 2, Low 1), and sources more than 2.5x away from the median count a quarter as much. You can type your own TAM to override it. Found TAM sums the sector revenue of companies in Profiler, giving coverage and the gap. "Names to add" lists companies that profiles mention as competitors, buyers or add-on ideas but that have no profile yet, plus Claude suggestions sized to the gap. Stored in `tam/<sector>`.

## Data

The repository holds the full US Water Treatment Chemicals index (v8 workbook, built 26 Sep 2026): 558 ultimate owners as profiles, 804 add-on deals on their Acquisitions tabs, 148 outside and sponsor deals, and 281 add-on, excluded and duplicate entities for Targets. The 10 September 27 deep dives (P05A/P05B) take precedence over the workbook rows for those companies.

Each company is two database documents: `companies/<id>` (summary used by lists and screens) and `details/<id>` (write-up, evidence, sites, customers, competitors, run history), loaded when a profile opens. `meta/deals` and `meta/entities` hold the deal log and non-owner entities.

To rebuild the import from a new workbook version: `python3 profiler/import/build_import.py <workbook.xlsx>`, then load `profiler/import/out/` into the artifact database.

## Files

- `index.html`: the app (single file, published as a claude.ai artifact).
- `import/build_import.py`: converts the workbook into database documents.
- `seed/*.json`: the 10 profiles imported from the WTC deep-dive batches P05A and P05B. Customers, competitors and buyers on these were added from the deep-dive text.
