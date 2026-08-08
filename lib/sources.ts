import { Source } from "./types";

// -----------------------------------------------------------------------------
// REGISTRO DE FUENTES  (el corazón de la escalabilidad)
// Agregar un país o una entidad = agregar un objeto aquí. Nada más cambia.
// Solo fuentes oficiales. URLs apuntan a la página exacta que se vigila.
//
// adapter:
//   "html"      -> el radar la lee en vivo y detecta cambios (diff real).
//   "seed-only" -> se muestra en monitoreo (sin lectura en vivo por ahora).
// capa:
//   "tecnica"   -> resoluciones, anexos, catálogos (señal accionable).
//   "temprana"  -> gacetas, proyectos de decreto, congreso (señal anticipada).
// -----------------------------------------------------------------------------

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
    fuenteNombre: "DIAN · Sistema de Factura Electrónica (normatividad)",
    fuenteUrl: "https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "Nómina electrónica", "POS", "API e Integraciones"],
    adapter: "html",
  },
  {
    id: "cohacienda",
    pais: "Colombia",
    bandera: "🇨🇴",
    entidad: "MinHacienda · Proyectos de decreto",
    fuenteNombre: "Ministerio de Hacienda · Proyectos de decreto 2026",
    fuenteUrl: "https://www.minhacienda.gov.co/normativa/proyectos-de-decretos/2026",
    capa: "temprana",
    productosPosibles: ["Facturación electrónica", "Contabilidad", "Nómina electrónica"],
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
    fuenteUrl: "https://www.sunat.gob.pe/legislacion/superin/2024/index.html",
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
    fuenteUrl: "https://dgii.gov.do/cumplimientoTributario/facturacionElectronica/Paginas/default.aspx",
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
    fuenteUrl: "https://www.hacienda.go.cr/ATV/ComprobanteElectronico/frmInicio.aspx",
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
    fuenteUrl: "https://dgi.mef.gob.pa/FacturaElectronica.php",
    capa: "tecnica",
    productosPosibles: ["Facturación electrónica", "POS"],
    adapter: "seed-only",
  },
  {
    id: "ve",
    pais: "Venezuela",
