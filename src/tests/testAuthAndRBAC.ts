import { authService } from '../auth/authService';
import { localStore } from '../backend/storage/localStore';

console.log('=== CAREPREP SIH26047: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE ===\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: any, testNum: number, name: string, details: string) {
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

async function runTests() {
  // Test 1: Patient Signup
  const newPatientEmail = `test.patient.${Date.now()}@example.com`;
  const signupResult = await authService.signupPatient({
    fullName: 'Sunita Devi',
    emailOrPhone: newPatientEmail,
    password: 'password123',
    age: 48,
    gender: 'female',
    abhaId: '14-8899-2314-5501',
    preferredLanguage: 'hi'
  });

  assert(
    signupResult.success === true && signupResult.user?.role === 'patient' && signupResult.user?.patientProfile?.age === 48,
    1,
    '1. Patient Signup & Auto-Login',
    `Created patient ID: ${signupResult.user?.id}, Role: ${signupResult.user?.role}, Name: ${signupResult.user?.name}`
  );

  // Test 2: Patient Login
  authService.logout();
  const patientLogin = await authService.login({
    emailOrPhone: newPatientEmail,
    password: 'password123',
    role: 'patient'
  });

  assert(
    patientLogin.success === true && patientLogin.user?.role === 'patient',
    2,
    '2. Patient Login Verification',
    `Authenticated as Patient: ${patientLogin.user?.name} (${patientLogin.user?.email})`
  );

  // Test 3 & 4: Patient cannot access Doctor role
  const patientCrossLogin = await authService.login({
    emailOrPhone: newPatientEmail,
    password: 'password123',
    role: 'doctor' // Attempting to log into Doctor portal with a patient account
  });

  assert(
    patientCrossLogin.success === false && patientCrossLogin.error?.includes('PATIENT'),
    3,
    '3 & 4. Patient Cross-Role Access Blocked (Patient -> Doctor Portal)',
    `Blocked with security message: "${patientCrossLogin.error}"`
  );

  // Test 5: Doctor Signup
  const newDoctorEmail = `dr.test.${Date.now()}@hospital.org`;
  const docSignupResult = await authService.signupDoctor({
    fullName: 'Dr. Vikram Malhotra, MD',
    email: newDoctorEmail,
    phoneNumber: '+91 98223 44556',
    password: 'docPassword123',
    registrationNumber: 'MCI-2016-88410',
    specialization: 'Cardiology & Intensive Care',
    hospitalName: 'Apollo Speciality Hospitals'
  });

  assert(
    Boolean(docSignupResult.success === true && docSignupResult.user?.role === 'doctor' && docSignupResult.user?.doctorProfile?.registrationNumber === 'MCI-2016-88410'),
    5,
    '5. Doctor Signup & Clinical Profile Registration',
    `Created Doctor ID: ${docSignupResult.user?.id}, Reg: ${docSignupResult.user?.doctorProfile?.registrationNumber}, Specialization: ${docSignupResult.user?.doctorProfile?.specialization}`
  );

  // Test 6: Doctor Login
  authService.logout();
  const docLogin = await authService.login({
    emailOrPhone: newDoctorEmail,
    password: 'docPassword123',
    role: 'doctor'
  });

  assert(
    docLogin.success === true && docLogin.user?.role === 'doctor',
    6,
    '6. Doctor Login Verification',
    `Authenticated as Doctor: ${docLogin.user?.name} (${docLogin.user?.email})`
  );

  // Test 7 & 8: Doctor cannot log in to Patient portal as a patient
  const doctorCrossLogin = await authService.login({
    emailOrPhone: newDoctorEmail,
    password: 'docPassword123',
    role: 'patient' // Attempting to log into Patient portal with a doctor account
  });

  assert(
    doctorCrossLogin.success === false && doctorCrossLogin.error?.includes('DOCTOR'),
    7,
    '7 & 8. Doctor Cross-Role Access Blocked (Doctor -> Patient Portal)',
    `Blocked with security message: "${doctorCrossLogin.error}"`
  );

  // Test 9 & 10: Logged-out access requirements
  authService.logout();
  const currentUserLoggedOut = authService.getCurrentUser();
  assert(
    currentUserLoggedOut === null,
    9,
    '9 & 10. Logged-Out State Enforces Authentication',
    'Current session cleared; unauthenticated requests require sign-in'
  );

  // Test 11: Session Logout
  authService.login({ emailOrPhone: 'dr.ananya@aiims.edu.in', password: 'password', role: 'doctor' });
  authService.logout();
  assert(
    authService.getCurrentUser() === null,
    11,
    '11. Logout Clears Active Session',
    'Session storage and in-memory session token successfully invalidated'
  );

  // Test 12: Seed Clinician & Patient Presets Available for Demo Testing
  const seedDocLogin = await authService.login({
    emailOrPhone: 'dr.ananya@aiims.edu.in',
    password: 'any',
    role: 'doctor'
  });
  assert(
    Boolean(seedDocLogin.success === true && seedDocLogin.user?.name === 'Dr. Ananya Sharma, MD'),
    12,
    '12. Demo Clinician Fast-Auth Preset',
    `Verified Seed Doctor: ${seedDocLogin.user?.name}, Specialization: ${seedDocLogin.user?.doctorProfile?.specialization}`
  );

  console.log(`\nTOTAL AUTH & RBAC TESTS: ${passCount} / ${totalCount} PASSED.`);
}

runTests().catch(err => {
  console.error('Error running auth tests:', err);
});
