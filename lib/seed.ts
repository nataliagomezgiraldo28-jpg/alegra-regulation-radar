import { Change, Notification, Snapshot } from "./types";

// -----------------------------------------------------------------------------
// SEED — datos reales y verificables para que el radar arranque poblado
// aunque no se conecte ningún servicio externo el primer minuto.
//
// Los dos cambios de abajo son REALES y públicos (fuente oficial citada).
// El reto permite trabajar sobre un cambio ya publicado: eso es lo que hacemos.
// -----------------------------------------------------------------------------

export const SEED_CHANGES: Change[] = [
  {
    id: "mx-cfdi-comercio-exterior-2026-07-17",
    sourceId: "mx",
    severidad: "alta",
    titulo: "El SAT cambió el catálogo de comercio exterior del CFDI 4.0",
    vigencia: "Vigente desde el 17 jul 2026",
    quePaso:
      "El SAT publicó una nueva versión de los catálogos del CFDI 4.0 (Anexo 20) con registros nuevos de pedimentos y patentes aduanales. La estructura del archivo (XSD) no cambió: lo que cambió son los valores permitidos.",
    queSignifica:
      "Los clientes de Alegra en México que facturan operaciones de importación o exportación pueden ver rechazado su timbrado si nuestro catálogo está desactualizado. En la práctica: no podrían emitir su factura.",
    queHacer: [
      "Actualizar en el motor de timbrado el catálogo de comercio exterior a la versión vigente del 17 jul 2026.",
      "Validar que las nuevas claves de pedimentos y patentes se puedan seleccionar en el flujo de comercio exterior.",
      "Probar un CFDI de comercio exterior en el ambiente de pruebas del PAC antes de liberar.",
    ],
    productos: ["Facturación electrónica", "POS", "API e Integraciones"],
    diff:
      "+ Se agregan registros al catálogo de pedimentos y patentes aduanales (comercio exterior).\n= Estructura XSD sin cambios.",
    detectadoEn: new Date().toISOString(),
    analisis: {
      ria: [
        ["Cambio", "El SAT actualizó los catálogos del Anexo 20 (CFDI 4.0): nuevos registros en pedimentos y patentes aduanales. Estructura XSD sin cambios."],
        ["Obligatoriedad", "Vigente desde el 17 de julio de 2026 (aplicación inmediata)."],
        ["A quién afecta", "Usuarios de Alegra en México que emiten CFDI con operaciones de comercio exterior."],
        ["Severidad", "Alta — un catálogo desactualizado genera rechazo de timbrado; el usuario no puede facturar."],
        ["Riesgo si no actuamos", "Facturas rechazadas, incumplimiento del usuario, aumento de tickets y riesgo reputacional."],
      ],
      rrd: [
        ["R1", "El motor de timbrado debe consumir la versión vigente del catálogo (fecha ≥ 2026-07-17)."],
        ["R2", "Las nuevas claves de pedimentos y patentes aduanales deben quedar disponibles para selección y validación en el flujo de comercio exterior."],
        ["R3", "La validación previa debe rechazar claves obsoletas y aceptar las nuevas antes de enviar al PAC."],
        ["R4", "Automatizar la descarga del catálogo desde la URL oficial del SAT para no depender de carga manual."],
      ],
      rrdAccept:
        "Criterio de aceptación: un CFDI de comercio exterior con las nuevas claves timbra sin error en el ambiente de pruebas del PAC.",
      gap: {
        actual: "Catálogo cargado en versión anterior al 17-jul-2026 (por confirmar con Ingeniería).",
        requerido: "Catálogo vigente del 17-jul-2026 con los nuevos registros.",
        brecha: "Faltan los registros nuevos de pedimentos y patentes aduanales en el catálogo del producto.",
        esfuerzo: "Bajo–medio: actualización de datos + pruebas de timbrado (a validar con el equipo).",
        prioridad: "Alta (ya vigente).",
      },
    },
  },
  {
    id: "co-dian-res-202-227-2025",
    sourceId: "co",
    severidad: "media",
    titulo: "La DIAN reforzó validaciones y datos obligatorios en facturación electrónica",
    vigencia: "Res. 000202 y 000227 de 2025",
    quePaso:
      "La DIAN, con la Resolución 000202 de 2025, ajustó la regulación de facturación electrónica (base 000165 de 2023): reforzó los mecanismos de validación y los datos obligatorios de los documentos electrónicos. La Resolución 000227 de 2025 consolidó la normativa tributaria aplicable.",
    queSignifica:
      "Pueden cambiar reglas de validación y campos obligatorios del documento electrónico en Colombia. Si el producto no se ajusta, ciertos documentos podrían no validar ante la DIAN.",
    queHacer: [
      "Revisar las reglas de validación y campos obligatorios contra la Res. 000202 de 2025.",
      "Verificar la interoperabilidad entre factura, documento equivalente y nómina electrónica.",
      "Confirmar qué reglas ya están cubiertas por el producto y cuáles no.",
    ],
    productos: ["Facturación electrónica", "Nómina electrónica", "POS"],
    diff: "~ Reglas de validación reforzadas.\n~ Campos obligatorios ampliados en el documento electrónico.",
    detectadoEn: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    analisis: {
      ria: [
        ["Cambio", "La Res. 000202/2025 modificó la 000165/2023: refuerzo de validaciones y datos obligatorios. La 000227/2025 consolidó la normativa."],
        ["A quién afecta", "Usuarios de Alegra en Colombia que emiten factura electrónica y documentos equivalentes."],
        ["Severidad", "Media — cambios de validación y campos; requiere revisión de reglas del documento electrónico."],
        ["Riesgo si no actuamos", "Documentos que no validen ante la DIAN y usuarios que no puedan cumplir en fecha."],
      ],
      rrd: [
        ["R1", "Ajustar reglas de validación del documento electrónico a lo dispuesto en la Res. 000202/2025."],
        ["R2", "Actualizar los campos obligatorios reforzados en la generación del documento."],
        ["R3", "Verificar interoperabilidad entre factura, documento equivalente y nómina."],
      ],
      rrdAccept:
        "Criterio de aceptación: los documentos electrónicos validan sin rechazo bajo las reglas de la Res. 000202/2025.",
      gap: {
        actual: "Reglas de validación previas a la Res. 000202/2025 (por confirmar con Ingeniería).",
        requerido: "Reglas y campos obligatorios alineados a la Res. 000202 y 000227 de 2025.",
        brecha: "Diferencias en validaciones y datos obligatorios por mapear regla por regla.",
        esfuerzo: "Medio: mapeo de reglas + ajustes de validación (a validar con el equipo).",
        prioridad: "Media–alta.",
      },
    },
  },
];

// Fechas "sin cambios desde" para las fuentes en monitoreo (verde).
export const SEED_OK_DESDE: Record<string, string> = {
  pe: "28 jul 2026",
  do: "25 jul 2026",
  cr: "30 jul 2026",
  pa: "24 jul 2026",
  ve: "21 jul 2026",
  ar: "29 jul 2026",
  es: "31 jul 2026",
};

// Snapshots base (hash del contenido capturado). En una corrida real, el radar
// compara el contenido actual de la fuente contra este hash para detectar cambios.
export const SEED_SNAPSHOTS: Snapshot[] = [
  { sourceId: "mx", hash: "seed-mx-baseline", texto: "baseline capturado 10 jul 2026", capturadoEn: "2026-07-10T12:00:00Z" },
];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n-co",
    sourceId: "co",
    tone: "alert",
    titulo: "Colombia · DIAN",
    detalle: "Reforzó validaciones y datos obligatorios en facturación electrónica.",
    cuando: "hace 6 h",
    leido: false,
  },
  {
    id: "n-mx",
    sourceId: "mx",
    tone: "alert",
    titulo: "México · SAT",
    detalle: "Cambio detectado en el catálogo de comercio exterior del CFDI 4.0.",
    cuando: "ahora",
    leido: false,
  },
];
