/**
 * Pruebas unitarias de normalización DUI.
 * Ejecutar: npx tsx scripts/dui-normalization.test.ts
 */
import {
  duiFormatVariants,
  duiMatches,
  normalizeDui,
  normalizeDuiDigits,
} from '../src/utils/platform';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function testNormalizeDuiDigits() {
  assert(normalizeDuiDigits('71542253-8') === '715422538', 'guion');
  assert(normalizeDuiDigits('715422538') === '715422538', 'solo digitos');
  assert(normalizeDuiDigits('71542253 8') === '715422538', 'espacio');
  assert(normalizeDuiDigits(' 7154-2253_8 ') === '715422538', 'mixto');
}

function testDuiMatches() {
  assert(duiMatches('71542253-8', '715422538'), 'guion vs digitos');
  assert(duiMatches('71542253-8', '71542253 8'), 'guion vs espacio');
  assert(duiMatches('715422538', '71542253-8'), 'simetrico');
  assert(!duiMatches('71542253-8', '715422539'), 'digito verificador distinto');
  assert(!duiMatches('', '715422538'), 'vacio');
}

function testNormalizeDuiCanonical() {
  assert(normalizeDui('715422538') === '71542253-8', 'canonico desde digitos');
  assert(normalizeDui('71542253-8') === '71542253-8', 'canonico ya formateado');
  assert(normalizeDui('71542253 8') === '71542253-8', 'canonico desde espacio');
}

function testDuiFormatVariants() {
  const variants = duiFormatVariants('71542253-8');
  assert(variants.includes('71542253-8'), 'incluye canonico');
  assert(variants.includes('715422538'), 'incluye digitos');
  assert(variants.every((v) => duiMatches(v, '71542253-8')), 'todas equivalentes');
}

function main() {
  testNormalizeDuiDigits();
  testDuiMatches();
  testNormalizeDuiCanonical();
  testDuiFormatVariants();
  console.log('✓ dui-normalization: todas las pruebas pasaron');
}

main();
