# CO₂ Footprint Calculator (Part B – Simple Sector Calculator)

Open `index.html` in any browser (double-click). No install, no internet, no build step. Works on phones.

## Files
| File | What it does |
|---|---|
| `index.html` | Page shell |
| `style.css` | Plain white, mobile-first styling |
| `engine.js` | **All numbers live here** – conversion figures, formula, comparison, tips |
| `app.js` | Flip-card steps, form, pie chart, result screen |
| `chatbot.js` | Offline "CO₂ Helper" chatbot |

## How it works (4 steps, as in Appendix D)
1. Pick who it's for (home / small business / large organisation / city or country).
2. Answer 4 short question cards: electricity, vehicle fuel, generators & gas, AC-gas refills.
3. Behind the scenes: `CO₂ (kg) = amount × conversion figure`, summed, monthly ×12.
4. Result: one number, one comparison line, a pie chart and 2 tips that change with the result.

## Conversion figures (edit in `engine.js` → `FACTORS`)
| Item | Value | Source |
|---|---|---|
| Electricity | 0.567 kg CO₂ / kWh | Carbon Atlas project data (Bangladesh grid) – **replace with the exact figure cited in Part A** |
| Petrol | ≈ 2.38 kg CO₂e / litre | IPCC 2006 defaults, density 0.755 kg/L (Assignment Appendix B method), GWP AR5 |
| Diesel | ≈ 2.81 kg CO₂e / litre | IPCC 2006 defaults (CO₂ 74.1, CH₄ 3.9, N₂O 3.9), density 0.87 kg/L (Appendix B), GWP AR5 |
| Natural gas | 2.04 kg CO₂ / m³ | Carbon Atlas project data |
| AC / fridge gas | 2088 kg CO₂e / kg | GWP of R-410A, Carbon Atlas project data |

The assignment requires Part B to use the SAME cited factors as Part A – if your Part A uses different values, change them in `FACTORS` and everything (result, chatbot, "how was this worked out") updates automatically.

## Comparison values (edit in `engine.js` → `TYPICAL`)
Typical home / small business / large organisation are calculated from example monthly usage with the same factors. City/country compares with Bangladesh's ≈100 million t CO₂/yr (Global Carbon Project, rounded).
