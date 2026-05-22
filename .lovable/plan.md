## Problem

The Download button uses `<a href={url} download>`, but Cobalt's tunnel/CDN URLs are cross-origin (e.g. `instagram.frix9-1.fna.fbcdn.net`). Browsers ignore the `download` attribute on cross-origin links and just navigate to the file, which is why a new tab opens with the video player instead of saving the file.

## Fix

Replace the anchor-based download with a JS handler that fetches the file as a blob, creates an object URL, and triggers a synthetic `<a download>` click. This forces the browser to save the file regardless of origin.

### Changes in `src/routes/index.tsx`

1. Add a `downloading` state and a `handleDownload(url, filename)` function:
   - `fetch(url)` → `response.blob()`
   - `URL.createObjectURL(blob)` → temp `<a>` with `download={filename}` → click → revoke
   - On failure (CORS block, network error), fall back to `window.open(url, "_blank")` and show a toast explaining the browser blocked the direct save.
2. Derive a sensible filename when Cobalt doesn't return one: `mediadrop-<platform>-<timestamp>.<ext>` where ext is `mp3` for audio mode, `mp4` otherwise.
3. Replace the `<Button asChild><a ...></Button>` block with `<Button onClick={...}>` that calls the handler, shows a spinner while downloading.

No backend / server-function changes needed — this is purely a client-side download UX fix.

### Notes

- Cobalt tunnel URLs typically allow CORS, so blob fetch should succeed. If a specific CDN blocks it, the fallback `window.open` preserves current behavior so the user can still save manually.
- Large files will briefly hold the blob in memory; acceptable for typical short-form video.
