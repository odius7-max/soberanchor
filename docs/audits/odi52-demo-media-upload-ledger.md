# ODI-52 demo media fixture upload

19 objects uploaded successfully to public bucket `facility-media`, each upload HTTP 200. All are generic teal placeholders labeled “DEMO / TEST”, object identifier, “Generic placeholder”, and “Not a real facility or person”. JPEG galleries are 640×420; logos/staff placeholders are 320×320. Sizes range from 5,666 to 17,970 bytes, all below 100 KB. Uploads used create-only requests, without overwriting existing objects.

## Exact uploaded keys

```text
demo/0001-1.jpg
demo/0001-2.jpg
demo/0001-3.jpg
demo/0001-4.jpg
demo/0001-5.jpg
demo/0002-1.jpg
demo/0002-2.jpg
demo/0002-3.jpg
demo/0002-4.jpg
demo/0002-5.jpg
demo/0002-6.jpg
demo/0002-logo.png
demo/0002-staff1.jpg
demo/0003-1.jpg
demo/0003-2.jpg
demo/0003-3.jpg
demo/0003-4.jpg
demo/0003-logo.png
demo/0003-staff1.jpg
```

Public URL prefix: `https://ybpwqqbnfphdmsktghqd.supabase.co/storage/v1/object/public/facility-media/` followed by the exact key above. Full object IDs, sizes, upload status, and public URLs are recorded in [upload-ledger.json](demo-media/upload-ledger.json).

## Existing preview optimizer verification

Requested https://soberanchor-git-feat-odi-52-pdp-tiers-odius7-maxs-projects.vercel.app/_next/image?url=https%3A%2F%2Fybpwqqbnfphdmsktghqd.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Ffacility-media%2Fdemo%2F0001-1.jpg&w=640&q=75

Vercel fetch returned **HTTP 200 OK**, `Content-Type: image/jpeg`, `Content-Length: 7825`, with image bytes. Response date Thu, 17 Sep 2026 22:20:09 GMT. The native browser refused top-level navigation to this attachment response (`ERR_BLOCKED_BY_CLIENT`), so verification used the Vercel HTTP fetch; this is not a claim of a completed PDP visual retest.

No application code, allowlist, deployment, or database changes; no commits. Claude must repoint `facility_overrides.published` media paths before the PDP image-load/cap/mobile retest.

## Reset ledger

At fixture reset, delete the uploaded objects under the **`demo/` prefix in `facility-media`** (the 19 exact keys above), alongside the separately maintained DB fixture reset. No deletion performed now. Keep unrelated bucket objects intact.
