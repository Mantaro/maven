addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

function shouldCache(url) {
    if(url.pathname.includes("/maven-metadata.xml")) {
        return false;
    }
    return true;
}

async function handleRequest(event) {
  const request = event.request;

  if(!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  url.host = "maven.s3.nl-ams.scw.cloud";

  if(!shouldCache(url)) {
    console.log("URL", url.toString(), "not cacheable");
    return await fetch(url, request);
  }

  const cache = caches.default;
  const cacheKey = url.toString();

  let response = await cache.match(cacheKey);

  if(!response) {
    console.log("URL", url.toString(), "not in cache, fetching from S3");
    response = await fetch(url, request);
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "immutable, max-age=31536000");
    response.headers.set("X-Cache-Status", "miss");
    event.waitUntil(cache.put(cacheKey, response.clone()));
  } else {
    console.log("URL", url.toString(), "in cache");
    response = new Response(response.body, response);
    response.headers.set("X-Cache-Status", "hit");
  }

  return response;
}

