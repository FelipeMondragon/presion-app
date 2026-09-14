import jsPDF from "jspdf"
import { applyPlugin, type CellHookData } from "jspdf-autotable"
import { classifyBP, type BPClassification } from "./bp-classifier"
import type { Measurement } from "./types"
import type { Translations } from "./translations"
import { formatChartTick, formatDate } from "./utils"

applyPlugin(jsPDF)

type RGB = [number, number, number]

const INK: RGB = [30, 41, 59]
const MUTED: RGB = [100, 116, 139]
const FAINT: RGB = [148, 163, 184]
const HAIRLINE: RGB = [226, 232, 240]
const ROW_TINT: RGB = [248, 250, 252]
const CRISIS_TINT: RGB = [254, 242, 242]
const BAND_TINT: RGB = [240, 253, 244]
const BRAND: RGB = [239, 68, 68]
const SYS_COLOR: RGB = [220, 38, 38]
const DIA_COLOR: RGB = [37, 99, 235]

const CLASS_COLORS: Record<BPClassification, RGB> = {
  normal: [22, 163, 74],
  elevada: [202, 138, 4],
  hipertensionGrado1: [234, 88, 12],
  hipertensionGrado2: [220, 38, 38],
  crisisHipertensiva: [153, 27, 27],
}

const CLASS_ORDER: BPClassification[] = [
  "normal",
  "elevada",
  "hipertensionGrado1",
  "hipertensionGrado2",
  "crisisHipertensiva",
]

function tint([r, g, b]: RGB, amount = 0.88): RGB {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ]
}

function localDayKey(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function formatTime(iso: string, lang: string): string {
  const locale = lang === "en" ? "en-US" : "es-MX"
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))
}

export type PDFStats = {
  count: number
  days: number
  avgS: number
  avgD: number
  avgP: number | null
  minS: number
  maxS: number
  minD: number
  maxD: number
  overall: BPClassification
  inRange: number
  inRangePct: number
  distribution: Record<BPClassification, number>
}

export function computeStats(data: Measurement[]): PDFStats {
  const s = data.map((m) => m.systolic)
  const d = data.map((m) => m.diastolic)
  const p = data.map((m) => m.pulse).filter((v): v is number => v !== null)
  const avgS = Math.round(s.reduce((a, b) => a + b, 0) / s.length)
  const avgD = Math.round(d.reduce((a, b) => a + b, 0) / d.length)
  const avgP = p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : null
  const distribution: Record<BPClassification, number> = {
    normal: 0,
    elevada: 0,
    hipertensionGrado1: 0,
    hipertensionGrado2: 0,
    crisisHipertensiva: 0,
  }
  for (const m of data) distribution[classifyBP(m.systolic, m.diastolic).classification]++
  const inRange = data.filter((m) => m.systolic < 130 && m.diastolic < 80).length
  return {
    count: data.length,
    days: new Set(data.map((m) => localDayKey(m.measured_at))).size,
    avgS,
    avgD,
    avgP,
    minS: Math.min(...s),
    maxS: Math.max(...s),
    minD: Math.min(...d),
    maxD: Math.max(...d),
    overall: classifyBP(avgS, avgD).classification,
    inRange,
    inRangePct: Math.round((inRange / data.length) * 100),
    distribution,
  }
}

function drawHeart(doc: jsPDF, x: number, y: number, width: number, color: RGB) {
  const d = width / 2.414
  const topX = x + width / 2
  const topY = y + 0.207 * d
  doc.setFillColor(...color)
  doc.lines([[d, d], [-d, d], [-d, -d], [d, -d]], topX, topY, [1, 1], "F", true)
  doc.circle(topX - d / 2, topY + d / 2, d / Math.SQRT2, "F")
  doc.circle(topX + d / 2, topY + d / 2, d / Math.SQRT2, "F")
}

function sectionTitle(doc: jsPDF, label: string, x: number, y: number) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(0.7)
  doc.text(label.toUpperCase(), x, y)
  doc.setCharSpace(0)
}

function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text
  let cut = text
  while (cut.length > 1 && doc.getTextWidth(`${cut}\u2026`) > maxW) cut = cut.slice(0, -1)
  return `${cut}\u2026`
}

export function drawChart(
  doc: jsPDF,
  data: Measurement[],
  x: number,
  y: number,
  w: number,
  h: number,
  t: Translations,
  lang: string
) {
  const sorted = [...data].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
  const n = sorted.length
  if (n < 2) return

  const times = sorted.map((m) => new Date(m.measured_at).getTime())
  const span = times[n - 1] - times[0]
  const values = data.flatMap((m) => [m.systolic, m.diastolic])

  let yMin = Math.floor((Math.min(...values) - 10) / 10) * 10
  const yMax = Math.max(160, Math.ceil((Math.max(...values) + 10) / 10) * 10)
  yMin = Math.max(40, Math.min(60, yMin))
  const yRange = yMax - yMin

  const plotX = x + 13
  const plotW = w - 13
  const mapY = (v: number) => y + h - ((v - yMin) / yRange) * h
  const mapX = (i: number) => plotX + (i / (n - 1)) * plotW

  doc.setFillColor(...BAND_TINT)
  doc.rect(plotX, mapY(130), plotW, mapY(80) - mapY(130), "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...FAINT)
  doc.text("80\u2013130 mmHg", plotX + 2, mapY(130) + 3.5)

  const step = yRange > 140 ? 20 : 10
  doc.setFontSize(8.5)
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    const gy = mapY(v)
    doc.setDrawColor(...HAIRLINE)
    doc.setLineWidth(0.2)
    doc.line(plotX, gy, plotX + plotW, gy)
    doc.setTextColor(...FAINT)
    doc.text(String(v), plotX - 3, gy + 1.2, { align: "right" })
  }

  const drawSeries = (vals: number[], color: RGB) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(1.6)
    for (let i = 1; i < n; i++) doc.line(mapX(i - 1), mapY(vals[i - 1]), mapX(i), mapY(vals[i]))
    if (n <= 60) {
      doc.setFillColor(...color)
      for (let i = 0; i < n; i++) doc.circle(mapX(i), mapY(vals[i]), 0.9, "F")
    }
  }
  drawSeries(sorted.map((m) => m.systolic), SYS_COLOR)
  drawSeries(sorted.map((m) => m.diastolic), DIA_COLOR)

  doc.setFontSize(8)
  doc.setTextColor(...FAINT)
  const maxLabels = Math.max(2, Math.floor(plotW / 20))
  const labelStep = Math.max(1, Math.ceil(n / maxLabels))
  const idxs: number[] = []
  for (let i = 0; i < n; i += labelStep) idxs.push(i)
  if (idxs[idxs.length - 1] !== n - 1) {
    if (n - 1 - idxs[idxs.length - 1] < labelStep * 0.5) idxs.pop()
    idxs.push(n - 1)
  }
  for (const i of idxs) {
    const align = i === 0 ? "left" : i === n - 1 ? "right" : "center"
    doc.text(formatChartTick(times[i], span, lang), mapX(i), y + h + 3.5, { align })
  }

  doc.setFontSize(8.5)
  doc.setTextColor(...FAINT)
  doc.text("mmHg", x, y + 2)
  doc.setFontSize(9.5)
  let lx = plotX + plotW
  const legend: [RGB, string][] = [
    [DIA_COLOR, t.historial.diastolica],
    [SYS_COLOR, t.historial.sistolica],
  ]
  for (const [color, label] of legend) {
    const tw = doc.getTextWidth(label)
    doc.setDrawColor(...color)
    doc.setLineWidth(1.6)
    doc.line(lx - tw - 10, y + 0.5, lx - tw - 3, y + 0.5)
    doc.setTextColor(...MUTED)
    doc.text(label, lx - tw, y + 2)
    lx -= tw + 16
  }
}

export function generatePDF(
  data: Measurement[],
  patientName: string,
  dateFrom: string,
  dateTo: string,
  t: Translations,
  lang: string
): jsPDF {
  const doc = new jsPDF()
  const stats = computeStats(data)
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const m = 18
  const cw = pw - m * 2
  const right = pw - m
  const accent = CLASS_COLORS[stats.overall]

  // Masthead
  drawHeart(doc, m, 10, 7, BRAND)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.setTextColor(...INK)
  doc.text(t.app.name, m + 9.5, 15)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(1.1)
  doc.text(t.exportar.informeMedico.toUpperCase(), m + 9.5, 19.5)
  doc.setCharSpace(0)

  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(0.8)
  doc.text(t.exportar.periodo.toUpperCase(), right, 11, { align: "right" })
  doc.setCharSpace(0)
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  const range = dateFrom && dateTo
    ? `${formatDate(dateFrom, lang, { dateStyle: "short" })} - ${formatDate(dateTo, lang, { dateStyle: "short" })}`
    : dateFrom || dateTo || "\u2014"
  doc.text(range, right, 15.5, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(`${t.exportar.generadoEl} ${formatDate(new Date(), lang, { dateStyle: "long" })}`, right, 20.5, { align: "right" })

  doc.setDrawColor(...HAIRLINE)
  doc.setLineWidth(0.4)
  doc.line(m, 26, right, 26)

  // Patient + classification pill
  let y = 34
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(0.8)
  doc.text(t.exportar.paciente.toUpperCase(), m, y)
  doc.setCharSpace(0)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  const pillText = t.clasificacion[stats.overall]
  const pillW = doc.getTextWidth(pillText) + 10
  const pillH = 8
  const pillX = right - pillW
  const pillY = y + 0.5
  doc.setFillColor(...tint(accent))
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.4)
  doc.roundedRect(pillX, pillY, pillW, pillH, 4, 4, "FD")
  doc.setTextColor(...accent)
  doc.text(pillText, pillX + pillW / 2, pillY + pillH / 2 + 1.3, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text(fitText(doc, patientName || "\u2014", pillX - m - 6), m, y + 4)

  y += 12
  doc.setDrawColor(...HAIRLINE)
  doc.line(m, y, right, y)
  y += 9

  // Metrics band
  const colW = cw / 4
  const metrics = [
    { label: t.exportar.promedio, value: `${stats.avgS}/${stats.avgD}`, unit: t.dashboard.mmhg, sub: "" },
    {
      label: t.exportar.rango,
      value: `${stats.minS}\u2013${stats.maxS} / ${stats.minD}\u2013${stats.maxD}`,
      unit: t.dashboard.mmhg,
      sub: `${stats.days} ${t.exportar.dias}`,
    },
    { label: t.exportar.enRango, value: `${stats.inRangePct}%`, unit: "", sub: `${stats.inRange}/${stats.count}` },
    {
      label: t.historial.pulso,
      value: stats.avgP != null ? String(stats.avgP) : "\u2014",
      unit: stats.avgP != null ? t.dashboard.bpm : "",
      sub: "",
    },
  ]
  const bandY = y
  metrics.forEach((mt, i) => {
    const cx = m + i * colW
    if (i > 0) {
      doc.setDrawColor(...HAIRLINE)
      doc.setLineWidth(0.3)
      doc.line(cx - 4, bandY - 2, cx - 4, bandY + 13)
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.setCharSpace(0.6)
    doc.text(mt.label.toUpperCase(), cx, bandY)
    doc.setCharSpace(0)

    doc.setFontSize(7.5)
    const unitW = mt.unit ? doc.getTextWidth(mt.unit) + 1.5 : 0
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...INK)
    let size = 13
    doc.setFontSize(size)
    while (size > 9 && doc.getTextWidth(mt.value) + unitW > colW - 8) {
      size--
      doc.setFontSize(size)
    }
    doc.text(mt.value, cx, bandY + 7)
    if (mt.unit) {
      const vw = doc.getTextWidth(mt.value)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(...MUTED)
      doc.text(mt.unit, cx + vw + 1.5, bandY + 7)
    }
    if (mt.sub) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(...FAINT)
      doc.text(mt.sub, cx, bandY + 11.5)
    }
  })
  y = bandY + 17

  // Distribution
  sectionTitle(doc, t.exportar.distribucion, m, y)
  y += 5
  const barH = 6
  let bx = m
  for (const k of CLASS_ORDER) {
    const sw = (stats.distribution[k] / stats.count) * cw
    if (sw <= 0) continue
    doc.setFillColor(...CLASS_COLORS[k])
    doc.rect(bx + 0.5, y, Math.max(sw - 1, 0.4), barH, "F")
    bx += sw
  }
  y += barH + 6
  const lcolW = cw / 3
  CLASS_ORDER.forEach((k, i) => {
    const cx = m + (i % 3) * lcolW
    const cy = y + Math.floor(i / 3) * 5.5
    doc.setFillColor(...CLASS_COLORS[k])
    doc.circle(cx + 1.1, cy - 1, 1.1, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    const label = t.clasificacion[k]
    doc.text(label, cx + 4, cy)
    doc.setFontSize(7)
    doc.setTextColor(...FAINT)
    doc.text(
      `${stats.distribution[k]} (${Math.round((stats.distribution[k] / stats.count) * 100)}%)`,
      cx + 4 + doc.getTextWidth(label) + 1.5,
      cy
    )
  })
  y += Math.ceil(CLASS_ORDER.length / 3) * 5.5 + 6

  // Chart on its own page
  if (data.length >= 2) {
    doc.addPage()
    const chartTop = 24
    sectionTitle(doc, t.exportar.evolucion, m, chartTop)
    drawChart(doc, data, m, chartTop + 8, cw, ph - chartTop - 38, t, lang)
    doc.addPage()
    y = 24
  }

  // Table
  if (y > ph - 45) {
    doc.addPage()
    y = 20
  }
  sectionTitle(doc, t.exportar.hojaMediciones, m, y)
  const rows = data.map((r) => [
    formatDate(r.measured_at, lang, { dateStyle: "short" }),
    formatTime(r.measured_at, lang),
    String(r.systolic),
    String(r.diastolic),
    r.pulse?.toString() ?? "\u2014",
    r.arm === "left" ? t.brazo.left : t.brazo.right,
    r.position === "sitting" ? t.posicion.sitting : r.position === "lying" ? t.posicion.lying : t.posicion.standing,
    r.notes ?? "",
  ])
  doc.autoTable({
    startY: y + 4,
    head: [[
      t.historial.fecha,
      t.exportar.hora,
      t.historial.sistolica,
      t.historial.diastolica,
      t.historial.pulso,
      t.historial.brazo,
      t.historial.posicion,
      t.registrar.notas,
    ]],
    body: rows,
    margin: { left: m, right: m, top: 24, bottom: 20 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 1.6, right: 1.5, bottom: 1.6, left: 1.5 },
      textColor: INK,
      lineColor: HAIRLINE,
      lineWidth: 0.1,
      valign: "middle",
    },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0, fontSize: 8.5 },
    alternateRowStyles: { fillColor: ROW_TINT },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 16 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 16 },
      6: { cellWidth: 17 },
      7: { cellWidth: "auto" },
    },
    showHead: "everyPage",
    didParseCell: (hookData: CellHookData) => {
      if (hookData.section !== "body") return
      const reading = data[hookData.row.index]
      if (classifyBP(reading.systolic, reading.diastolic).classification === "crisisHipertensiva") {
        hookData.cell.styles.fillColor = CRISIS_TINT
      }
    },
    didDrawCell: (hookData: CellHookData) => {
      if (hookData.section !== "body" || hookData.column.index !== 0) return
      const reading = data[hookData.row.index]
      const cls = classifyBP(reading.systolic, reading.diastolic).classification
      doc.setFillColor(...CLASS_COLORS[cls])
      doc.rect(hookData.cell.x + 0.2, hookData.cell.y + 0.4, 0.9, hookData.cell.height - 0.8, "F")
    },
  })

  // Footer + running header
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...HAIRLINE)
    doc.setLineWidth(0.4)
    doc.line(m, ph - 14, right, ph - 14)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.setTextColor(...FAINT)
    doc.text(t.exportar.disclaimer, m, ph - 9.5)
    const pageLabel = lang === "en" ? `Page ${i} of ${pageCount}` : `P\u00e1gina ${i} de ${pageCount}`
    doc.text(pageLabel, right, ph - 9.5, { align: "right" })
    if (i > 1) {
      doc.setFontSize(7)
      doc.text(`${t.app.name} \u00b7 ${t.exportar.informeMedico}`, m, 10)
      doc.text(fitText(doc, patientName, cw / 2), right, 10, { align: "right" })
      doc.line(m, 12.5, right, 12.5)
    }
  }

  return doc
}
