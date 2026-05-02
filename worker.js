export default {
  async fetch(request) {
    const url = new URL(request.url);

    const parts = url.pathname.slice(1).split('/');
    if (!parts.length) {
      return new Response("Bad Request", { status: 400 });
    }

    const host = parts.shift();

    // ✅ 白名单（只允许这三个）
    const ALLOW = [
      "bing.img.run",
      "icons.duckduckgo.com"
      "www.google.com"
    ];

    if (!ALLOW.includes(host)) {
      return new Response("Forbidden", { status: 403 });
    }

    // 拼接目标 URL
    const target = `https://${host}/${parts.join('/')}${url.search}`;

    try {
      const resp = await fetch(target, {
        headers: {
          "User-Agent": request.headers.get("User-Agent") || ""
        }
      });

      const headers = new Headers(resp.headers);

      // ✅ 针对不同资源设置缓存
      if (host === "bing.img.run") {
        headers.set("Cache-Control", "no-cache");
      } else {
        // favicon（DuckDuckGo）
        headers.set("Cache-Control", "public, max-age=604800");
      }

      return new Response(resp.body, {
        status: resp.status,
        headers
      });

    } catch (e) {
      return new Response("Fetch Error", { status: 502 });
    }
  }
};
