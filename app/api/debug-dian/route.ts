import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const URLS = [
  { n: "novedades-boletines", url: "https://normograma.dian.gov.co/dian/compilacion/novedades_boletines.html" },
  { n: "novedades-tributario", url: "https://normograma.dian.gov.co/dian/compilacion/nyb_novedades_derecho_tributario.html" },
];

async function probar(key: string, url: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(45000),
    });
    const data: any = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || "";
    const links = (md.match(/\[[^\]]+\]\([^\)]+\)/g) || []).slice(0, 15);
    return {
      httpStatus: res.status,
      markdownLength: md.length,
      menciona2026: /\b2026\b/.test(md),
      menciona2025: /\b2025\b/.test(md),
      primerosLinks: links,
      muestra: md.slice(0, 1200),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function GET() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return NextResponse.json({ error: "No hay FIRECRAWL_API_KEY" });
  const out: any = {};
  for (const u of URLS) out[u.n] = { url: u.url, ...(await probar(key, u.url)) };
  return NextResponse.json(out);
}
