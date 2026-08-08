import { strictEqual } from "node:assert"
import { classifyBP } from "../src/lib/bp-classifier"

const normal = classifyBP(110, 70)
strictEqual(normal.classification, "normal")

const normalEdge = classifyBP(119, 79)
strictEqual(normalEdge.classification, "normal")

const elevated = classifyBP(120, 79)
strictEqual(elevated.classification, "elevada")

const elevatedEdge = classifyBP(129, 79)
strictEqual(elevatedEdge.classification, "elevada")

const grade1_sys = classifyBP(130, 79)
strictEqual(grade1_sys.classification, "hipertensionGrado1")

const grade1_dia = classifyBP(120, 80)
strictEqual(grade1_dia.classification, "hipertensionGrado1")

const grade1_edge = classifyBP(139, 89)
strictEqual(grade1_edge.classification, "hipertensionGrado1")

const grade2_sys = classifyBP(140, 70)
strictEqual(grade2_sys.classification, "hipertensionGrado2")

const grade2_dia = classifyBP(120, 90)
strictEqual(grade2_dia.classification, "hipertensionGrado2")

const grade2_edge = classifyBP(179, 119)
strictEqual(grade2_edge.classification, "hipertensionGrado2")

const crisis_sys = classifyBP(181, 100)
strictEqual(crisis_sys.classification, "crisisHipertensiva")

const crisis_dia = classifyBP(150, 121)
strictEqual(crisis_dia.classification, "crisisHipertensiva")

const crisis_boundary_sys = classifyBP(180, 120)
strictEqual(crisis_boundary_sys.classification, "hipertensionGrado2")

const crisis_boundary_dia = classifyBP(181, 120)
strictEqual(crisis_boundary_dia.classification, "crisisHipertensiva")

console.log("✅ classifier.test.ts — all 16 assertions passed")
