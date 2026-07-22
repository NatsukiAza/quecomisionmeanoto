// @ts-check
const fs = require('fs')
const path = require('path')
const { PDFParse } = require('pdf-parse')

// Matches single or multi-day patterns: "Lu08a12", "LuVi12a14", "LuMiVi08a12"
const DIAS_RE = /(?:Lu|Ma|Mi|Ju|Vi|Sa){1,3}\d{2}a\d{2}/
const MODALIDADES = [
  'Sincrónica Teams',
  'Semipresencial',
  'A Distancia',
  'Recursantes',
  'Aula Virtual',
  'Presencial',
  'Virtual',
]

function cleanCell(val) {
  if (!val || typeof val !== 'string') return ''
  // Remove embedded URLs like (https://...)
  return val.replace(/\(https?:\/\/[^)]*\)/g, '').replace(/https?:\/\/\S+/g, '').trim()
}

function extractModalidad(raw) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return { modalidad: 'Presencial' }

  for (const m of MODALIDADES) {
    const ml = m.toLowerCase()
    const lower = trimmed.toLowerCase()
    if (!lower.startsWith(ml)) continue
    const boundary = lower[ml.length]
    if (boundary !== undefined && boundary !== ' ' && boundary !== '\t') continue

    let rest = trimmed.slice(m.length).trim()
    if (rest.toLowerCase() === ml) rest = ''
    else if (rest.toLowerCase().startsWith(ml)) {
      const b2 = rest.toLowerCase()[ml.length]
      if (b2 === undefined || b2 === ' ' || b2 === '\t') {
        rest = rest.slice(m.length).trim()
      }
    }
    return { modalidad: m, observacion: rest || undefined }
  }

  // Exact cell match (table cells often hold modalidad alone)
  for (const m of MODALIDADES) {
    if (trimmed.toLowerCase() === m.toLowerCase()) {
      return { modalidad: m }
    }
  }

  return { modalidad: 'Presencial', observacion: trimmed }
}

function startsWithModalidad(text) {
  const lower = (text || '').trim().toLowerCase()
  return MODALIDADES.some(m => {
    const ml = m.toLowerCase()
    if (!lower.startsWith(ml)) return false
    const next = lower[ml.length]
    return next === undefined || next === ' ' || next === '\t'
  })
}

/**
 * Parse table rows from getTable() result into Comision[]
 * @param {any[][]} rows
 * @returns {import('../lib/types').Comision[]}
 */
function parseTableRows(rows) {
  const comisiones = []
  let currentCodigo = ''
  let currentNombre = ''

  for (const row of rows) {
    // Each row is an array of cell values (strings or null)
    const cells = row.map(c => cleanCell(String(c ?? '')))

    // Expected columns: Código, Descripción, Cod.Comisión, Turno, Días, Modalidad, Sede, Observacion
    // But indices may vary — find the Días column by matching the dias pattern
    const diasIdx = cells.findIndex(c => DIAS_RE.test(c))
    if (diasIdx === -1) {
      // No dias — either materia header, or comisión sin horario (A Distancia)
      const joined = cells.join(' ').trim()
      const sinHorario = joined.match(/^(\d{4})\s+(.+)$/)
      if (sinHorario && currentCodigo && startsWithModalidad(sinHorario[2])) {
        const { modalidad, observacion } = extractModalidad(sinHorario[2])
        let sede = 'San Justo'
        for (const cell of cells) {
          if (/^(San Justo|Ituzaingó|Ituzaingo|Buenos Aires)$/i.test(cell)) {
            sede = cell.replace(/\s+/g, ' ').trim()
            break
          }
        }
        /** @type {import('../lib/types').Comision} */
        const comision = {
          codigoMateria: currentCodigo,
          descripcion: currentNombre,
          codComision: sinHorario[1],
          dias: '',
          modalidad,
          sede,
        }
        if (observacion) comision.observacion = observacion
        comisiones.push(comision)
        continue
      }

      // Try to find materia code (4-digit number)
      const codeMatch = joined.match(/^\s*(\d{4})\s+([A-ZÁÉÍÓÚÑ].+)/)
      if (codeMatch && !startsWithModalidad(codeMatch[2])) {
        currentCodigo = codeMatch[1]
        currentNombre = codeMatch[2].trim()
      } else {
        // Check if any cell has a 4-digit code and the next cell has a materia name
        for (let i = 0; i < cells.length - 1; i++) {
          if (/^\d{4}$/.test(cells[i]) && /^[A-ZÁÉÍÓÚÑ]/.test(cells[i + 1]) && !startsWithModalidad(cells[i + 1])) {
            currentCodigo = cells[i]
            currentNombre = cells[i + 1]
            break
          }
        }
      }
      continue
    }

    const dias = cells[diasIdx].match(DIAS_RE)[0]

    // Column before dias should contain codComision
    let codComision = ''
    for (let i = diasIdx - 1; i >= 0; i--) {
      if (/^\d{4}$/.test(cells[i].trim())) {
        codComision = cells[i].trim()
        break
      }
    }

    // Check if this row also introduces a new materia (code in earlier cell)
    for (let i = 0; i < diasIdx - 1; i++) {
      if (/^\d{4}$/.test(cells[i].trim()) && cells[i].trim() !== codComision) {
        const possibleName = cells[i + 1]
        if (/^[A-ZÁÉÍÓÚÑ]/.test(possibleName) && !startsWithModalidad(possibleName)) {
          currentCodigo = cells[i].trim()
          currentNombre = possibleName
          break
        }
      }
    }

    // Modalidad is after dias
    const modalidadRaw = diasIdx < cells.length - 1 ? cells[diasIdx + 1] : ''
    const { modalidad, observacion: obsFromModalidad } = extractModalidad(modalidadRaw)

    // Sede is 2 columns after dias (or wherever it appears)
    let sede = 'San Justo'
    if (diasIdx + 2 < cells.length && cells[diasIdx + 2]) {
      sede = cells[diasIdx + 2].replace(/\s+/g, ' ').trim() || 'San Justo'
    }

    // Observacion is last column (when distinct from sede/modalidad)
    const last = cells[cells.length - 1]
    const observacion = last &&
      last !== sede &&
      last.toLowerCase() !== modalidad.toLowerCase()
      ? last
      : obsFromModalidad

    if (!currentCodigo || !codComision) continue

    /** @type {import('../lib/types').Comision} */
    const comision = {
      codigoMateria: currentCodigo,
      descripcion: currentNombre,
      codComision,
      dias,
      modalidad,
      sede,
    }
    if (observacion) comision.observacion = observacion
    comisiones.push(comision)
  }

  return comisiones
}

/**
 * Fallback: parse raw text if table extraction fails or gives bad results
 * @param {string} text
 * @returns {import('../lib/types').Comision[]}
 */
function parseRawText(text) {
  const INCOMPLETE_SEDES = ['San', 'Buenos']
  const comisiones = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => {
    if (!l) return false
    if (l.startsWith('(http')) return false
    if (l.startsWith('https://') || l.startsWith('http://')) return false
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l)) return false
    if (l.includes('Intraconsulta')) return false
    if (/unlam\.edu\.ar/.test(l) && !DIAS_RE.test(l)) return false
    if (/^(Código|Descripción|Cod\.?|Comisión|Turno|Días|Modalidad|Sede|Observacion)\s*$/.test(l)) return false
    if (/^\d+\/\d+\s*$/.test(l)) return false
    return true
  })

  let currentCodigo = ''
  let currentNombre = ''
  let nameMode = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const diasMatch = line.match(DIAS_RE)

    if (diasMatch) {
      nameMode = false
      const dias = diasMatch[0]
      const diasIdx = line.indexOf(dias)
      const before = line.substring(0, diasIdx).trim()
      const after = line.substring(diasIdx + dias.length).trim()

      const codMatch = before.match(/(\d{4})\s*$/)
      const codComision = codMatch ? codMatch[1] : ''
      const materiaPrefix = codMatch
        ? before.substring(0, before.lastIndexOf(codMatch[0])).trim()
        : before

      if (materiaPrefix) {
        // Only treat as a new materia if the prefix has text that looks like a materia name
        // (starts with 4 digits followed by uppercase letters, not day abbreviations)
        const nm = materiaPrefix.match(/^(\d{4})\s+([A-ZÁÉÍÓÚÑ].+)/)
        if (nm && !/^(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(nm[2])) {
          currentCodigo = nm[1]
          currentNombre = nm[2].trim()
        }
      }

      const { modalidad, observacion } = extractModalidad(after)

      // Lookahead for sede
      const sedeParts = []
      let j = i + 1
      while (j < lines.length) {
        const nxt = lines[j]
        if (DIAS_RE.test(nxt) || /^\d{4}\s/.test(nxt)) break
        if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(nxt) && nxt.length <= 25) {
          sedeParts.push(nxt)
          j++
          if (!INCOMPLETE_SEDES.includes(sedeParts.join(' '))) break
        } else break
      }

      const sede = sedeParts.join(' ') || 'San Justo'

      if (!currentCodigo || !codComision) continue

      const comision = {
        codigoMateria: currentCodigo,
        descripcion: currentNombre,
        codComision,
        dias,
        modalidad,
        sede,
      }
      if (observacion) comision.observacion = observacion
      comisiones.push(comision)

    } else {
      // Commission without fixed schedule, e.g. "6900 A distancia A Distancia"
      const sinHorario = line.match(/^(\d{4})\s+(.+)$/)
      if (sinHorario && currentCodigo && startsWithModalidad(sinHorario[2])) {
        nameMode = false
        const { modalidad, observacion } = extractModalidad(sinHorario[2])
        const sedeParts = []
        let j = i + 1
        while (j < lines.length) {
          const nxt = lines[j]
          if (DIAS_RE.test(nxt) || /^\d{4}\s/.test(nxt)) break
          if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(nxt) && nxt.length <= 25) {
            sedeParts.push(nxt)
            j++
            if (!INCOMPLETE_SEDES.includes(sedeParts.join(' '))) break
          } else break
        }
        const comision = {
          codigoMateria: currentCodigo,
          descripcion: currentNombre,
          codComision: sinHorario[1],
          dias: '',
          modalidad,
          sede: sedeParts.join(' ') || 'San Justo',
        }
        if (observacion) comision.observacion = observacion
        comisiones.push(comision)
        continue
      }

      // A line like "7175 LuVi12a14 ..." starts with 4 digits but it's a comision where
      // the dias field begins with day abbreviations right after the code. Detect this.
      const isComisionCodeLine = /^\d{4}\s+(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(line) && DIAS_RE.test(line)

      const nm = !isComisionCodeLine && line.match(/^(\d{4})\s+(.+)/)
      if (nm && !startsWithModalidad(nm[2])) {
        currentCodigo = nm[1]
        currentNombre = nm[2].trim()
        nameMode = true
      } else if (isComisionCodeLine) {
        // This is a comision line that starts with its own codComision (already handled above)
        // Should have been caught by the diasMatch branch — skip here
      } else if (
        nameMode &&
        /^[A-ZÁÉÍÓÚÑ]/.test(line) &&
        !/^(San|Justo|Ituzaingó|Ituzaingo|Buenos|Aires)\s*$/.test(line)
      ) {
        currentNombre += ' ' + line.trim()
      } else {
        nameMode = false
      }
    }
  }

  return comisiones
}

async function main() {
  const pdfPath = path.join(process.cwd(), 'public', 'oferta_2 1.pdf')
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found at:', pdfPath)
    process.exit(1)
  }

  console.log('Reading PDF...')
  const buffer = fs.readFileSync(pdfPath)

  // Try table extraction first
  let comisiones = []
  let usedMethod = ''

  try {
    console.log('Attempting table extraction...')
    const parser = new PDFParse({ data: buffer })
    const tableResult = await parser.getTable()
    await parser.destroy()

    fs.mkdirSync(path.join(process.cwd(), 'scripts'), { recursive: true })
    fs.writeFileSync(
      path.join(__dirname, 'debug-table.json'),
      JSON.stringify(tableResult, null, 2),
      'utf8'
    )
    console.log('Table data saved to scripts/debug-table.json')

    // Flatten all tables from all pages
    const allRows = []
    for (const page of tableResult.pages) {
      for (const table of page.tables) {
        allRows.push(...table)
      }
    }
    console.log(`Found ${allRows.length} table rows across ${tableResult.pages.length} pages`)

    if (allRows.length > 10) {
      comisiones = parseTableRows(allRows)
      usedMethod = 'table'
    }
  } catch (e) {
    console.log('Table extraction failed:', e.message)
  }

  // Fallback / complement with raw text — table extraction often drops
  // comisiones sin horario fijo (p.ej. "A Distancia").
  {
    console.log('Running raw text extraction...')
    const textParser = new PDFParse({ data: buffer })
    const textResult = await textParser.getText()
    await textParser.destroy()

    fs.writeFileSync(path.join(__dirname, 'debug-raw.txt'), textResult.text, 'utf8')
    console.log('Raw text saved to scripts/debug-raw.txt')

    const textComisiones = parseRawText(textResult.text)
    if (comisiones.length < 10) {
      comisiones = textComisiones
      usedMethod = 'text'
    } else {
      // Merge: keep table rows, add any text-only comisiones (esp. sin horario)
      const seen = new Set(
        comisiones.map(c =>
          `${c.codigoMateria}-${c.codComision}-${c.dias}-${c.modalidad}-${c.sede}`
        )
      )
      let added = 0
      for (const c of textComisiones) {
        const id = `${c.codigoMateria}-${c.codComision}-${c.dias}-${c.modalidad}-${c.sede}`
        if (!seen.has(id)) {
          comisiones.push(c)
          seen.add(id)
          added++
        }
      }
      usedMethod = added > 0 ? `table+text(+${added})` : 'table'
    }
  }

  // Group by materia for reporting
  const materiaMap = new Map()
  for (const c of comisiones) {
    if (!materiaMap.has(c.codigoMateria)) {
      materiaMap.set(c.codigoMateria, c.descripcion)
    }
  }

  const output = {
    universidad: 'UNLaM',
    carrera: 'Ingeniería Informática',
    periodo: '1er semestre 2026',
    comisiones,
  }

  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
  const outputPath = path.join(process.cwd(), 'data', 'unlam-informatica.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')

  console.log(`\n[${usedMethod}] Parsed ${comisiones.length} comisiones across ${materiaMap.size} materias`)
  console.log(`Output saved to data/unlam-informatica.json`)
  console.log('\nSample comisiones (first 6):')
  comisiones.slice(0, 6).forEach(c => console.log(JSON.stringify(c)))
  console.log('\nMaterias found:')
  for (const [code, name] of materiaMap) {
    const count = comisiones.filter(c => c.codigoMateria === code).length
    console.log(`  [${code}] ${name} (${count} comisiones)`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
