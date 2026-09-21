# ODI-52 merge-gating verification

Deployment SHA verified: `37de42cb99471a16f5e493ed462ae700a50f261e`, branch `feat/odi-52-pdp-tiers`, READY deployment `dpl_H5QTADAid3JaBuJYvZKZ2wtAypoe`. Immutable deployment https://soberanchor-pl7neql76-odius7-maxs-projects.vercel.app. Content marker: enhanced fixture PDP actually rendered “✓ Verified”; this was not a status-code-only readiness check.

**Current decision: PASS — HOLD CLOSED after storage-fixture repair.** The closure evidence below supersedes the original media failure. Original observations are preserved for traceability. No claims, lead submissions, or merges performed during verification.

## HOLD-closure media re-run

Same preview and commit `37de42cb99471a16f5e493ed462ae700a50f261e`; repair was storage/data, not code. Images now resolve through the preview's `/_next/image` with Supabase `facility-media/demo/` public URLs. Each required image was checked after settling: `complete && naturalWidth > 0` true.

| URL / fixture | Image delivery | Cap / expected omissions | 390px layout |
|---|---|---|---|
| https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001 | PASS: all 3 gallery images loaded through optimizer | PASS: exactly “Demo photo 1 — test data”, “Demo photo 2 — test data”, “Demo photo 3 — test data”; 4–5 absent from image elements and visible gallery. No facility logo, as expected. | PASS |
| https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000002 | PASS: all 6 photos, logo, staff1 photo loaded through optimizer (8 images) | PASS: second staffer retains fallback avatar, visually confirmed | PASS: gallery, embedded video, team, callback form and gold insurance panel fit |
| https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000003 | PASS: all 4 photos, logo, staff1 photo loaded through optimizer (6 images) | PASS: four photos/one staffer are the intended fixture, not missing-content defects | PASS: gallery, embedded video and gold insurance panel fit |

Browser viewport configured 390×844. On all three loaded PDPs `documentElement.scrollWidth = clientWidth = 375` (scrollbar-adjusted content width), with no horizontal overflow. Enhanced iframe spans x=25–350; premium iframe x=25–350 and gold panel x=24–351. Screenshots checked with actual loaded placeholders. Placeholder text cropping inside square `object-cover` thumbnails is expected, not horizontal page overflow. Viewport restored after test.

Fixture names containing “Claimed” are accepted audit-era labels, not consumer status-copy regressions. The original ownerless-premium form absence remains correct under ODI-84. **All three HOLD-closure checks PASS; full ODI-52 QA sign-off for merge at this commit.** No merge performed.

## Fixture 0001 — basic, unclaimed

Every row below uses https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001

| Cell | Grade | Evidence |
|---|---|---|
| Free photo cap | PASS structural / FAIL image display | Exactly 3 image elements: “Demo photo 1 — test data”, “Demo photo 2 — test data”, “Demo photo 3 — test data”. No photo 4 or 5 element. All three image loads fail. |
| Unclaimed override photos | YES, selected into rendering | Published override photos are used despite unclaimed state; actual pixels fail for the delivery reason below. |
| Verified badge absent | PASS | No Verified badge. |
| Featured absent | PASS | No Featured badge. |
| Lead form absent | PASS | No callback/request form; direct call and website remain. |
| Claim banner | PASS | “Work at SoberAnchor Demo — Unclaimed?” and “🏥 Claim This Listing”. |
| Similar centers | PASS | “Similar centers nearby”; links to demo 0003 and 0002. |
| Insurance without gold | PASS | “Payment & insurance”, “Medicaid”, “💚 Demo Sliding Scale (TEST)”; class `rounded-[14px] p-5 border border-border`. No named insurance rows appeared here, unlike paid fixtures. |

## Fixture 0002 — enhanced, owned and verified

Every row below uses https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000002

| Cell | Grade | Evidence |
|---|---|---|
| All six photos | PASS count / FAIL display | Image elements “Demo photo 1” through “Demo photo 6”, all unloaded/broken. |
| Logo | FAIL display | “SoberAnchor Demo — Pending Claim logo” element exists but image does not load. |
| YouTube embedded playback | PASS | iframe `https://www.youtube.com/embed/aqz-KE-bpKQ`; Big Buck Bunny player. Keyboard activation started actual playback: `paused=false`, `readyState=4`, `currentTime=4.900008`. No external navigation. |
| Two staff, one photo | PASS text/count / FAIL photo | “Demo Staffer One (TEST)” / “Clinical Director”; “Demo Staffer Two (TEST)” / “Admissions”; first photo broken, second fallback avatar visible. |
| Amenities | PASS | “Demo Pool”, “Demo Gym”, “Demo Garden”. |
| Verified / no Claimed status | PASS | “✓ Verified”; no Claimed string in this fixture's consumer copy. |
| Lead form render/function | PASS | “Request a callback”; First Name, Phone Number, Insurance Provider, What are you looking for?, Who is this for?, “Request Information →”. Text entry and insurance selection worked; button enabled. No submission, values restored. |
| Gold insurance | PASS | Border `border-2 border-[rgba(212,165,116,0.55)]`, background `bg-[var(--gold-10)]`. |
| PAY/PYAS and assistance | PASS | “Medicaid” payment chip; “💚 Demo Sliding Scale (TEST)” assistance line. PYAS is rendered as an assistance line, not a duplicate pill. |
| Insurance rows | PASS | “Demo Insurance Co (TEST)”, “Example Health Plan (TEST)”. |
| Notes | PASS | “Demo insurance notes — test data only, not a real facility.” |
| No Featured | PASS | No Featured badge. |
| No similar centers | PASS | Similar-centers section absent. |

## Fixture 0003 — premium, no owner

Every row below uses https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000003

| Cell | Grade | Evidence |
|---|---|---|
| Gallery | PASS structural / FAIL display | Four staged-looking image elements “Demo premium photo 1”–“Demo premium photo 4”; all fail load. Not six: this fixture visibly differs from 0002. Without DB fixture readback, cannot assert the number staged equals four. No premium cap exists in inspected source. |
| Logo | FAIL display | “SoberAnchor Demo — Claimed logo” exists but fails load. |
| Video | PASS | Same YouTube embed; after keyboard activation actual playback confirmed `paused=false`, `readyState=4`, `currentTime=84.113983`. Paused after test. |
| Staff | PASS presentation structure / FAIL photo | One entry “Demo Premium Staffer (TEST)” / “Program Director”, broken photo. Not the two entries staged on 0002. |
| Amenities | PASS | “Demo Spa”, “Demo Yoga Studio”. |
| Featured | PASS | “⭐ Featured”. |
| Verified | PASS against flags | “✓ Verified”; this badge uses claimed+verified flags, not provider ownership. |
| Lead form absent | PASS — ODI-84 | No inquiry path despite premium presentation. Correct for no owner; no defect filed. Direct phone/website remain. |
| Gold insurance and notes | PASS | Same gold classes; “Medicaid”, “💚 Demo Sliding Scale (TEST)”, “Demo Insurance Co (TEST)”, “Demo premium insurance notes — test data only.” |
| About preserved | PASS | “Demo facility About copy — provider-written content appears here on claimed listings. Test data only.” |
| Hours preserved | PASS | Monday “9am–5pm”; “Demo hours — test data”. |
| No similar centers | PASS | No similar-centers section. |

## Directory

URL https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find

| Cell | Grade | Evidence |
|---|---|---|
| Exactly one Featured card | PASS | One card, demo 0003, in region “Featured listings”, labeled “Featured” and “Sponsored”, badge “⭐ Featured”. |
| Organic order unaffected by paid placement | PASS runtime/source spot-check | Separate organic list starts 10th District Substance Abuse Program, 4 2 Restore LLC, 5 Door Recovery, 7 Summit Pathways, 7th Street, 820 River Street Inc. Source fetch orders by name; FeaturedBand has its own premium+is_featured query. No paid sort added. |
| Card verification | PASS on demo search | At https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/find?q=SoberAnchor%20Demo#results, 0003 and 0002 say “✓ Verified”; 0001 does not. Search order Claimed / Pending Claim / Unclaimed follows name, not a paid-order override. Featured-band compact card itself does not show a Verified badge; organic/search cards do. |

## Cross-cutting and blocker

| Cell | Grade | Evidence |
|---|---|---|
| Zero Claimed strings | FAIL literally; fixture-copy nit | No “✓ Claimed” status badge. But 0003 title/name remains “SoberAnchor Demo — Claimed”; its About contains “on claimed listings”. These appear on its PDP and related listing links/cards. Rename seeded copy if literal-zero is required; do not misclassify as badge regression. |
| No new unqualified prices | PASS observed surfaces | No dollar-price mentions on these PDPs or observed directory surfaces. |
| No horizontal overflow at 390px | PASS current rendering, limited by broken media | Browser viewport set to 390×844. For all three PDPs, document `scrollWidth=clientWidth=375` and body width 375 (available content width after browser scrollbar). No horizontal overflow. Viewport restored. Loaded-image visual layout needs repeat after fixture repair. |
| Anonymous draft leakage spot-check | PASS | Direct anonymous Supabase REST `facility_overrides?select=*&limit=1`, with only public anon credentials and no user/service-role session: HTTP 200 body `[]`. Source public view projects only facility_id/published. This is a spot-check, not a comprehensive policy audit. |

### Merge-gating media failure

Representative exact URL: https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/_next/image?url=https%3A%2F%2Fpicsum.photos%2Fseed%2Fsa1a%2F800%2F600&w=3840&q=75

Browser error: **“400 INVALID_IMAGE_OPTIMIZE_REQUEST”**, “This request couldn’t be completed”. All inspected fixture gallery/logo/staff images had `complete && naturalWidth > 0 = false`, with a visually broken staff image also observed. Pinned `next.config.ts` permits only `*.supabase.co/storage/v1/object/public/**`; picsum.photos is not allowed. Thus this is a fixture/config mismatch blocking the media acceptance test, not evidence that the tier cap is wrong.

Recommended next step: stage demo media in the already-supported Supabase public media bucket (or deliberately support the fixture host), then rerun image load, photo cap, and mobile checks. Do not broaden allowed remote hosts merely to disguise a fixture error. No fix made in this pass.
