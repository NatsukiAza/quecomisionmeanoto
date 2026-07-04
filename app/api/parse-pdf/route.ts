import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { parseComisionesFromText } from '@/lib/parse-pdf'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No se recibió un archivo' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    const comisiones = parseComisionesFromText(result.text)

    if (comisiones.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron comisiones en el PDF. Verificá que sea el formato correcto.' },
        { status: 422 }
      )
    }

    // Infer period from PDF metadata (best-effort)
    const periodo = new Date().getFullYear() + ' — oferta subida manualmente'

    return NextResponse.json({
      universidad: 'Otra universidad',
      carrera: 'Oferta subida manualmente',
      periodo,
      comisiones,
    })
  } catch (e) {
    console.error('PDF parse error:', e)
    return NextResponse.json(
      { error: 'Error al procesar el PDF. Verificá que el archivo no esté dañado.' },
      { status: 500 }
    )
  }
}
