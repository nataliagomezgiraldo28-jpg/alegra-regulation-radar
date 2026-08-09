import { NextResponse } from "next/server";
import { parseNormas } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnóstico: llama a Firecrawl y muestra qué devolvió y cuántas normas se parsearon.
// Abrir en el navegador: /api/debug-dian
export async function GET() {
  const url = "https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/normativa.aspx";
  const key = process.env.FIRECRAWL_API_KEY;
  const out: any = { hasKey: !!key, keyPrefix: key ? key.slice(0, 5) + "..." : null };

  if (!key) {
    out.error = "No hay FIRECRAWL_API_KEY en el entorno.";
    return NextResponse.json(out);
  }

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(45000),
    });
    out.httpStatus = res.status;
    const data: any = await res.json();
    out.topLevelKeys = Object.keys(data || {});
    out.success = data?.success;
    out.dataKeys = data?.data ? Object.keys(data.data) : null;
    const md: string = data?.data?.markdown || data?.markdown || "";
    out.markdownLength = md.length;
    out.markdownSample = md.slice(0, 600);
    if (data?.error) out.firecrawlError = data.error;

    const normas = parseNormas(md);
    out.normasCount = normas.length;
    out.primerasNormas = normas.slice(0, 5).map((n) => ({ titulo: n.titulo, anio: n.anio }));
  } catch (e) {
    out.exception = (e as Error).message;
  }

  return NextResponse.json(out);
}
