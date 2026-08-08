import { Change, Notification, Snapshot } from "./types";

// -----------------------------------------------------------------------------
// SEED — dos casos REALES, verificables y del último mes (2026).
// El reto permite trabajar sobre un cambio ya publicado. Estos dos quedan
// cargados como historial permanente para que SIEMPRE sean tangibles al probar.
// -----------------------------------------------------------------------------

export const SEED_CHANGES: Change[] = [
  {
    id: "mx-cfdi-comercio-exterior-2026-07-17",
    sourceId: "mx",
    severidad: "alta",
    titulo: "El SAT actualizó los catálogos del CFDI 4.0 (comercio exterior)",
    vigencia: "Vigente desde el 17 jul 2026",
    quePaso:
      "El 17 de julio de 2026 el SAT publicó una actualización de los catálogos del CFDI 4.0 (Anexo 20) con nuevos registros de pedimentos y patentes aduanales en el catálogo c_NumPedimentoAduana. Se actualiza el formato Excel; la estructura técnica (XSD) no cambió: cambiaron los valores permitidos.",
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
    analisis: {
      ria: [
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
  {
    id: "co-dian-validacion-consulta-2026-07-28",
    sourceId: "co",
    severidad: "media",
    titulo: "La DIAN activó nuevos mecanismos de validación en la consulta de documentos electrónicos",
    vigencia: "Vigente desde el 28 jul 2026",
    quePaso:
      "Desde el 28 de julio de 2026, la DIAN incorporó nuevos mecanismos de validación de seguridad en la consulta y descarga de documentos electrónicos ('Buscar documento') del Sistema de Factura Electrónica. Ahora se exige el número de identificación del emisor o receptor, y repetirlo al momento de descargar, para reducir accesos automatizados.",
    queSignifica:
      "Las integraciones de Alegra que consultan o descargan documentos desde la plataforma de la DIAN pueden fallar si no se adaptan a los nuevos requisitos de validación. Afecta flujos automatizados de consulta y descarga de documentos electrónicos.",
    queHacer: [
      "Revisar las integraciones que consultan o descargan documentos en el portal de la DIAN.",
      "Adaptar el flujo para enviar el número de identificación requerido (y repetirlo en la descarga).",
      "Probar la consulta 'Buscar documento' con los nuevos requisitos antes de la fecha de vigencia.",
    ],
    productos: ["Facturación electrónica", "API e Integraciones", "POS"],
    antes: {
      etiqueta: "Hasta el 27 jul 2026",
      texto: "Consulta y descarga de documentos electrónicos sin validación adicional de identificación.",
    },
    despues: {
      etiqueta: "Desde el 28 jul 2026",
      texto: "La consulta exige el número de identificación (emisor/receptor) y repetirlo al descargar; se activan validaciones contra accesos automatizados.",
    },
    diff:
      "~ Nuevas validaciones de seguridad en 'Buscar documento'.\n+ Se exige número de identificación del emisor/receptor.\n+ Repetir el número al descargar el documento.",
    detectadoEn: "2026-07-28T10:00:00Z",
    analisis: {
      ria: [
        ["Cambio", "La DIAN activó nuevos mecanismos de validación de seguridad en la consulta/descarga de documentos electrónicos del Sistema de Factura Electrónica, vigentes desde el 28-jul-2026."],
        ["A quién afecta", "Usuarios e integraciones de Alegra en Colombia que consultan o descargan documentos electrónicos desde la plataforma de la DIAN."],
        ["Severidad", "Media — afecta flujos automatizados de consulta/descarga; requiere ajuste de integraciones."],
        ["Riesgo si no actuamos", "Consultas o descargas que fallen desde integraciones, con impacto en procesos que dependen de recuperar documentos ante la DIAN."],
      ],
      rrd: [
        ["R1", "Adaptar las integraciones de consulta/descarga para enviar el número de identificación del emisor o receptor."],
        ["R2", "Repetir el número de identificación en el paso de descarga, según el nuevo requisito."],
        ["R3", "Manejar los mensajes de validación anti-automatización sin romper el flujo del usuario."],
      ],
      rrdAccept:
        "Criterio de aceptación: la consulta y descarga de documentos desde la integración funciona con los nuevos requisitos, sin errores de validación.",
      gap: {
        actual: "Integraciones de consulta/descarga sin el número de identificación requerido (por confirmar con Ingeniería).",
        requerido: "Flujo de consulta/descarga alineado a las validaciones de la DIAN vigentes desde el 28-jul-2026.",
        brecha: "Falta enviar (y repetir) el número de identificación y manejar las nuevas validaciones.",
        esfuerzo: "Medio: ajuste de integraciones + pruebas contra el portal (a validar con el equipo).",
        prioridad: "Media–alta (ya vigente).",
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
  {
    id: "n-co-2026-07-28",
    sourceId: "co",
    tone: "alert",
    titulo: "Colombia · DIAN",
    detalle: "Nuevas validaciones en la consulta de documentos electrónicos, vigente 28 jul 2026.",
    cuando: "28 jul 2026",
    leido: false,
  },
];
