export type Comision = {
  codigoMateria: string   // "3627"
  descripcion: string     // "ALGEBRA Y GEOMETRIA ANALITICA I"
  codComision: string     // "1300"
  // Format: [Day(s)][HHstart]a[HHend]
  // Single day: "Lu08a12" = Lunes 08-12
  // Multi-day:  "LuVi12a14" = Lunes y Viernes 12-14
  dias: string
  modalidad: string       // "Presencial" | "Semipresencial" | "Sincrónica Teams" | "Virtual" | "A Distancia" | "Recursantes"
  sede: string            // "San Justo" | "Ituzaingó"
  observacion?: string
}

export type OfertaData = {
  universidad: string     // "UNLaM"
  carrera: string         // "Ingeniería Informática"
  periodo: string         // "1er semestre 2026"
  comisiones: Comision[]
}

// Parsed representation of one time block from a dias string
export type HorarioParsed = {
  dia: string       // "Lu" | "Ma" | "Mi" | "Ju" | "Vi" | "Sa"
  inicio: number    // 8
  fin: number       // 12
}

// One full combination of comisiones (one per selected materia)
export type Combinacion = Comision[]

export const MAX_MATERIAS = 8
