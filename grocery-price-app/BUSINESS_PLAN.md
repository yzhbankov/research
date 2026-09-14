# CartIQ — Business Plan

**Working consumer brand:** CartIQ
**Working B2B brand:** ShelfSignal
**Category:** Crowdsourced grocery price intelligence + shopping-list optimisation + product-health scoring
**Author:** Yevhenii Zhbankov
**Date:** September 2026
**Status:** Pre-seed concept plan — v1.0

---

## 0. How to read this document

Sections 1–3 are the thesis and the honest critique of the idea as originally framed.
Sections 4–7 are the proposed product and the market/competitive analysis.
Sections 8–13 are the business: model, unit economics, go-to-market, finance, risk.
Section 14 is the verdict, with explicit kill criteria.

Two assumptions are load-bearing and flagged wherever they appear:

- **A1 — Launch geography.** This plan assumes a Central/Eastern European launch (Warsaw or Kyiv metro) because of founder location, engineering cost base, chain density and price sensitivity. Section 7.4 gives the selection framework so the geography can be swapped without rewriting the plan.
- **A2 — Solo-founder start.** The plan assumes a technical founder building the MVP, with the first hires in month 6–9. Financials scale from that.

---

## 1. Executive summary

### The idea in one sentence

A mobile app where shoppers capture grocery prices (primarily by photographing their **receipts**, secondarily shelf labels), the system extracts item-level prices with store and timestamp, and every user can then ask: *"where is my shopping list cheapest today — and how healthy is what's in it?"*

### The core insight

The interesting business is not the price-comparison app. Consumer price comparison in grocery is a **graveyard** — mySupermarket burned $23.4M and closed in 2020; Basket raised $19.6M and never became a household name. The reason is structural: consumers love the utility, but the utility is used weekly, not daily, and it is nearly impossible to monetise the consumer directly at scale.

The asset that *is* valuable is the by-product: a **verified, geo-stamped, item-level, time-series shelf-price panel**. Today that data is sold by Premise, Field Agent and Trax at **$2–$12 per audited task** to CPG brands and retailers, because getting a human into a store to check a shelf is genuinely expensive. A consumer app that produces the same observations as exhaust — at a marginal cost near zero — can undercut that market by two orders of magnitude while giving the data away free to the shoppers who created it.

**CartIQ is a consumer app. ShelfSignal is the business.**

### The second insight: the price × health cross is empty

- Yuka has 80M+ users and ~$12M/yr in subscriptions telling you *how healthy* a product is. It says nothing about price.
- Trolley, Basket, Flipp and Blix tell you *where it is cheap*. They say nothing about health.
- Listonic has your *list*. It optimises neither.

Nobody answers the question every household actually asks: **"Build me the cheapest basket near me that still meets my health and diet constraints."** That join — list × price × nutrition × store — is unoccupied whitespace, and it is defensible because it requires all three datasets at once.

### The third insight: chain-level price zoning collapses the cold-start problem

The standard objection to crowdsourced pricing is coverage: a metro has ~400 grocery stores × ~8,000 relevant SKUs = 3.2M price points to keep fresh. That is impossible to crowdsource.

But supermarket chains **do not price per store** — they price per chain per regional zone. A metro of 400 stores collapses to roughly **12–18 chain × zone price groups**. Restricting the catalogue to a **core basket of ~1,500 SKUs that carries ~70% of household spend** gives:

> 15 price groups × 1,500 SKUs = **~22,500 price points** to refresh weekly
> at ~25 items per receipt = **~900 receipts/week**
> at ~3 receipts/user/week = **~300 genuinely active contributors per metro**

300 people, not 30,000. That is a tractable cold start, and it is the single most important number in this plan. Per-store deltas are then layered on only where they exist (hard discounters, independents, clearance).

### The ask

**€900,000 pre-seed** for 24 months of runway to reach ~700k MAU across one country plus one bridgehead metro abroad, ~€2.8M ARR run-rate and operational breakeven in month 30–34.

### Headline financials (base case)

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Markets | 1 metro | 5 metros | National + 1 foreign metro |
| Avg MAU | 30,000 | 200,000 | 700,000 |
| Revenue | €87k | €630k | €2.81M |
| Costs | €285k | €960k | €2.58M |
| EBITDA | −€198k | −€330k | **+€230k** |

---

## 2. The problem

### For shoppers

1. **Price dispersion is large and invisible.** The same branded SKU routinely varies 20–45% between chains in the same city. Shoppers cannot see this because no chain publishes a comparable, item-level, current price list for the store they are standing in.
2. **Price pressure is at a decade high.** 74.1% of consumers report noticing rising retail prices; ~70% say they are extremely or very concerned about grocery prices; 41% now shop discounters more than a year ago and 38% shop traditional supermarkets less. The median shopper abandons a loyal brand after a **16%** price increase.
3. **Leaflet apps solve the wrong problem.** Blix, Flipp and marktguru show you what is *on promotion*. They cannot tell you what your *actual list* costs at each store, because a promotion is not a price list.
4. **Health and price are decided separately.** Yuka tells you a product scores 28/100 but not that the 82/100 alternative is €0.30 cheaper at the store two streets away. Households trade health against budget every week with no tool that shows the trade-off.
5. **The list lives somewhere else.** People keep lists in Notes, WhatsApp, Listonic, or on paper. None of those know what anything costs.

### For brands and retailers

6. **Shelf-price truth is expensive.** CPG brands pay $2–$12 per crowdsourced store check to learn what their own product actually sells for on a given shelf, and lose ~4% of sales on average to in-store execution failures they cannot see. Scanner-panel data (NielsenIQ, Circana) is expensive, lagging, and sampled.
7. **Off-site retail media is the fastest-growing ad channel** — $17.05B in the US in 2026, +29.5% YoY — and it is starved of purchase-verified, geo-precise inventory outside Amazon and Walmart, which take ~89% of incremental spend.

---

## 3. Honest critique of the idea as originally framed

The original concept was: *users photograph a product with its price tag; the app parses and stores it with the store; other users query prices and optimise a list; integrate something Yuka-like.*

Every element is right in direction. Four elements are wrong in mechanics, and they are the exact reasons prior attempts failed.

### 3.1 Shelf photos are the wrong primary capture mechanism

| | Shelf-label photo | Receipt photo |
|---|---|---|
| Price points per user action | ~1 | **20–40** |
| User's own reason to do it | Altruism | Budget tracking, warranty, expenses, tax |
| Data reliability | Shelf tag ≠ price paid (promos, loyalty) | **Price actually paid, verified** |
| Store/time certainty | GPS-inferred, spoofable | Printed on the receipt |
| Effort | Per item, in-store, while shopping | Once, at the car or at home |

Fetch Rewards processes **11M receipts per day** with 20M MAU precisely because receipts are the highest-yield, lowest-friction capture unit in existence, and 35% of Fetch's revenue comes from licensing that data.

**Correction:** receipt-first. Shelf photos become a *secondary* mode for pre-purchase checks and for items the receipts under-cover. Digital receipts (email forwarding, loyalty-account linking) become a third, zero-effort channel that gets disproportionate engineering attention.

### 3.2 "Users will contribute out of goodwill" is not a plan

Basket's model relied on volunteer "commerce moderators" with prize incentives. It plateaued. Crowdsourced supply needs a **selfish** reason to contribute, and price altruism isn't one.

**Correction:** the contribution loop must be the same action as a feature the user wants anyway — *scan your receipt to see your monthly grocery spend, your personal inflation rate, and whether you overpaid versus the cheapest nearby store*. The price panel is a by-product of a spend tracker. The user gets a personal benefit on every single scan, before any network effect exists.

### 3.3 Coverage, not accuracy, is what kills these products

Users forgive a stale price. They do not forgive "we have no data for 6 of your 14 items." A list optimiser that can only price 60% of a basket gives a *wrong* answer about which store is cheapest, which destroys trust permanently.

**Correction:** three hard rules —
- Never rank stores on partial baskets without saying so; show **coverage %** and a confidence band on every comparison.
- Ship the **core-basket catalogue (~1,500 SKUs)** first and be excellent there rather than mediocre everywhere.
- Use chain×zone price grouping (Section 1) so one observation propagates to many stores, with automatic de-grouping when observations disagree.

### 3.4 Cloning Yuka would be a strategic error

Yuka's entire moat is that it takes **no brand money, no ads, no affiliate revenue** — that refusal is the product. Retail media is our largest revenue line. Building "Yuka but we also sell ads" would forfeit Yuka's credibility without gaining its scale.

**Correction:** do not build a health score. **Consume** one. Open Food Facts publishes 3M+ products under ODbL with no API key and no rate limits, and computes Nutri-Score. Use it, attribute it properly, contribute back, and add the layer nobody else has: **"healthier and cheaper" substitution** — for each item in the list, the alternative that improves the health score without increasing basket cost. That is a price-app feature, not a health-app clone, and it is defensible.

And enforce a bright line: **money never changes a ranking.** Sponsored content appears only as separately labelled placements outside the price/health ordering, with a published policy. Splitting the B2B business under a distinct brand (ShelfSignal) keeps the consumer app's trust intact.

---

## 4. The product

### 4.1 Core loop

```
 SCAN                   →  UNDERSTAND              →  DECIDE                 →  CONTRIBUTE
 Photograph receipt        "You spent €412 this      "Your list of 18 items    Your scan refreshes
 (or forward the           month. Your personal      is cheapest at Lidl        the panel for
 digital one)              inflation: +6.2%.         (€47.10) vs Auchan         everyone in your
                           You overpaid €11.40       (€54.80). 3 items          zone — anonymously.
                           vs the cheapest           are healthier for
                           nearby option."           the same money."
```

Each arrow is a feature with standalone value. The user gets paid in insight at every step; the network gets fed as a side effect.

### 4.2 Feature set by release

**MVP (months 0–4) — "Spend tracker that happens to build a price panel"**
- Receipt capture: camera → VLM-based extraction (merchant, store address, datetime, line items, qty, unit price, total, discounts).
- Manual correction UI (2-tap fix) — every correction is a training label.
- Personal spend dashboard: monthly spend, category split, **personal inflation index**, price history per item you buy.
- Shopping list (fast, offline-capable, shareable with household).
- Store price lookup for the core basket, with freshness indicator.
- Open Food Facts integration: barcode → Nutri-Score, NOVA, additives, allergens.

**V1 (months 5–10) — "Cheapest basket"**
- **Basket optimiser**: full list priced across nearby stores; single-store optimum, two-store split, and "cheapest with ≥X% coverage".
- Coverage and confidence transparency on every result.
- Shelf-label capture mode + barcode scan for in-store checks.
- Substitution engine: cheaper equivalent, healthier equivalent, **cheaper *and* healthier**.
- Household diet profiles (allergens, no palm oil, low sugar, vegan, halal/kosher) as hard constraints on the optimiser.
- Digital receipt ingestion by email forwarding.
- Price-drop watchlist and alerts.

**V2 (months 11–18) — "Household operating system for food"**
- Meal plan → auto-generated list → priced basket (the highest-leverage adjacent feature; it converts a weekly tool into a daily one).
- Pantry/inventory with expiry tracking from receipt dates → waste reduction (a second, non-price savings claim).
- Unit-price normalisation everywhere (€/kg, €/L) including shrinkflation detection — "this pack lost 8% of its contents in March".
- Loyalty-card price awareness (member price vs shelf price).
- Family/shared lists with live collaboration; assign items to whoever passes which store.
- Public "basket index": a monthly, city-level inflation index published from the panel. **This is the PR engine** — journalists will use it, and every citation is free acquisition.

**V3 (months 19–30) — platform**
- Web + widget + wearable quick-add; voice add.
- Open API for local price transparency (deliberately, to become the reference source).
- White-label panel for consumer-protection NGOs and public bodies.

### 4.3 Ideas worth adding that were not in the original brief

These are the features that move this from "useful utility" to "business":

1. **Personal inflation rate.** Nobody shows you *your* CPI on *your* basket. It is emotionally sticky, screenshot-shareable, and needs only your own receipts — it works at zero network density. Best possible day-1 retention feature.
2. **"You overpaid €X" post-shop verdict.** Delivered after every scan. Turns a passive tracker into a habit with a reward signal.
3. **Cheaper-AND-healthier substitution.** The unique cross. This is the feature that gets written about.
4. **Shrinkflation detector.** Unit-price time series over pack size — impossible without a longitudinal panel, high media value, high trust value.
5. **Two-store split optimisation with a distance/time cost.** "Splitting saves €9.40 but costs 20 minutes — worth it?" Real households think this way; no competitor models it.
6. **Regional basket index as a public good.** Free PR, regulatory goodwill, and a moat of citation.
7. **Receipt-verified warranty/return vault** for non-grocery lines on the same receipt — a second reason to scan everything.
8. **Household mode.** Multiple contributors per household multiply receipts per account without extra acquisition cost.
9. **Confidence-scored prices with explicit decay.** Show "observed 2 days ago, 4 confirmations". Honesty about staleness is a feature, not a weakness — it is what stops trust collapse.

---

## 5. Data strategy — the actual core competency

### 5.1 Four ingestion channels, in order of value per unit of effort

| Channel | Yield | Cost | Trust | Priority |
|---|---|---|---|---|
| Digital receipt (email/loyalty link) | 25–40 items | ~€0.001 | Highest | 1 |
| Paper receipt photo | 20–40 items | ~€0.004 VLM | Highest | 1 |
| Retailer public web/app prices (online catalogues) | Thousands | Engineering + legal | High | 2 |
| Shelf-label / barcode photo | 1 item | ~€0.003 | Medium (tag ≠ paid) | 3 |

### 5.2 The chain × zone price model

Store entities are grouped into **price groups** (chain + regional zone + format, e.g. *Biedronka / Warsaw / standard*). An observation writes to the group, not the store. A group de-splits automatically when observations for the same SKU/day diverge beyond a threshold — so the model self-corrects toward per-store where per-store pricing genuinely exists (discounters, franchised independents, clearance).

**Result:** required observations per metro drop by roughly **25–40×** versus naive per-store modelling. This is what makes 300 active contributors per metro sufficient.

### 5.3 Price confidence

Every quoted price carries `(value, observed_at, n_confirmations, group_variance)` and is rendered as a confidence band that decays with age. Baskets priced below a coverage threshold are labelled, never silently ranked. Anti-gaming: outlier rejection, per-contributor reputation, receipt-authenticity checks (merchant fingerprint, total-vs-lines reconciliation, duplicate hashing).

### 5.4 Catalogue

Product identity is the hard part: `barcode → GTIN` where available, otherwise fuzzy matching of receipt line text (abbreviated, truncated, chain-specific) to a canonical product via learned embeddings + human-in-the-loop for the top 1,500 SKUs. The core-basket catalogue is curated manually once per market — a ~2-week task per country, and a real barrier for a copycat who has not done it.

### 5.5 Legal posture on retailer data

Public price pages are generally low-risk to collect, but ToS breach and cease-and-desist exposure is real — **Trolley.co.uk received one**, and mySupermarket's era ended partly over data-licensing costs. Policy:
- Crowdsourced receipt data is the primary source and is **legally clean** — it is the user's own transaction record, contributed with consent.
- Public catalogue collection is secondary, rate-limited, robots-respecting, never behind a login, and instantly suspendable per-retailer.
- No retailer dependency is ever allowed to become load-bearing. If every retailer blocked us tomorrow, the panel would still work.
- Open Food Facts usage complies with ODbL: attribution, share-alike on derived database extracts, contributions pushed back upstream.

---

## 6. Competitive landscape

### 6.1 Direct and adjacent players

| Player | What it does | Data source | Money | Gap we exploit |
|---|---|---|---|---|
| **Basket** (US) | List priced across nearby stores | Crowdsourced shoppers | Ads/affiliate; $19.6M raised | Thin coverage outside dense metros; no health; no receipt loop |
| **Trolley.co.uk** (UK) | 16+ supermarket comparison | Online catalogue scraping | Affiliate | Online prices only, UK only, no in-store truth, no list optimisation depth; already C&D'd |
| **mySupermarket** (UK, †2020) | Basket comparison | Retailer feeds | Affiliate | **Dead.** $23.4M raised. Cautionary case, not a competitor |
| **Flipp / Blix / marktguru** | Digital leaflets & promos | Retailer-supplied flyers | Retail media | Promotions ≠ prices; cannot price a list; no health |
| **Yuka** | Health score by barcode | Open Food Facts + own | Subs only, ~$12M/yr, 80M+ users | **Zero price capability**, and structurally cannot add ads |
| **Open Food Facts** | Open product database | Volunteer | Non-profit | Not a consumer product; no price layer |
| **Listonic / Bring / AnyList** | Shopping lists | — | Ads, subs | List without prices; Listonic ~300k MAU sells FMCG ads |
| **Fetch / Ibotta / Checkout51** | Receipts for rewards | Receipts | Data licensing (35% of Fetch rev) + brand offers | Rewards, not comparison; no "where is it cheapest"; no health |
| **Premise / Field Agent / Trax** | Paid in-store audits | Paid gig workers | B2B, $2–12/task | Our cost structure beats theirs ~50–100× on price observations |
| **Retailer own apps** | Own prices, loyalty | First-party | Retail media | Structurally cannot compare to rivals |

### 6.2 Where the whitespace is

Plot the market on two axes — *price intelligence* and *health intelligence*:

```
  health ↑
  intel   │  Yuka (80M users)          ██ CartIQ ██
          │  Open Food Facts           (empty today)
          │
          │  Listonic, Bring           Basket, Trolley,
          │  Fetch, Ibotta             Flipp, Blix, marktguru
          └──────────────────────────────────────────────→
                                              price intel
```

**The upper-right quadrant is empty.** Not lightly contested — empty. And it is hard to enter from either side: Yuka cannot add price without building a panel and cannot fund one without ad money it has sworn off; the price players have no nutrition data model, no consumer trust position, and monetise through exactly the brand relationships that poison a health score.

### 6.3 How free is the area, really?

**Honest answer: the whitespace is real, but it is empty for reasons, not by oversight.** The reasons are (a) cold-start coverage, (b) consumer monetisation weakness, (c) retailer hostility. This plan's three structural answers — receipt-first capture, chain×zone grouping, B2B-primary monetisation — are precisely aimed at (a), (b) and (c). If those three hold, the quadrant is winnable. If any one fails, this becomes another mySupermarket. Section 14 turns that into kill criteria.

---

## 7. Market analysis

### 7.1 Market size (bottom-up, launch country ~ Poland scale, A1)

- Households: ~14.8M. Grocery spend per household: ~€3,600/yr → **~€53B** addressable grocery spend.
- **TAM** — value of price/health decision support on that spend. At a conservative 0.25% monetisable slice (retail media + data + subs): **~€130M/yr** in the launch country alone.
- **SAM** — smartphone households in metros ≥200k population, price-motivated: ~5.2M households. At €4.50 blended annual revenue per active household: **~€23M/yr**.
- **SOM (year 3)** — 700k MAU ≈ 480k households ≈ 9% of SAM → **€2.8M**, matching the base case.

Cross-check from the B2B side: the retail crowdsourcing platform market is ~$1.8B (2024) → $6.7B (2033) at 15.7% CAGR; retail intelligence ~$4.18B (2025) → ~$10.4B (2034). Capturing €1–2M of a national slice of that by year 3 is unremarkable.

### 7.2 Why now (2026)

1. Price sensitivity is at a structural peak and shoppers are actively switching stores — demand is not hypothetical.
2. **VLM receipt extraction just got cheap and good.** The single hardest engineering problem in this category — messy, multilingual, low-contrast thermal receipts — went from an OCR research project to a ~€0.004 API call in about 24 months. This is the enabling technology shift, and it opens a window before it becomes commodity table stakes.
3. Off-site retail media is growing 29.5% YoY and is desperate for inventory outside the Amazon/Walmart duopoly (89% of incremental spend).
4. Open Food Facts has crossed 3M+ products — the health layer is now free infrastructure rather than a multi-year data project.
5. EU price-transparency and food-supply-chain rules are tightening through 2026, making an independent price index politically welcome rather than threatening.

### 7.3 Customer segments

| Segment | Size signal | Why they scan | Monetises via |
|---|---|---|---|
| Budget-squeezed families | Largest; the 41% shifting to discounters | Save real money weekly | Retail media, data |
| Health-conscious households | Yuka's 80M proves the segment | Health + price together | Premium subs |
| Optimiser/quantified-self types | Small but rabid; earliest adopters | Personal inflation, dashboards | Premium subs |
| Expats & new arrivals | High in CEE metros | Don't know which chain is cheap | Retail media |
| Small HoReCa buyers | Long tail | Input-cost control | B2B lite tier |

### 7.4 Geography selection framework (use this to validate or replace A1)

Score candidate markets 1–5 on: chain concentration (fewer chains = easier coverage), price dispersion between chains, smartphone penetration, price sensitivity, weakness of incumbent leaflet app, receipt standardisation (fiscal receipt mandates make OCR far easier), and engineering cost base. **Launch in the highest-scoring single metro, not a country.** Density beats breadth — this is the lesson of Basket's US-wide thin coverage.

CEE scores well on fiscal-receipt standardisation (a genuine technical advantage: mandatory fiscal receipts are structured and consistent), price sensitivity and cost base; it scores poorly on incumbent weakness (Blix is entrenched in both Poland and Ukraine — but as a *leaflet* app, in the lower-right quadrant, not ours).

---

## 8. Business model

Four revenue lines, deliberately sequenced so the business does not depend on consumer monetisation.

### 8.1 B2B price intelligence — ShelfSignal (largest line, ~40% of Y3 revenue)

Subscription feeds and dashboards: competitive shelf-price tracking by chain/zone/SKU/day, promo detection, price-gap alerts, assortment/out-of-stock signals, shrinkflation tracking.

- Buyers: CPG brands (is my product priced where I agreed?), retailers (what are my rivals doing?), analysts, media, public bodies.
- Pricing: €1.5k–€12k/month by SKU breadth and market count.
- **Cost advantage: decisive.** A Field Agent-style store check costs the buyer $2–12. Our marginal cost per *verified price observation* is under €0.01. We can price at 1/50th of incumbents and still run 80%+ gross margin.
- Critical constraint: sell **aggregated, anonymised panel data only**. Never individual-level purchase data, never PII. This is both a GDPR requirement and the trust guarantee that keeps the consumer app alive.

### 8.2 Retail media & performance offers (~50% of Y3 revenue)

Labelled, non-ranking-altering placements: sponsored substitutions ("also consider"), chain-level conquest offers, coupon distribution with receipt-verified redemption (a genuinely premium ad product — verified purchase records trade at $0.05–$0.50 each).

Revenue per MAU ramps €0.50 (Y1) → €1.00 (Y2) → €2.00 (Y3), conservative against mature grocery-app benchmarks.

### 8.3 Consumer premium (~11% of Y3 revenue)

€2.49/month or **€17.99/year** (deliberately Yuka-adjacent at $10–20/yr, the proven price point).

Free forever: list, receipt scanning, spend tracking, basic price lookup, health scores.
Premium: unlimited price history, multi-store split optimisation, price-drop alerts, diet-constrained optimisation, household sharing, data export, offline mode, no sponsored placements.

Assumed conversion 3.5% of MAU — below Yuka's implied rate, because our free tier is more generous by design.

### 8.4 Affiliate / commerce (small, opportunistic)

Handoff to online grocery baskets where the retailer welcomes it. Explicitly **not** load-bearing — this is what made prior comparison sites hostage to retailer goodwill.

### 8.5 What we will not do

- Sell individual-level purchase data. Ever.
- Let payment change the price or health ranking.
- Build the business on a scraping dependency that a single legal letter can switch off.

---

## 9. Unit economics

**Per active user, per year (year 3 steady state):**

| Line | Amount |
|---|---|
| Retail media | €2.00 |
| Premium (3.5% × €13 net of store fees) | €0.46 |
| Data licensing (allocated per MAU) | €1.57 |
| **Revenue per MAU** | **€4.03** |
| Receipt processing (≈52 receipts/yr × €0.004) | −€0.21 |
| Infrastructure, storage, catalogue ops | −€0.26 |
| Support & moderation | −€0.09 |
| **Gross profit per MAU** | **€3.47 (86%)** |

**CAC:** blended target €0.80–€1.60. This is only achievable because the primary channel is organic/viral (shared lists, screenshot-friendly personal inflation, and press citing the basket index) — Yuka reached profitability **with zero traditional marketing spend**, which is the proof that this category can be won organically.

**LTV:** 26-month average life × €3.47 = **~€7.50**. **LTV/CAC ≈ 5–9×.** Payback under 6 months.

**Contributor economics:** ~300 active contributors sustain a metro's core basket. At a €3/month incentive for the top contributor cohort (cash-equivalent or premium credit), a metro's data supply costs **~€900/month** — versus roughly €45,000/month to buy the equivalent observation volume from a paid-audit vendor.

---

## 10. Go-to-market

### Phase 1 — One metro, one neighbourhood at a time (months 0–8)

- Seed the core-basket catalogue manually; pay a small squad (10–20 people) to scan receipts for 6 weeks to break the cold start. Budget: ~€6k. This buys credible day-one coverage.
- Launch to local communities where grocery price talk already happens: parent groups, expat groups, frugal-living and student communities, local subreddits/Telegram.
- **Hyperlocal claim:** "Every price in this app came from a receipt in this district in the last 7 days."
- Instrument the honest metric: **basket coverage %** per district. Do not market a district until it clears 85%.

### Phase 2 — Density then metros (months 9–20)

- Household/shared lists as the viral mechanic (each new list invites 1.4 people on average in comparable apps).
- Publish the **monthly city basket index**. Pitch it to consumer journalists. Every article is free, credible acquisition and simultaneously the ShelfSignal sales collateral.
- Open ShelfSignal pilots with 3–5 CPG brands in month 10; convert 2 to annual contracts by month 14.

### Phase 3 — National + bridgehead abroad (months 21–36)

- Replicate the metro playbook; catalogue work is now templated (~2 weeks per market).
- Foreign bridgehead chosen by the Section 7.4 framework, not by opportunism.

### Retention

Weekly habit (shop → scan → verdict), monthly habit (spend report, personal inflation), and a genuine switching cost that compounds: your own price history and your household's lists live here.

---

## 11. Technology & operations

**Stack (chosen for solo-founder velocity and low fixed cost):**
- Mobile: React Native or Flutter, single codebase, offline-first list store.
- Backend: Node/TypeScript or Go; PostgreSQL (+ TimescaleDB for the price time series); object storage for receipt images with aggressive retention limits.
- Extraction: hosted VLM for receipt parsing (~€0.004/receipt) with a correction-feedback loop; a distilled in-house model becomes worthwhile above ~500k receipts/month.
- Matching: embedding-based line-text → GTIN resolution, human-in-the-loop for the core basket.
- Health: Open Food Facts mirror, refreshed nightly, ODbL-attributed.
- Optimiser: constrained-cost basket solve across price groups with coverage, distance and diet constraints.

**Infrastructure cost:** ~€2k/month at 30k MAU; ~€15k/month at 700k MAU. Storage discipline (discard receipt images after extraction + a short audit window) is the main cost lever and is also a privacy win.

**Team plan:**

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Engineering | 2 | 4 | 8 |
| Data/catalogue ops | 1 | 2 | 4 |
| Growth/community | 0.5 | 1.5 | 3 |
| B2B sales | 0 | 1 | 2 |
| Founder/ops | 1 | 1 | 1 |
| **Total FTE** | **4.5** | **9.5** | **18** |

---

## 12. Financial projections

### Base case

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Markets | 1 metro | 5 metros | National + 1 |
| Avg MAU | 30,000 | 200,000 | 700,000 |
| Premium subscribers | 900 | 6,000 | 24,500 |
| Premium revenue | €12k | €78k | €319k |
| Retail media | €15k | €200k | €1,400k |
| Data licensing (ShelfSignal) | €60k | €350k | €1,090k |
| **Total revenue** | **€87k** | **€630k** | **€2,809k** |
| Personnel | €220k | €560k | €1,250k |
| Infrastructure & extraction | €25k | €70k | €180k |
| Contributor incentives | €40k | €150k | €300k |
| Marketing | €0k | €180k | €600k |
| Sales & G&A | €0k | €0k | €250k |
| **Total costs** | **€285k** | **€960k** | **€2,580k** |
| **EBITDA** | **−€198k** | **−€330k** | **+€229k** |
| Cumulative | −€198k | −€528k | −€299k |

Breakeven: **month 30–34**. Peak cumulative burn: **~€560k**. Ask of €900k gives ~60% headroom.

### Scenarios

| | Bear | Base | Bull |
|---|---|---|---|
| Y3 MAU | 220,000 | 700,000 | 1,800,000 |
| Y3 revenue | €640k | €2.81M | €8.4M |
| Y3 EBITDA | −€780k | +€229k | +€2.9M |
| Trigger | Coverage stalls; no B2B contracts | Plan holds | Basket index goes national in press; 2 markets; enterprise data deals |

**Bear case is survivable** — at €640k revenue with a cut cost base the business becomes a small profitable data company serving 3–4 B2B customers, which is a real (if unexciting) outcome rather than a zero.

### Use of funds (€900k / 24 months)

| | Amount | % |
|---|---|---|
| Engineering & product | €430k | 48% |
| Data/catalogue operations | €135k | 15% |
| Growth & community | €160k | 18% |
| Contributor incentives | €80k | 9% |
| Legal, compliance, G&A | €95k | 10% |

---

## 13. Risks and mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Cold-start coverage fails** — the historical killer | Critical | Chain×zone grouping (25–40× reduction); core-basket scope; paid seeding squad; never launch a district below 85% coverage |
| 2 | **Consumer monetisation too weak** — killed mySupermarket | High | B2B-primary model; consumer revenue is only 11% of Y3 |
| 3 | **Retailer hostility / C&D** — happened to Trolley | Medium | Receipt data is the user's own record, legally clean; scraping is secondary and per-retailer suspendable; no load-bearing retailer dependency |
| 4 | **Yuka or Fetch adds the missing half** | Medium-High | Yuka is structurally blocked by its no-brand-money position; Fetch has no health data or EU footprint. Speed + local catalogue depth is the defence. Realistically this also defines the **exit** |
| 5 | **Data quality / gaming** | Medium | Reputation scoring, outlier rejection, receipt authenticity checks, confidence bands shown to users |
| 6 | **GDPR / privacy** | High | Aggregated panel only; no individual data sold ever; explicit opt-in; receipt images deleted after extraction; DPO engaged by Y2; privacy is marketed as a feature |
| 7 | **VLM extraction cost or quality regression** | Low-Medium | Multi-vendor abstraction; in-house distilled model above 500k receipts/month |
| 8 | **Retailer launches own comparison** | Low | Structurally impossible for a retailer to credibly compare rivals |
| 9 | **Solo-founder bandwidth (A2)** | High | Hire the data-ops role early; keep MVP scope to the four MVP features and refuse everything else |
| 10 | **Open Food Facts coverage gaps in CEE** | Medium | Contribute back and seed local products — this is cheap, builds goodwill, and improves a resource competitors also rely on (accepted, deliberate) |

---

## 14. Verdict on business potential, and kill criteria

### Is this a business?

**Yes — but not the business it first looks like.** As a consumer price-comparison app, the expected outcome is a well-loved product that cannot pay for itself; the category has a clear track record of exactly that. As a **consumer-funded data acquisition machine for a B2B price panel, with a health-cross feature that no incumbent can copy**, the economics work: 86% gross margin per user, LTV/CAC of 5–9×, breakeven inside three years on under €600k of cumulative burn, and a bear case that is a small profitable company rather than a zero.

The whitespace in the price × health quadrant is genuine. It is empty because the cold-start and monetisation problems are hard — and the three mechanics in this plan (receipt-first capture, chain×zone price grouping, B2B-primary revenue) are direct, testable answers to precisely those problems.

**Realistic outcome band:** a €3–10M revenue regional data-and-consumer business within 4–5 years, with a credible acquisition path to a retail-intelligence firm (NielsenIQ, Circana, Profitero), a receipts player (Fetch), a leaflet incumbent (Blix/Bonial), or a health app seeking price capability.

**It is not a venture-scale outcome in one country.** Multi-country replication is what turns this from a good small business into a large one, and the catalogue-per-market cost is the thing that determines whether that replication is cheap. Test that in year 2, not year 4.

### Kill criteria — decide honestly against these

1. **Month 6:** core-basket coverage in the launch metro below **70%**, or fewer than **200** weekly active contributors → the crowdsourcing model does not work; stop or pivot to pure scraping + B2B.
2. **Month 9:** week-4 retention below **20%** → the spend-tracker hook is not habit-forming; the whole loop fails.
3. **Month 14:** zero paying ShelfSignal contracts → the B2B thesis is wrong and consumer revenue alone cannot carry it; wind down or sell the data asset.
4. **Month 18:** blended CAC above **€4** with organic share under 50% → the Yuka-style organic path is closed; the economics do not survive paid acquisition.

### Immediate next steps (first 90 days)

1. Validate A1: score three candidate metros against Section 7.4; pick one.
2. Collect 500 real receipts from that metro; measure actual VLM extraction accuracy and cost per receipt. **This is the single cheapest way to de-risk the entire plan.**
3. Measure real price dispersion on 200 core SKUs across the metro's chains. If dispersion is under ~10%, the consumer value proposition is too weak and the plan should be reconsidered regardless of everything else.
4. Empirically test the chain×zone hypothesis: do stores of the same chain in the same city actually price identically? Quantify it.
5. Build the MVP receipt-scan + spend-tracker loop. Ship to 100 users. Instrument scans per user per week.
6. Take the price-dispersion finding to 5 CPG brands as a ShelfSignal pilot conversation, before the app is finished.

---

## Sources

- [Best grocery price tracking apps 2026 — Rate Grove](https://rategrove.com/guides/best-grocery-price-tracking-apps)
- [Basket Savings company profile — Tracxn](https://tracxn.com/d/companies/basket-savings/__Bt49X4QS-6Q33uhPOZtN5L1MNyTzcjZtkUoOgxuDhD8)
- [Basket is like Waze for local grocery price comparison — The Spoon](https://thespoon.tech/basket-is-like-waze-for-local-grocery-price-comparison/)
- [Basket president on crowdsourced price information — Street Fight](https://streetfightmag.com/2016/01/25/basket-president-apps-crowdsourced-price-information-empowers-shoppers/)
- [Yuka — Independence (funding model)](https://yuka.io/en/independence/)
- [Yuka founder on building a leading health app with no marketing strategy — US Chamber of Commerce](https://www.uschamber.com/co/good-company/the-leap/yuka-app-organic-growth)
- [Yuka app: nutrition, health and market opportunities — FoodTimes](https://www.foodtimes.eu/consumers-and-health/yuka-app-nutrition-health-and-market-opportunities/)
- [How Fetch Rewards makes money — FourWeekMBA](https://fourweekmba.com/how-does-fetch-rewards-make-money/)
- [NielsenIQ invests in Fetch Rewards for panel expansion — MrWeb](https://www.mrweb.com/drno/news33142.htm)
- [Fetch Rewards ToS analysis — ToS Watchdog](https://terms.law/ToS-Watchdog/cashback-apps/fetch/)
- [Trolley.co.uk app](https://www.trolley.co.uk/app/)
- [Cease & desist letter received by Trolley — Hacker News](https://news.ycombinator.com/item?id=31904284)
- [mySupermarket grocery price comparison tool closes — Better Retailing](https://www.betterretailing.com/mysupermarket-grocery-price-comparison-closes/)
- [MySupermarket — Wikipedia](https://en.wikipedia.org/wiki/MySupermarket)
- [Supermarket price comparison sites decline — Grocery Gazette](https://www.grocerygazette.co.uk/2022/07/07/supermarket-comparison-site/)
- [Open Food Facts — data, API and SDKs](https://world.openfoodfacts.org/data)
- [Open Food Facts — Wikipedia](https://en.wikipedia.org/wiki/Open_Food_Facts)
- [Listonic — smart shopping list](https://listonic.com/)
- [Listonic Ads — business model](https://ads.listonic.com/en/blog/meet-the-smart-shopping-list-listonic/)
- [Blix Ukraine — Google Play](https://play.google.com/store/apps/details?id=ua.com.skidki.akcii&hl=en)
- [Retail media growth, statistics and trends 2026 — Fugo](https://www.fugo.ai/blog/retail-media-growth-statistics-trends/)
- [Retail media's off-site land grab — ShopAppy](https://shopappy.com/marketing/paid-ads/retail-media-offsite-h2-2026)
- [The power of the crowd in retail merchandising — Trax Retail](https://traxretail.com/blog/power-crowd-retail-merchandising/)
- [Why crowdsourced audits beat traditional agencies — Field Agent](https://www.fieldagentcanada.com/blog/why-crowdsourced-audits-beat-traditional-agencies)
- [Retail intelligence market forecast — OpenPR](https://www.openpr.com/news/4603583/retail-intelligence-market-to-reach-us-11-6-billion-by-2033)
- [Grocery shoppers still shifting behaviours due to inflation — Supermarket News](https://www.supermarketnews.com/grocery-trends-data/grocery-shoppers-still-shifting-behaviors-due-to-inflation-rising-fuel-costs)
- [The loyalty tax: how 2026 inflation is breaking brand loyalty — Doss](https://www.doss.com/research/inflation-breaking-american-brand-loyalty)
- [Retail prices are now the deciding factor — Forbes](https://www.forbes.com/sites/pamdanziger/2026/03/11/retail-prices-are-now-the-deciding-factor-as-consumer-uncertainty-intensifies/)
- [2026 European grocery retail legislation outlook — IGD](https://www.igd.com/articles/2026-european-grocery-retail-legislation-outlook/72733)
- [Transparency of price reductions in the EU — Bird & Bird](https://www.twobirds.com/en/insights/2025/global/transparency-of-price-reductions-a-closer-look-at-the-legal-framework-in-the-eu)
- [Is web scraping legal in 2026 — Browserless](https://www.browserless.io/blog/is-web-scraping-legal)
