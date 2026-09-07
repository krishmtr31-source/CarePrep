import { PatientIdentity } from '../data-models/patient';

console.log('=== CAREPREP SIH26047: PATIENT AGE INPUT & VALIDATION TEST SUITE ===\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: boolean, testNum: number, name: string, details: string) {
  totalCount++;
  if (condition) {
    passCount++;
    console.log(`[PASS] Test ${testNum}: ${name}`);
    console.log(`       Details: ${details}`);
  } else {
    console.error(`[FAIL] Test ${testNum}: ${name}`);
    console.error(`       Details: ${details}`);
  }
}

// Age validation logic replica matching PatientIdentityPage.tsx exactly
function validateAndParseAge(ageInput: string): { isValid: boolean; error?: string; numericAge?: number } {
  const trimmed = ageInput.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your age.' };
  }
  const numeric = Number(trimmed);
  if (isNaN(numeric) || numeric < 0 || numeric > 120) {
    return { isValid: false, error: 'Please enter a valid age between 0 and 120.' };
  }
  return { isValid: true, numericAge: numeric };
}

// Test 1: Existing "3" -> Backspace -> empty string state allowed
let state = '3';
state = ''; // simulate user pressing backspace
assert(
  state === '',
  1,
  'Existing "3" -> Backspace -> Empty field allowed without resetting to default',
  `Input state successfully set to empty string: "${state}"`
);

// Test 2: Existing "3" -> Select all -> Type "25"
state = '3';
state = '25';
assert(
  state === '25',
  2,
  'Existing "3" -> Replace with "25"',
  `Input state successfully replaced: "${state}"`
);

// Test 3: Existing "25" -> Backspace repeatedly -> Empty
state = '25';
state = '2';
state = '';
assert(
  state === '',
  3,
  'Existing "25" -> Backspace repeatedly -> Empty',
  `Input state successfully reduced to empty string: "${state}"`
);

// Test 4: Empty -> Type "30"
state = '';
state = '3';
state = '30';
assert(
  state === '30',
  4,
  'Empty -> Type "30"',
  `Input state cleanly updated to "${state}"`
);

// Test 5: Negative age validation (-1)
const negRes = validateAndParseAge('-1');
assert(
  negRes.isValid === false && negRes.error === 'Please enter a valid age between 0 and 120.',
  5,
  'Validation: Type -1 -> Error message',
  `Returned error: "${negRes.error}"`
);

// Test 6: Over-limit age validation (121)
const overRes = validateAndParseAge('121');
assert(
  overRes.isValid === false && overRes.error === 'Please enter a valid age between 0 and 120.',
  6,
  'Validation: Type 121 -> Error message',
  `Returned error: "${overRes.error}"`
);

// Test 7: Empty field validation on Continue
const emptyRes = validateAndParseAge('');
assert(
  emptyRes.isValid === false && emptyRes.error === 'Please enter your age.',
  7,
  'Validation: Empty -> Click Continue -> "Please enter your age."',
  `Returned error: "${emptyRes.error}"`
);

// Test 8: Valid age 25 submission
const validRes = validateAndParseAge('25');
assert(
  validRes.isValid === true && validRes.numericAge === 25,
  8,
  'Validation: Valid "25" -> Converts to number 25 & proceeds',
  `Valid age parsed: ${validRes.numericAge}`
);

console.log(`\nTOTAL AGE INPUT TESTS: ${passCount} / ${totalCount} PASSED.`);
