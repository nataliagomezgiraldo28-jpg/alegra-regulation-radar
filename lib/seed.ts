import { Change, Notification, Snapshot } from "./types";

// -----------------------------------------------------------------------------
// SEED — caso REAL, verificable y del último mes (2026).
// El reto permite trabajar sobre un cambio ya publicado. Queda cargado como
// historial permanente para que SIEMPRE sea tangible al probar.
// La DIAN ahora se lee EN VIVO (vía Firecrawl), no desde este seed.
// -----------------------------------------------------------------------------

export const SEED_CHANGES: Change[] = [
  {
    id: "mx-cfdi-comercio-exterior-2026-07-17",
    sourceId: "mx",
    severidad: "alta",
    titulo: "El SAT actualizó los catálogos del CFDI 4.0 (comercio exterior)",
    vigencia: "Vigente desde el 17 jul 2026",
    quePaso:
      "El 17 de julio de 2026 el SAT publicó una actualización de los catálogos del CFDI 4.0 (Anexo 20) con nuevos registros de pedimentos y patentes aduanales en el catálogo c_NumPedimentoAduana. Se actualiza el formato Excel; la estructura técnica (XSD) no cambió: cambiaron los valores permitidos. Referencia oficial: SAT · Anexo 20 (catálogos del CFDI 4.0), actualización publicada el 17 de julio de 2026.",
    queSignifica:
      "Los clientes de Alegra en México que facturan operaciones de importación o exportación pueden ver rechazado su timbrado si el catálogo está desactualizado. Sin el catálogo al día, no pueden emitir su CFDI de comercio exterior.",
    queHacer: [
      "Actualizar el catálogo c_NumPedimentoAduana del CFDI 4.0 a la versión vigente del 17 jul 2026.",
      "Validar que las nuevas claves de pedimentos y patentes se puedan seleccionar en el flujo de comercio exterior.",
      "Probar un CFDI de comercio exterior en el ambiente de pruebas del PAC antes de liberar.",
    ],
    productos: ["Facturación electrónica", "POS", "API e Integraciones"],
    antes: {
      etiqueta: "Hasta el 16 jul 2026",
      texto: "Catálogo c_NumPedimentoAduana sin los registros nuevos de pedimentos y patentes aduanales.",
    },
    despues: {
      etiqueta: "Desde el 17 jul 2026",
      texto: "Catálogo con los nuevos registros de pedimentos y patentes aduanales. Estructura XSD sin cambios.",
    },
    diff:
      "+ Nuevos registros en c_NumPedimentoAduana (pedimentos y patentes aduanales, comercio exterior).\n= Estructura XSD del CFDI 4.0 sin cambios.",
    detectadoEn: "2026-07-17T09:00:00Z",
    documentoTipo: "Anexo técnico (Catálogos CFDI 4.0)",
    documentoNumero: "Anexo 20 · Apéndice 4",
    documentoNombre: "SAT · Anexo 20 — Catálogos del CFDI 4.0 (Apéndice 4 de la Guía de llenado)",
    documentoUrl: "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm",
    linkDirecto: true,
    analisis: {
      ria: [
        ["Fuente y referencia", "SAT · Anexo 20 (catálogos CFDI 4.0). Actualización del 17 jul 2026. Descarga oficial: omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm"],
        ["Cambio", "El SAT actualizó los catálogos del Anexo 20 (CFDI 4.0): nuevos registros en c_NumPedimentoAduana (pedimentos y patentes aduanales). Estructura XSD sin cambios."],
        ["Obligatoriedad", "Vigente y obligatorio desde el 17 de julio de 2026."],
        ["A quién afecta", "Usuarios de Alegra en México que emiten CFDI con operaciones de importación o exportación."],
        ["Severidad", "Alta — un catálogo desactualizado genera rechazo de timbrado ante el PAC; el usuario no puede facturar."],
        ["Riesgo si no actuamos", "Facturas rechazadas, incumplimiento del usuario, aumento de tickets de soporte y riesgo reputacional."],
      ],
      rrd: [
        ["R1", "El motor de timbrado debe consumir la versión vigente del catálogo c_NumPedimentoAduana (fecha ≥ 2026-07-17)."],
        ["R2", "Las nuevas claves de pedimentos y patentes deben quedar disponibles para selección y validación en el flujo de comercio exterior."],
        ["R3", "La validación previa debe rechazar claves obsoletas y aceptar las nuevas antes de enviar al PAC."],
        ["R4", "Automatizar la descarga del catálogo desde la URL oficial del SAT (Anexo 20) para no depender de carga manual."],
      ],
      rrdAccept:
        "Criterio de aceptación: un CFDI de comercio exterior con las nuevas claves timbra sin error en el ambiente de pruebas del PAC.",
      gap: {
        actual: "Catálogo c_NumPedimentoAduana en versión anterior al 17-jul-2026 (por confirmar con Ingeniería).",
        requerido: "Catálogo vigente del 17-jul-2026 con los nuevos registros.",
        brecha: "Faltan los registros nuevos de pedimentos y patentes aduanales en el catálogo del producto.",
        esfuerzo: "Bajo–medio: actualización de datos del catálogo + pruebas de timbrado (a validar con el equipo).",
        prioridad: "Alta (ya vigente).",
      },
    },
  },
];

// Fechas "sin cambios desde" para las fuentes en monitoreo (verde).
export const SEED_OK_DESDE: Record<string, string> = {
  cohacienda: "vigilando proyectos de decreto",
  pe: "28 jul 2026",
  do: "25 jul 2026",
  cr: "30 jul 2026",
  pa: "24 jul 2026",
  ve: "21 jul 2026",
  ar: "29 jul 2026",
  es: "31 jul 2026",
};

export const SEED_SNAPSHOTS: Snapshot[] = [];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n-mx-2026-07-17",
    sourceId: "mx",
    tone: "alert",
    titulo: "México · SAT",
    detalle: "Actualización de catálogos CFDI 4.0 (comercio exterior), vigente 17 jul 2026.",
    cuando: "17 jul 2026",
    leido: false,
  },
];
