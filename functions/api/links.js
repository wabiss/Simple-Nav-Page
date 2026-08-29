const GITHUB_REPO = "wabiss/Simple-Nav-Page"; // 你的仓库名
const FILE_PATH = "links.json";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const token = env.GH_TOKEN;
    const correctPassword = env.ADMIN_PASSWORD;

    // 校验自定义密码
    if (!body.password || body.password !== correctPassword) {
      return new Response(JSON.stringify({ success: false, error: "管理密码错误！" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 从 GitHub 获取当前 links.json 内容和 sha
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "Cloudflare-Pages",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!getRes.ok) {
      return new Response(JSON.stringify({ success: false, error: "读取 GitHub 仓库 links.json 失败，请检查 GH_TOKEN 配置" }), { status: 500 });
    }

    const fileData = await getRes.json();
    let currentContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));

    // 执行删除或添加
    if (body.action === "delete") {
      const { section, url } = body;
      const targetSec = currentContent.find(s => s.section === section);
      if (targetSec && targetSec.items) {
        targetSec.items = targetSec.items.filter(item => item.url !== url);
      }
    } else {
      // 默认添加
      const { section, title, url, desc, intranet } = body;
      let targetSec = currentContent.find(s => s.section === section);
      if (!targetSec) {
        targetSec = { section: section, items: [] };
        currentContent.push(targetSec);
      }
      const newItem = { title, url, desc: desc || "" };
      if (intranet) newItem.intranet = intranet;
      targetSec.items.push(newItem);
    }

    // 提交回 GitHub
    const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2))));
    const commitMsg = body.action === "delete" ? `Delete link via Web Admin` : `Add ${body.title} via Web Admin`;

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "Cloudflare-Pages",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: commitMsg,
        content: updatedBase64,
        sha: fileData.sha
      })
    });

    if (putRes.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const err = await putRes.json();
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
}
