import { WebSpeechToTextService } from '../ai-services/speech/SpeechToTextService';
import { WebTextToSpeechService } from '../ai-services/speech/TextToSpeechService';
import { SpeechErrorCode } from '../ai-services/speech/speechTypes';

console.log('==================================================');
console.log('  CAREPREP SPEECH RECOGNITION TEST SUITE');
console.log('==================================================\n');

const stt = new WebSpeechToTextService();
const tts = new WebTextToSpeechService();

// 1. Language BCP-47 Mapping Tests
const langTests = [
  { input: 'en', expected: 'en-IN', name: 'English locale mapping' },
  { input: 'english', expected: 'en-IN', name: 'English name mapping' },
  { input: 'hi', expected: 'hi-IN', name: 'Hindi locale mapping' },
  { input: 'hindi', expected: 'hi-IN', name: 'Hindi name mapping' },
  { input: 'ta', expected: 'ta-IN', name: 'Tamil locale mapping' },
  { input: 'tamil', expected: 'ta-IN', name: 'Tamil name mapping' },
  { input: 'hinglish', expected: 'hi-IN', name: 'Hinglish hybrid mapping' },
  { input: 'unknown', expected: 'en-IN', name: 'Default fallback mapping' }
];

console.log('--- 1. BCP-47 LANGUAGE MAPPINGS ---');
let langPassed = 0;
for (const test of langTests) {
  const result = stt.mapLanguageToBCP47(test.input);
  const pass = result === test.expected;
  if (pass) langPassed++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${test.name}: input="${test.input}" -> "${result}" (expected "${test.expected}")`);
}
console.log(`Language mapping result: ${langPassed}/${langTests.length} passed.\n`);

// 2. Initial State & API Surface Tests
console.log('--- 2. LIFECYCLE & METHODS ---');
const isInitialIdle = stt.getState() === 'IDLE';
console.log(`[${isInitialIdle ? 'PASS' : 'FAIL'}] Initial state is IDLE: ${stt.getState()}`);

const hasStartListening = typeof stt.startListening === 'function';
const hasStopListening = typeof stt.stopListening === 'function';
const hasAbort = typeof stt.abort === 'function';
const hasGetDiagnostics = typeof stt.getDiagnostics === 'function';
const hasLogDiagnostics = typeof stt.logDiagnostics === 'function';
console.log(`[${hasStartListening && hasStopListening && hasAbort && hasGetDiagnostics && hasLogDiagnostics ? 'PASS' : 'FAIL'}] All required STT interface methods are implemented.`);

// 3. Diagnostics Generation (Node environment simulation)
console.log('\n--- 3. DIAGNOSTICS OBJECT GENERATION ---');
stt.getDiagnostics('hi').then(diag => {
  console.log('Generated Diagnostic Info:');
  console.log(JSON.stringify(diag, null, 2));
  console.log('\n[PASS] Diagnostics generated successfully.');
  console.log('\n==================================================');
  console.log('  ALL UNIT & LIFECYCLE CHECKS COMPLETED');
  console.log('==================================================');
});
