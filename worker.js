addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
  const request = event.request;

  if(!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  url.host = "maven.s3.nl-ams.scw.cloud";

  const cache = caches.default;
  const cacheKey = url.toString();

  let response = await cache.match(cacheKey);

  if(!response) {
    console.log("not in cache, fetching from S3");
    response = await fetch(url, request);
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "immutable, max-age=31536000");
    response.headers.set("X-Cache-Status", "miss");
    event.waitUntil(cache.put(cacheKey, response.clone()));
  } else {
    response = new Response(response.body, response);
    response.headers.set("X-Cache-Status", "hit");
  }
  
  return response;
}
