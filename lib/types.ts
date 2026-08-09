// Tipos compartidos del Alegra Regulation Radar.

export type Estado = "ok" | "base" | "cambio";
export type Severidad = "alta" | "media" | "baja";
export type EstadoCambio = "activo" | "atendido" | "archivado";

export interface Source {
  id: string;
  pais: string;
  bandera: string;
  entidad: string;
  fuenteNombre: string;
  fuenteUrl: string;
  capa: "tecnica" | "temprana";
  productosPosibles: string[];
  adapter: "html" | "seed-only" | "firecrawl";
}

export interface Analisis {
  ria: [string, string][];
  rrd: [string, string][];
  rrdAccept: string;
  gap: { actual: string; requerido: string; brecha: string; esfuerzo: string; prioridad: string };
}

export interface Change {
  id: string;
  sourceId: string;
  severidad: Severidad;
  titulo: string;
  vigencia: string;
  quePaso: string;
  queSignifica: string;
  queHacer: string[];
  productos: string[];
  antes?: { etiqueta: string; texto: string };
  despues?: { etiqueta: string; texto: string };
  diff?: string;
  detectadoEn: string;
  analisis: Analisis;
  estadoCambio?: EstadoCambio;
  simulacion?: boolean;
  documentoTipo?: string;
  documentoNumero?: string;
  documentoNombre?: string;
  documentoUrl?: string;
  linkDirecto?: boolean;
}

export interface Snapshot {
  sourceId: string;
  hash: string;
  texto: string;
  capturadoEn: string;
}

export interface Notification {
  id: string;
  sourceId: string;
  tone: "alert" | "warn" | "ok";
  titulo: string;
  detalle: string;
  cuando: string;
  leido: boolean;
}

export interface SourceView extends Source {
  estado: Estado;
  ultimaRevision: string;
  okDesde?: string;
  textoExtraido?: string;
  fuenteCapturadaEn?: string;
  totalHistorial: number;
}

export interface RadarState {
  sources: SourceView[];
  changes: Change[];
  notifications: Notification[];
  meta: { ultimaRevision: string; proxima: string; modo: "seed" | "supabase" };
}
