// Tipos compartidos del Radar Regulatorio.

export type Estado = "ok" | "base" | "cambio";
export type Severidad = "alta" | "media" | "baja";

// Una fuente = un país + su entidad oficial + cómo se vigila.
export interface Source {
  id: string;                 // "co", "mx", ...
  pais: string;
  bandera: string;            // emoji
  entidad: string;            // "DIAN · Fact. electrónica"
  fuenteNombre: string;       // nombre largo de la fuente oficial
  fuenteUrl: string;          // URL oficial que se vigila
  capa: "tecnica" | "temprana"; // técnica = anexo/catálogo; temprana = gaceta/congreso
  // Productos de Alegra que esta fuente puede impactar (para ruteo por squad).
  productosPosibles: string[];
  // Adaptador de detección: cómo extraer el contenido comparable de la fuente.
  adapter: "html" | "seed-only";
}

// Un "documento técnico" generado a partir del cambio (Parte 2 del reto).
export interface Analisis {
  ria: [string, string][];    // [etiqueta, contenido]
  rrd: [string, string][];    // [id requerimiento, texto]
  rrdAccept: string;
  gap: {
    actual: string;
    requerido: string;
    brecha: string;
    esfuerzo: string;
    prioridad: string;
  };
}

// Un cambio detectado en una fuente.
export interface Change {
  id: string;
  sourceId: string;
  severidad: Severidad;
  titulo: string;
  vigencia: string;
  quePaso: string;             // qué cambió (plano)
  queSignifica: string;        // impacto para el usuario (plano)
  queHacer: string[];          // acciones para Producto
  productos: string[];         // productos afectados (subset de productosPosibles)
  diff?: string;               // extracto del diff detectado
  detectadoEn: string;         // ISO date
  analisis: Analisis;          // RIA / RRD / Gap
  atendido?: boolean;
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

// Estado que consume el dashboard.
export interface RadarState {
  sources: (Source & { estado: Estado; ultimaRevision: string; okDesde?: string })[];
  changes: Change[];
  notifications: Notification[];
  meta: { ultimaRevision: string; proxima: string; modo: "seed" | "supabase" };
}
