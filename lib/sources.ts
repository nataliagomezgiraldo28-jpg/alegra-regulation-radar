import { Source } from "./types";

// -----------------------------------------------------------------------------
// REGISTRO DE FUENTES  (el corazón de la escalabilidad)
//
// Agregar un país = agregar un objeto aquí. Nada más cambia.
// Cada fuente apunta SOLO a una entidad oficial y verificable.
//
// adapter:
//   "html"      -> el radar descarga la página y compara su contenido (diff real).
//   "seed-only" -> por ahora se muestra en monitoreo con su snapshot base seedeado.
//                  (Se "promueve" a "html" cuando se escribe/valida su parser.)
// -----------------------------------------------------------------------------

// Productos reales de Alegra (nombres cortos para etiquetas y ruteo por squad).
export const PRODUCTOS = [
  "Facturación electrónica",
  "Nómina electrónica",
  "POS",
  "Contabilidad",
  "Software para Contadores",
  "Factura en Salud",
  "Alegra Enterprise",
  "API e Integraciones",
] as const;

export const SOURCES: Source[] = [
  {
    id: "co",
    pais: "Colombia",
    bandera: "🇨🇴",
    entidad: "DIAN · Fact. electrónica",
    fuenteNombre: "DIAN · Documentación técnica",
    fuenteUrl:
      "https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/documentacion-tecnica.aspx",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "Nómina electrónica", "POS"],
    adapter: "html",
  },
  {
    id: "mx",
    pais: "México",
    bandera: "🇲🇽",
    entidad: "SAT · Anexo 20",
    fuenteNombre: "SAT · Catálogos CFDI 4.0 (Anexo 20)",
    fuenteUrl: "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "POS", "API e Integraciones"],
    adapter: "html",
  },
  {
    id: "pe",
    pais: "Perú",
    bandera: "🇵🇪",
    entidad: "SUNAT · CPE",
    fuenteNombre: "SUNAT · Comprobantes de pago electrónicos",
    fuenteUrl: "https://www.sunat.gob.pe",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "POS"],
    adapter: "seed-only",
  },
  {
    id: "do",
    pais: "Rep. Dominicana",
    bandera: "🇩🇴",
    entidad: "DGII · e-CF",
    fuenteNombre: "DGII · Facturación electrónica (e-CF)",
    fuenteUrl: "https://dgii.gov.do",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "Contabilidad"],
    adapter: "seed-only",
  },
  {
    id: "cr",
    pais: "Costa Rica",
    bandera: "🇨🇷",
    entidad: "Hacienda · FE 4.4",
    fuenteNombre: "Ministerio de Hacienda · Comprobantes electrónicos",
    fuenteUrl: "https://www.hacienda.go.cr",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "POS"],
    adapter: "seed-only",
  },
  {
    id: "pa",
    pais: "Panamá",
    bandera: "🇵🇦",
    entidad: "DGI · SFEP",
    fuenteNombre: "DGI · Sistema de Facturación Electrónica (SFEP)",
    fuenteUrl: "https://dgi.mef.gob.pa",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "POS"],
    adapter: "seed-only",
  },
  {
    id: "ve",
    pais: "Venezuela",
    bandera: "🇻🇪",
    entidad: "SENIAT · Facturación",
    fuenteNombre: "SENIAT · Facturación",
    fuenteUrl: "http://www.seniat.gob.ve",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "Contabilidad"],
    adapter: "seed-only",
  },
  {
    id: "ar",
    pais: "Argentina",
    bandera: "🇦🇷",
    entidad: "ARCA · Comprobantes",
    fuenteNombre: "ARCA (ex-AFIP) · Comprobantes electrónicos",
    fuenteUrl: "https://www.arca.gob.ar",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "API e Integraciones"],
    adapter: "seed-only",
  },
  {
    id: "es",
    pais: "España",
    bandera: "🇪🇸",
    entidad: "AEAT · Fact. electrónica",
    fuenteNombre: "AEAT · Facturación electrónica",
    fuenteUrl: "https://sede.agenciatributaria.gob.es",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "API e Integraciones"],
    adapter: "seed-only",
  },
];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);
