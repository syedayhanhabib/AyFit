// Verification script for src/utils/{bmi,tdee,age}.ts. Kept, not deleted
// after use: unlike this project's earlier throwaway .mjs verification
// scripts (month-grid.ts, session-blocks.ts), this one compiles and runs the
// REAL util files rather than a reimplemented copy of their logic, so it is
// genuine regression coverage, not a one-off sanity check.
//
// Run it in two steps:
//   npx tsc scripts/verify-profile-utils.ts --outDir .tmp-verify --module commonjs --target es2022 --strict --ignoreConfig
//   node .tmp-verify/scripts/verify-profile-utils.js
//
// This project's tsconfig has no "types" field, and this TS/toolchain
// combination does not auto-include @types/node without one (the rest of
// the app never imports a Node builtin, so this never surfaced before) —
// the explicit reference below is the fix, not a tsconfig edit.
/// <reference types="node" />
import * as assert from 'node:assert';
import { calculateBmi, bmiCategory, bmiMarkerPosition } from '../src/utils/bmi';
import { calculateBmr, activityMultiplier, calculateTdee, roundedTrainingDays } from '../src/utils/tdee';
import { calculateAge, daysInMonth } from '../src/utils/age';
import { relativeStrength } from '../src/utils/relative-strength';
import { cmFromFeetInches, feetInchesFromCm, formatHeightImperial } from '../src/utils/height';

let passCount = 0;
let failCount = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`PASS: ${label}`);
    passCount += 1;
  } catch {
    console.log(`FAIL: ${label} -- expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failCount += 1;
  }
}

// calculateBmi
check('calculateBmi(95, 178)', calculateBmi(95, 178), 30.0);
check('calculateBmi(53.3, 170)', calculateBmi(53.3, 170), 18.4);
check('calculateBmi(72.3, 170)', calculateBmi(72.3, 170), 25.0);
check('calculateBmi(72.13, 170)', calculateBmi(72.13, 170), 25.0);
check('calculateBmi(46.3, 170)', calculateBmi(46.3, 170), 16.0);
check('calculateBmi(40, 170)', calculateBmi(40, 170), 13.8);
check('calculateBmi(125, 170)', calculateBmi(125, 170), 43.3);
check('calculateBmi(95, 0)', calculateBmi(95, 0), undefined);
check('calculateBmi(0, 178)', calculateBmi(0, 178), undefined);

// bmiCategory (age 36 unless stated)
check('bmiCategory(30.0, 36)', bmiCategory(30.0, 36), { kind: 'category', category: 'obesity class I' });
check('bmiCategory(18.4, 36)', bmiCategory(18.4, 36), { kind: 'category', category: 'mild thinness' });
check('bmiCategory(18.5, 36)', bmiCategory(18.5, 36), { kind: 'category', category: 'normal range' });
check('bmiCategory(24.9, 36)', bmiCategory(24.9, 36), { kind: 'category', category: 'normal range' });
check('bmiCategory(25.0, 36)', bmiCategory(25.0, 36), { kind: 'category', category: 'overweight (pre-obese)' });
check('bmiCategory(13.8, 36)', bmiCategory(13.8, 36), { kind: 'category', category: 'severe thinness' });
check('bmiCategory(16.0, 36)', bmiCategory(16.0, 36), { kind: 'category', category: 'moderate thinness' });
check('bmiCategory(17.0, 36)', bmiCategory(17.0, 36), { kind: 'category', category: 'mild thinness' });
check('bmiCategory(35.0, 36)', bmiCategory(35.0, 36), { kind: 'category', category: 'obesity class II' });
check('bmiCategory(40.0, 36)', bmiCategory(40.0, 36), { kind: 'category', category: 'obesity class III' });
check('bmiCategory(43.3, 36)', bmiCategory(43.3, 36), { kind: 'category', category: 'obesity class III' });
check('bmiCategory(25.0, undefined)', bmiCategory(25.0, undefined), { kind: 'needs-dob' });
check('bmiCategory(25.0, 16)', bmiCategory(25.0, 16), { kind: 'under-eighteen' });
{
  const result = bmiCategory(25.0, 18);
  check('bmiCategory(25.0, 18) is a category, not under-eighteen', result.kind, 'category');
}
check('bmiCategory(NaN, 36)', bmiCategory(NaN, 36), { kind: 'needs-measurements' });
check('bmiCategory(Infinity, 36)', bmiCategory(Infinity, 36), { kind: 'needs-measurements' });

// bmiMarkerPosition
check('bmiMarkerPosition(27.5)', bmiMarkerPosition(27.5), { fraction: 0.5 });
check('bmiMarkerPosition(15.0)', bmiMarkerPosition(15.0), { fraction: 0 });
check('bmiMarkerPosition(40.0)', bmiMarkerPosition(40.0), { fraction: 1 });
check('bmiMarkerPosition(13.8)', bmiMarkerPosition(13.8), { fraction: 0, offScale: 'low' });
check('bmiMarkerPosition(43.3)', bmiMarkerPosition(43.3), { fraction: 1, offScale: 'high' });
check('bmiMarkerPosition(NaN)', bmiMarkerPosition(NaN), { fraction: 0, offScale: 'low' });

// calculateAge
check("calculateAge('1990-05-15', '2026-08-03')", calculateAge('1990-05-15', '2026-08-03'), 36);
check("calculateAge('1990-08-03', '2026-08-03')", calculateAge('1990-08-03', '2026-08-03'), 36);
check("calculateAge('1990-08-04', '2026-08-03')", calculateAge('1990-08-04', '2026-08-03'), 35);
check("calculateAge('2004-02-29', '2026-02-28')", calculateAge('2004-02-29', '2026-02-28'), 21);
check("calculateAge('2004-02-29', '2026-03-01')", calculateAge('2004-02-29', '2026-03-01'), 22);
check("calculateAge('2009-08-04', '2026-08-03')", calculateAge('2009-08-04', '2026-08-03'), 16);
check("calculateAge('2027-01-01', '2026-08-03')", calculateAge('2027-01-01', '2026-08-03'), undefined);
check("calculateAge('not-a-date', '2026-08-03')", calculateAge('not-a-date', '2026-08-03'), undefined);
check("calculateAge('2026-02-30', '2026-08-03')", calculateAge('2026-02-30', '2026-08-03'), undefined);

// calculateBmr
check("calculateBmr('male', 95, 178, 36)", calculateBmr('male', 95, 178, 36), 1887.5);
check("calculateBmr('female', 95, 178, 36)", calculateBmr('female', 95, 178, 36), 1721.5);
check("calculateBmr('male', 95, 178, 17)", calculateBmr('male', 95, 178, 17), 1982.5);

// roundedTrainingDays
check('roundedTrainingDays(1.0)', roundedTrainingDays(1.0), 1);
check('roundedTrainingDays(0)', roundedTrainingDays(0), 0);
check('roundedTrainingDays(0.25)', roundedTrainingDays(0.25), 0);
check('roundedTrainingDays(1.4)', roundedTrainingDays(1.4), 1);
check('roundedTrainingDays(1.5)', roundedTrainingDays(1.5), 2);
check('roundedTrainingDays(2.5)', roundedTrainingDays(2.5), 3);
check('roundedTrainingDays(-3)', roundedTrainingDays(-3), 0);
check('roundedTrainingDays(NaN)', roundedTrainingDays(NaN), 0);
check('roundedTrainingDays(Infinity)', roundedTrainingDays(Infinity), 0);

// activityMultiplier
check('activityMultiplier(0)', activityMultiplier(0), 1.2);
check('activityMultiplier(0.4)', activityMultiplier(0.4), 1.2);
check('activityMultiplier(0.5)', activityMultiplier(0.5), 1.375);
check('activityMultiplier(2)', activityMultiplier(2), 1.375);
check('activityMultiplier(2.4)', activityMultiplier(2.4), 1.375);
check('activityMultiplier(2.5)', activityMultiplier(2.5), 1.55);
check('activityMultiplier(3.5)', activityMultiplier(3.5), 1.55);
check('activityMultiplier(4)', activityMultiplier(4), 1.55);
check('activityMultiplier(5)', activityMultiplier(5), 1.725);
check('activityMultiplier(6.4)', activityMultiplier(6.4), 1.725);
check('activityMultiplier(7)', activityMultiplier(7), 1.9);
check('activityMultiplier(12)', activityMultiplier(12), 1.9);
check('activityMultiplier(-3)', activityMultiplier(-3), 1.2);
check('activityMultiplier(NaN)', activityMultiplier(NaN), 1.2);
check('activityMultiplier(Infinity)', activityMultiplier(Infinity), 1.2);

// The band and the day count rendered beside it, locked together by test —
// not by a comment claiming they agree. activityMultiplier(2.5) is already
// asserted above (1.55); roundedTrainingDays(1.0) and (2.5) are already
// asserted in the roundedTrainingDays block above (1 and 3) — this is the
// one new assertion the pairing needs, plus the two labels below that make
// the pairing itself explicit rather than left to a comment.
check('activityMultiplier(1.0)', activityMultiplier(1.0), 1.375);
check('roundedTrainingDays(1.0) pairs with activityMultiplier(1.0)', roundedTrainingDays(1.0), 1);
check('roundedTrainingDays(2.5) pairs with activityMultiplier(2.5)', roundedTrainingDays(2.5), 3);

// calculateTdee
check("calculateTdee('male', 95, 178, 36, 3.5)", calculateTdee('male', 95, 178, 36, 3.5), 2950);
check("calculateTdee('male', 95, 178, 36, 0)", calculateTdee('male', 95, 178, 36, 0), 2250);
check("calculateTdee('male', 95, 178, 17, 3.5)", calculateTdee('male', 95, 178, 17, 3.5), undefined);
check("calculateTdee('male', 95, 178, NaN, 3.5)", calculateTdee('male', 95, 178, NaN, 3.5), undefined);
{
  const result = calculateTdee('male', 95, 178, 18, 3.5);
  check("calculateTdee('male', 95, 178, 18, 3.5) is a number, not undefined", typeof result, 'number');
}

// relativeStrength
check('relativeStrength(120, 75)', relativeStrength(120, 75), 1.6);
check('relativeStrength(121.5, 75)', relativeStrength(121.5, 75), 1.62);
check('relativeStrength(121.567, 75)', relativeStrength(121.567, 75), 1.62);
check('relativeStrength(150, 80)', relativeStrength(150, 80), 1.88);
check('relativeStrength(100, 0)', relativeStrength(100, 0), undefined);
check('relativeStrength(0, 75)', relativeStrength(0, 75), undefined);
check('relativeStrength(NaN, 75)', relativeStrength(NaN, 75), undefined);
check('relativeStrength(100, NaN)', relativeStrength(100, NaN), undefined);

// daysInMonth
check('daysInMonth(2024, 2)', daysInMonth(2024, 2), 29);
check('daysInMonth(2026, 2)', daysInMonth(2026, 2), 28);
check('daysInMonth(2000, 2)', daysInMonth(2000, 2), 29);
check('daysInMonth(1900, 2)', daysInMonth(1900, 2), 28);
check('daysInMonth(2026, 1)', daysInMonth(2026, 1), 31);
check('daysInMonth(2026, 4)', daysInMonth(2026, 4), 30);

// cmFromFeetInches
check('cmFromFeetInches(5, 7)', cmFromFeetInches(5, 7), 170.2);
check('cmFromFeetInches(6, 0)', cmFromFeetInches(6, 0), 182.9);
check('cmFromFeetInches(4, 11)', cmFromFeetInches(4, 11), 149.9);
check('cmFromFeetInches(7, 11)', cmFromFeetInches(7, 11), 241.3);
check('cmFromFeetInches(NaN, 0)', cmFromFeetInches(NaN, 0), undefined);
check('cmFromFeetInches(0, 0)', cmFromFeetInches(0, 0), undefined);

// feetInchesFromCm
check('feetInchesFromCm(170.2)', feetInchesFromCm(170.2), { feet: 5, inches: 7 });
check('feetInchesFromCm(182.9)', feetInchesFromCm(182.9), { feet: 6, inches: 0 });
check('feetInchesFromCm(149.9)', feetInchesFromCm(149.9), { feet: 4, inches: 11 });
check('feetInchesFromCm(241.3)', feetInchesFromCm(241.3), { feet: 7, inches: 11 });
check('feetInchesFromCm(0)', feetInchesFromCm(0), undefined);
check('feetInchesFromCm(NaN)', feetInchesFromCm(NaN), undefined);

// formatHeightImperial
check('formatHeightImperial(170.2)', formatHeightImperial(170.2), `5'7"`);

console.log(`\n${passCount} passed, ${failCount} failed, ${passCount + failCount} total`);
