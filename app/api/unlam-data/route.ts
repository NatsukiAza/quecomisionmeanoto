import { NextResponse } from 'next/server'
import ofertaData from '@/data/unlam-informatica.json'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(ofertaData)
}
