// public/sw.js
//
// Freezes the staff app on whatever version was active when this
// service worker last activated. New deployments install in the
// background but never take over the page until the staff member
// clicks "Update now" (wired up in useAppUpdates.ts).
//
// ── WORKFLOW ──────────────────────────────────────────────────
// Every time you ship a change you want gated behind the update
// prompt: bump CACHE_NAME below (e.g. v1 -> v2) AND add a matching
// entry to changelog.ts. The version numbers don't need to match
// exactly, they're just two manual steps that happen together.
// -----------------------------------------------------------------

const CACHE_NAME = "staff-app-v6";

self.addEventListener("install", (event) => {
  // Deliberately NOT calling self.skipWaiting() here.
  // That omission is what keeps this new version parked in   
  // "waiting" instead of taking over the page immediately.
  
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Only runs once this version has been explicitly activated
      // (see the SKIP_WAITING message below) — safe to clear old
      // versions' caches now that nothing is using them.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// The "Update now" button in the app sends this message to the
// waiting worker to promote it to active.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Never intercept non-GET requests (sales, payments, settings
  // saves, etc.) — those must always reach the live backend.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API calls always hit the network live. Only the app's own
  // code/UI is frozen — data (stock, sales, shift totals) is not.
  if (isApiRequest(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached; // serve the frozen version

      // First time this asset is requested under this version —
      // fetch it once, then lock it into this version's cache so
      // every subsequent load (even after later deploys) keeps
      // getting this exact response until the user updates.
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});