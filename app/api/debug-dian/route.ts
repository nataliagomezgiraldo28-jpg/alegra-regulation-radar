import { NextResponse } from "next/server";
import { parseNormas } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnóstico: prueba varias páginas de la DIAN con Firecrawl y muestra
// cuántas normas parsea cada una y los años, para elegir la mejor fuente.
// Abrir en el navegador: /api/debug-dian
const URLS = [
  { nombre: "micrositio-normatividad", url: "https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/" },
  { nombre: "portal-normativa", url: "https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/normativa.aspx" },
  { nombre: "normograma", url: "https://normograma.dian.gov.co/dian/" },
];

async function probar(key: string, url: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(40000),
    });
    const data: any = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || "";
    const normas = parseNormas(md);
    const anios = Array.from(new Set(normas.map((n) => n.anio))).sort((a, b) => b - a);
    return {
      httpStatus: res.status,
      markdownLength: md.length,
      normasCount: normas.length,
      aniosEncontrados: anios,
      primeras3: normas.slice(0, 3).map((n) => n.titulo),
      // buscamos señales de 2025-2026 en el texto crudo aunque el parser no las capture
      menciona2025: /\b2025\b/.test(md),
      menciona2026: /\b2026\b/.test(md),
      menciona000202o000227: /000202|000227/.test(md),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function GET() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return NextResponse.json({ error: "No hay FIRECRAWL_API_KEY" });
  const resultados: any = {};
  for (const u of URLS) {
    resultados[u.nombre] = { url: u.url, ...(await probar(key, u.url)) };
  }
  return NextResponse.json(resultados);
}
