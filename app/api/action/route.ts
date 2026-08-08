import { NextResponse } from "next/server";
import { getState, setEstadoCambio, deleteChange } from "@/lib/store";
import { simulateChange } from "@/lib/engine";
import { sourceById } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/action  { accion, id?, sourceId? }
// accion: "atender" | "archivar" | "reabrir" | "eliminar" | "simular"
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { accion, id, sourceId } = body;

  try {
    if (accion === "atender" && id) await setEstadoCambio(id, "atendido");
    else if (accion === "archivar" && id) await setEstadoCambio(id, "archivado");
    else if (accion === "reabrir" && id) await setEstadoCambio(id, "activo");
    else if (accion === "eliminar" && id) await deleteChange(id);
    else if (accion === "simular" && sourceId) {
      const src = sourceById(sourceId);
      if (src) await simulateChange(src);
    } else {
      return NextResponse.json({ ok: false, error: "acción inválida" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  const state = await getState();
  return NextResponse.json({ ok: true, state });
}
