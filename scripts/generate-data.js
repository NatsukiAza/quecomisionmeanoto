// @ts-check
const fs = require('fs')
const path = require('path')
const { PDFParse } = require('pdf-parse')

// Matches single or multi-day patterns: "Lu08a12", "LuVi12a14", "LuMiVi08a12"
const DIAS_RE = /(?:Lu|Ma|Mi|Ju|Vi|Sa){1,3}\d{2}a\d{2}/
const MODALIDADES = ['Sincrónica Teams', 'Semipresencial', 'Presencial', 'Virtual', 'Aula Virtual']

function cleanCell(val) {
  if (!val || typeof val !== 'string') return ''
  // Remove embedded URLs like (https://...)
  return val.replace(/\(https?:\/\/[^)]*\)/g, '').replace(/https?:\/\/\S+/g, '').trim()
}

function extractModalidad(raw) {
  for (const m of MODALIDADES) {
    if (raw.toLowerCase().includes(m.toLowerCase())) return m
  }
  return 'Presencial'
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
      // No dias in this row — might be a materia header row or header/footer
      // Try to find materia code (4-digit number)
      const codeMatch = cells.join(' ').match(/^\s*(\d{4})\s+([A-ZÁÉÍÓÚÑ].+)/)
      if (codeMatch) {
        currentCodigo = codeMatch[1]
        currentNombre = codeMatch[2].trim()
      } else {
        // Check if any cell has a 4-digit code and the next cell has a materia name
        for (let i = 0; i < cells.length - 1; i++) {
          if (/^\d{4}$/.test(cells[i]) && /^[A-ZÁÉÍÓÚÑ]/.test(cells[i + 1])) {
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
        if (/^[A-ZÁÉÍÓÚÑ]/.test(possibleName)) {
          currentCodigo = cells[i].trim()
          currentNombre = possibleName
          break
        }
      }
    }

    // Modalidad is after dias
    const modalidad = diasIdx < cells.length - 1
      ? extractModalidad(cells[diasIdx + 1])
      : 'Presencial'

    // Sede is 2 columns after dias (or wherever it appears)
    let sede = 'San Justo'
    if (diasIdx + 2 < cells.length && cells[diasIdx + 2]) {
      sede = cells[diasIdx + 2].replace(/\s+/g, ' ').trim() || 'San Justo'
    }

    // Observacion is last column
    const observacion = cells[cells.length - 1] &&
      cells[cells.length - 1] !== sede &&
      cells[cells.length - 1] !== modalidad
      ? cells[cells.length - 1]
      : undefined

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

      let modalidad = 'Presencial'
      let observacion = undefined
      for (const m of MODALIDADES) {
        if (after.toLowerCase().startsWith(m.toLowerCase())) {
          modalidad = m
          const rest = after.slice(m.length).trim()
          if (rest) observacion = rest
          break
        }
      }
      if (modalidad === 'Presencial' && !MODALIDADES.some(m => after.toLowerCase().startsWith(m.toLowerCase()))) {
        if (after) observacion = after
      }

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

      if (!currentCodigo || !codComision) { i++; continue }

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
      // A line like "7175 LuVi12a14 ..." starts with 4 digits but it's a comision where
      // the dias field begins with day abbreviations right after the code. Detect this.
      const isComisionCodeLine = /^\d{4}\s+(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(line) && DIAS_RE.test(line)

      const nm = !isComisionCodeLine && line.match(/^(\d{4})\s+(.+)/)
      if (nm) {
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
  const pdfPath = path.join(process.cwd(), 'public', 'oferta 2026 2c Ing. Informatica.pdf')
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

  // Fallback to raw text if table extraction didn't work well
  if (comisiones.length < 10) {
    console.log('Falling back to raw text extraction...')
    const textParser = new PDFParse({ data: buffer })
    const textResult = await textParser.getText()
    await textParser.destroy()

    fs.writeFileSync(path.join(__dirname, 'debug-raw.txt'), textResult.text, 'utf8')
    console.log('Raw text saved to scripts/debug-raw.txt')

    comisiones = parseRawText(textResult.text)
    usedMethod = 'text'
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
    periodo: '2do cuatrimestre 2026',
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
