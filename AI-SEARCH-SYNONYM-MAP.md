# SoberAnchor AI Search — Synonym Map

This document maps common user search terms to exact database values. Inject into the Haiku system prompt at `/api/smart-search`.

---

## 1. MEETING TYPES (types JSONB array on meetings table)

| User might say | Maps to DB value |
|---|---|
| outside, outdoors, open air, park, patio | `Outdoor` |
| ladies, women-only, female, womens, sisters | `Women` |
| guys, men-only, male, mens, brothers | `Men` |
| gay, queer, pride, rainbow, LGBTQ, LGBT | `LGBTQ+` |
| newcomer, new, first time, just starting, newbie, never been | `Beginners` |
| wheelchair, accessible, handicap, ADA, disability | `Wheelchair Accessible` |
| book study, big book, BB study | `Big Book Study` |
| steps, step meeting, step study, working steps | `Step Study` |
| speaker, speaker meeting, sharing, lead | `Speaker` |
| talk, sharing, crosstalk, discussion meeting | `Discussion` |
| kids, children, family friendly, bring kids | `Child-Friendly` |
| sign, deaf, ASL, hearing impaired | `Sign Language` |
| candle, candlelit, candlelight | `Candlelight` |
| meditation, mindfulness, quiet, silent | `Meditation` |
| young, youth, young people, college age, 20s | `Young People` |
| traditions, tradition study | `Traditions Study` |
| as bill sees it, ABSI | `As Bill Sees It` |
| 12 and 12, twelve and twelve, 12x12 | `12x12` |
| literature, reading, lit meeting | `Literature` |

## 2. MEETING ACCESS (types JSONB array)

| User might say | Maps to DB value |
|---|---|
| anyone can come, open to public, visitors welcome, non-members | `Open` |
| members only, closed meeting, private | `Closed` |

## 3. MEETING FORMAT (format field or types)

| User might say | Maps to DB value |
|---|---|
| online, virtual, zoom, remote, video, from home | `Online` |
| in person, in-person, face to face, physical, IRL | `In-Person` |
| hybrid, both, online and in person | `Hybrid` |

## 4. MEETING LANGUAGE (types JSONB array)

| User might say | Maps to DB value |
|---|---|
| english, english-speaking | `English` |
| spanish, español, hispanic, latino, latina | `Spanish` |
| sign language, ASL, deaf, hearing impaired | `Sign Language` |

## 5. MEETING TIME

| User might say | Maps to query logic |
|---|---|
| morning, early, AM, sunrise, before work | start_time < 12:00 |
| afternoon, midday, lunch, noon | start_time >= 12:00 AND < 17:00 |
| evening, night, PM, after work, after dinner | start_time >= 17:00 |

## 6. MEETING DAY

| User might say | Maps to DB value |
|---|---|
| today | (inject current day_of_week dynamically) |
| tomorrow | (inject next day_of_week dynamically) |
| this weekend, weekend | `Saturday` OR `Sunday` |
| weekday, weekdays, during the week | `Monday` OR `Tuesday` OR `Wednesday` OR `Thursday` OR `Friday` |
| mon, monday | `Monday` |
| tue, tues, tuesday | `Tuesday` |
| wed, wednesday, hump day | `Wednesday` |
| thu, thur, thurs, thursday | `Thursday` |
| fri, friday | `Friday` |
| sat, saturday | `Saturday` |
| sun, sunday | `Sunday` |

---

## 7. FELLOWSHIPS (fellowships table — match by abbreviation or name)

| User might say | Maps to fellowship |
|---|---|
| AA, alcoholics anonymous, alcohol meetings | `AA` |
| NA, narcotics anonymous, drug meetings, narcotics | `NA` |
| al-anon, alanon, family of alcoholic, my husband drinks, my wife drinks, loved one drinks | `Al-Anon` |
| alateen, teen, teenager, child of alcoholic | `Alateen` |
| SMART, smart recovery, science-based, CBT, secular recovery | `SMART` |
| celebrate recovery, CR, christ-centered, church recovery, faith-based recovery | `CR` |
| GA, gamblers anonymous, gambling, betting, sports betting, casino | `GA` |
| OA, overeaters anonymous, food addiction, binge eating, eating disorder, compulsive eating | `OA` |
| CoDA, coda, codependent, codependency, people pleaser, boundaries | `CoDA` |
| ACA, ACOA, adult children, dysfunctional family, grew up with alcoholic, childhood trauma | `ACA/ACoA` |
| SAA, sex addicts, sex addiction, porn addiction, sexual compulsivity | `SAA` |
| SLAA, love addiction, relationship addiction, love addict | `SLAA` |
| CA, cocaine anonymous, cocaine, crack, stimulants | `CA` |
| CMA, crystal meth, meth, tina | `CMA` |
| MA, marijuana anonymous, weed, pot, cannabis | `MA` |
| HA, heroin anonymous, heroin, opiates, fentanyl | `HA` |
| PA, pills anonymous, prescription drugs, painkillers, oxy | `PA` |
| DA, debtors anonymous, debt, money problems, spending addiction | `DA` |
| NicA, nicotine anonymous, smoking, vaping, tobacco, juul | `NicA` |
| nar-anon, naranon, family of addict, loved one uses drugs | `Nar-Anon` |
| gam-anon, gamanon, family of gambler, spouse gambles | `Gam-Anon` |
| refuge, dharma recovery, buddhist recovery, meditation recovery | `Refuge` |
| lifering, secular, non-religious, atheist, agnostic | `LifeRing` |
| WFS, women for sobriety, women-only program | `WFS` |
| WA, workaholics, work addiction, workaholic | `WA` |

---

## 8. FACILITY TYPES (facility_type field on facilities table)

| User might say | Maps to DB value |
|---|---|
| rehab, rehabilitation, treatment center, inpatient, residential, detox, treatment facility | `treatment` |
| sober living, sober house, halfway house, recovery housing, transitional housing, oxford house | `sober_living` |
| therapist, counselor, therapy, counseling, psychologist, LCSW, MFT, addiction counselor | `therapist` |
| outpatient, IOP, intensive outpatient, PHP, partial hospitalization, day program | `outpatient` |
| meeting hall, venue, meeting space, club, alano club, recovery club | `venue` |

## 9. FACILITY CATEGORIES (categories table — match by name)

| User might say | Maps to category |
|---|---|
| alcohol, drinking, alcoholism, booze | `Alcohol` |
| drugs, substances, drug abuse | `Drugs & Medications` |
| opioid, opiate, heroin, fentanyl, oxy, painkiller | `Opioids & Painkillers` |
| meth, methamphetamine, crystal | `Methamphetamine` |
| cocaine, crack, coke, stimulant, adderall, amphetamine | `Cocaine & Stimulants` |
| weed, pot, marijuana, cannabis, THC | `Marijuana` |
| gambling, betting, casino, slots, poker, sports betting | `Gambling` |
| eating disorder, anorexia, bulimia, ED | `Anorexia & Bulimia` |
| binge eating, overeating, food addiction | `Overeating & Food Addiction` |
| sex addiction, porn, pornography, sexual compulsion | `Sex & Relationship Compulsions` |
| shopping, spending, debt, shopaholic | `Shopping & Spending` |
| gaming, video games, internet addiction, screen time | `Internet & Gaming` |
| smoking, vaping, nicotine, tobacco | `Nicotine & Tobacco` |
| self-harm, cutting, self-injury | `Self-Harm Behaviors` |
| work, workaholic, burnout, overworking | `Workaholism` |
| hoarding, clutter, collecting | `Hoarding & Clutter` |
| hair pulling, skin picking, trichotillomania | `Body-Focused (BFRBs)` |
| family, loved one, spouse, partner, parent of addict, child of addict, help for family | `Supporting a Loved One` |
| polysubstance, multiple drugs, cross addiction | `Multiple Substances` |

## 10. INSURANCE (facility_insurance table)

| User might say | Maps to DB value |
|---|---|
| aetna, aetna insurance | `Aetna` |
| blue cross, blue shield, BCBS, anthem | `Blue Cross / Blue Shield` |
| cigna, evernorth | `Cigna` |
| medi-cal, medicaid, medical, state insurance, government insurance | `Medi-Cal` |
| does insurance cover, accept insurance, takes insurance | (query all insurance options) |
| no insurance, uninsured, self-pay, cash pay, free | (filter for facilities with sliding scale or free options) |

## 11. STEP WORK / RECOVERY PROGRAM TERMS

| User might say | Maps to intent |
|---|---|
| step work, working steps, 12 steps, steps, my steps | `step_work` intent → route to member step work |
| step 1, step one, first step, powerlessness, admitted | Step 1 content |
| step 4, fourth step, inventory, moral inventory, resentments | Step 4 content |
| step 5, fifth step, confession, sharing inventory | Step 5 content |
| step 8, eighth step, amends list, who I harmed | Step 8 content |
| step 9, ninth step, making amends | Step 9 content |
| sponsor, sponsorship, find a sponsor, get a sponsor, need a sponsor | Sponsor system info |
| big book, basic text, literature, program book | Informational about fellowship literature |
| CBA, cost benefit analysis, pros and cons | SMART Recovery Point 1 |
| ABC, ABCDE, rational thinking, beliefs | SMART Recovery Point 3 |
| DENTS, urge management, coping with urges | SMART Recovery Point 2 |
| laundry list, 14 traits, ACA traits | ACA Step 1 Laundry List |
| three circles, inner circle, outer circle, middle circle | SAA Step 1 Three Circles |
| hurts habits hangups, celebrate recovery, 8 principles | Celebrate Recovery |
| detachment, detach with love, letting go, three Cs | Al-Anon concepts |

## 12. CRISIS / URGENT

| User might say | Maps to intent |
|---|---|
| crisis, emergency, suicidal, want to die, kill myself, hurting myself, overdose, relapse right now, using right now, about to use, need help now, urgent | `crisis` intent → show crisis resources immediately: SAMHSA 1-800-662-4357, Crisis Lifeline 988, Crisis Text Line text HOME to 741741 |

---

## Implementation Notes

1. **Inject this map into the Haiku system prompt** — Haiku uses it to classify queries AND extract filter values
2. **Current date/time injection** — always inject the current day/time so "today" and "tonight" resolve correctly
3. **Multiple intents** — a query like "AA meetings for women on Saturday morning" should extract: fellowship=AA, type=Women, day=Saturday, time=morning
4. **Fallback** — if Haiku can't classify, default to a broad informational response with links to browse meetings and facilities
5. **Name search always runs** — in addition to classified filters, always run an ILIKE name search on the raw query keywords against meetings.name and facilities.name
