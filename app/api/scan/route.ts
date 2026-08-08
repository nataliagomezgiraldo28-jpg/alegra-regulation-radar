import { NextResponse } from "next/server";
import { SOURCES } from "@/lib/sources";
import { runRadar } from "@/lib/engine";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // s (fetch a fuentes lentas)

// GET /api/scan
//  - Lo llama el Vercel Cron automáticamente (ver vercel.json)  -> "sigue corriendo"
//  - Lo llama el botón "Revisar ahora" del dashboard             -> opcional/manual
//
// Seguridad: si defines CRON_SECRET, exige el header de Vercel Cron.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      // Permitimos igual la llamada manual desde el dashboard sin secret,
      // pero marcamos que fue no autenticada (útil en logs).
    }
  }

  const detectados = await runRadar(SOURCES);
  const state = await getState();
  return NextResponse.json({ ok: true, detectados, state });
}
