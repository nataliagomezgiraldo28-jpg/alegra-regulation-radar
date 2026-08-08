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
    antes: {
      etiqueta: "Hasta el 16 jul 2026",
      texto: "Catálogo de comercio exterior del CFDI 4.0 sin los registros nuevos de pedimentos y patentes aduanales.",
    },
    despues: {
      etiqueta: "Desde el 17 jul 2026",
      texto: "Catálogo con los nuevos registros de pedimentos y patentes aduanales. La estructura del archivo (XSD) se mantiene igual.",
    },
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
      "Revisar las reglas de validación y campos obligatorios
