# Radar Regulatorio · Alegra

Vigila las entidades fiscales oficiales de los **9 países** donde opera Alegra y le avisa al equipo de **Product Regulation** cuando la norma cambia — para que Producto e Ingeniería actúen antes, no después.

> Construido para el reto técnico de Product Regulation. Fuentes reales y verificables. Corre solo (sin intervención) mediante un cron.

---

## Qué hace (el loop completo)

**Vigila** → **Detecta** → **Interpreta** → **Notifica**, y de paso genera los insumos de producto (RIA · RRD · Gap).

1. **Vigila** fuentes oficiales (SAT, DIAN, SUNAT, DGII, Hacienda, DGI, SENIAT, ARCA, AEAT). Solo fuentes oficiales, nunca intermediarios.
2. **Detecta** un cambio comparando el contenido actual contra el último snapshot guardado (diff a nivel de texto).
3. **Interpreta** con Claude (Haiku): qué implica el cambio para el producto, no solo un resumen. Etiqueta los **productos afectados** (Facturación, Nómina, POS, …).
4. **Notifica** a **Google Chat** (la herramienta real de Alegra), enrutando al espacio del squad del producto afectado, y lo muestra en el dashboard.

---

## Despliegue en 3 pasos (copiar, pegar, desplegar)

```bash
# 1) Instala
npm install

# 2) Corre local
npm run dev            # http://localhost:3000

# 3) Despliega
npx vercel             # o conecta el repo en vercel.com
```

**No necesitas configurar nada para verlo funcionando.** El radar arranca **poblado con datos reales** (SAT México y DIAN Colombia) gracias a un seed con degradación elegante. Luego conectas servicios de a uno:

| Variable | Para qué | Si falta… |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Persistir snapshots/cambios y detectar entre corridas | Usa datos seed (en memoria) |
| `ANTHROPIC_API_KEY` | Interpretar el cambio con IA | Usa una interpretación base |
| `GOOGLE_CHAT_WEBHOOK` | Avisar al equipo por Google Chat | El cambio igual aparece en el dashboard |
| `CRON_SECRET` | Proteger el endpoint del cron | El cron corre sin auth |

Para persistencia real: crea un proyecto en Supabase y corre `supabase/schema.sql` en su SQL Editor. Copia la URL y la *service key* al `.env`.

---

## "¿Tengo que correrlo manual?" — No.

El corazón es un **Vercel Cron** (`vercel.json`) que llama solo a `/api/scan` dos veces al día. Tú no tocas nada después de desplegar. El botón **«Revisar ahora»** del dashboard es solo un extra para forzar una pasada (útil cuando sabes que viene una reforma) y para el demo.

Cambia la frecuencia editando el `schedule` en `vercel.json` (formato cron).

---

## Cómo agregar un país (escalabilidad)

Agrega un objeto a `lib/sources.ts` con su entidad oficial, su URL y los productos que puede impactar. Nada más cambia. Cuando escribas el parser de esa fuente, cambia su `adapter` de `"seed-only"` a `"html"` y el radar empieza a vigilarla en vivo.

**Qué se rompe primero al escalar** (honestidad de ingeniería): cada fuente tiene su propio formato — el SAT publica un Excel (fácil de comparar), la DIAN publica PDFs y resoluciones (difícil), y una gaceta oficial es HTML con ruido. El adaptador por fuente no es "una URL más": es una URL + un parser + una definición de qué significa "cambió" para ese formato. Por eso el MVP vigila en vivo las fuentes más limpias y deja el resto configurado bajo el mismo patrón.

---

## Mapa al reto

- **Parte 1 — herramienta corriendo:** este repo desplegado. Fuente real (`lib/sources.ts`), detección (`lib/engine.ts` → `detectChange`), interpretación (`interpret`), output accesible (dashboard + Google Chat).
- **Parte 2 — RIA / RRD / Gap:** se generan por cambio y se ven en el panel de detalle («Documento técnico»). El seed trae los del caso SAT y DIAN completos.
- **Parte 3 — reflexión:** ver sección de escalabilidad arriba.

## Estructura

```
app/            página, layout, estilos y ruta /api/scan (cron + manual)
components/     Dashboard.tsx (toda la UI)
lib/            sources (registro), engine (detectar/interpretar/notificar),
                store (Supabase-o-seed), seed (datos reales), types
supabase/       schema.sql
vercel.json     configuración del cron
```

## Guion sugerido para el video (5 min)

1. Abre el dashboard: 9 países, semáforo, todo poblado. (30s)
2. Dale a **«Revisar ahora»**: se detecta el cambio del SAT en vivo → notificación. (45s)
3. Abre el detalle de México: qué cambió / qué significa / qué hacer → **RIA/RRD/Gap** → **cómo se avisó por Google Chat**. (90s)
4. Muestra `lib/sources.ts` y explica cómo se agrega un país + `vercel.json` (corre solo). (60s)
5. Cierra con la reflexión de escalabilidad. (45s)
