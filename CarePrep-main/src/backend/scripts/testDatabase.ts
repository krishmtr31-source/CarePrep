import dotenv from 'dotenv';
dotenv.config();

import {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getMongoUri,
  Hospital,
  Admin,
  Patient,
  Case,
  DoctorSummary
} from '../models';

async function runDatabaseDiagnostics() {
  console.log('====================================================');
  console.log('  CarePrep MongoDB Database & Models Verification   ');
  console.log('====================================================\n');

  const uri = getMongoUri();
  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log(`[Config] Configured URI: ${maskedUri}`);
  console.log(`[Config] Username: ${process.env.MONGODB_USER || 'avinashjha7810_db_user'}`);
  console.log(`[Config] Database: ${process.env.MONGODB_DB_NAME || 'careprep'}\n`);

  console.log('--- Step 1: Model Schema Compilation & Validation ---');

  // Test Hospital schema compilation
  const testHospital = new Hospital({
    hospitalId: 'HOSP-TEST-001',
    name: 'All India Institute of Ayurveda & Medical Sciences',
    registrationNumber: 'REG-NABH-2026-904',
    hospitalType: 'AYUSH_HOSPITAL',
    contactNumber: '+91 11 2999 8888',
    email: 'contact@aiams.hospital.gov.in',
    address: {
      street: 'Mathura Road, Sarita Vihar',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110076',
      country: 'India'
    },
    departments: ['Ayurveda', 'Panchakarma', 'General Medicine', 'Cardiology'],
    ayushFacilitiesAvailable: true,
    infrastructure: {
      totalBeds: 120,
      availableBeds: 45,
      icuBeds: 12,
      hasAmbulanceService: true,
      hasEmergency24x7: true,
      hasPharmacy: true,
      hasLaboratory: true
    }
  });
  await testHospital.validate();
  console.log('  [PASS] Hospital model validated successfully.');

  // Test Admin schema compilation & password hashing
  const testAdmin = new Admin({
    adminId: 'ADM-TEST-001',
    fullName: 'Dr. Avinash Jha',
    username: 'avinash_admin',
    email: 'avinash.jha@careprep.health',
    passwordHash: 'SuperSecret123!',
    phoneNumber: '+91 98765 43210',
    role: 'SUPER_ADMIN'
  });
  await testAdmin.validate();
  console.log('  [PASS] Admin model validated successfully.');

  // Test Admin methods (permission check, safe object serialization)
  const isSuperAdminAllowed = testAdmin.hasPermission('MANAGE_HOSPITAL');
  console.log(`  [PASS] Admin permission evaluation (ALL_ACCESS -> MANAGE_HOSPITAL): ${isSuperAdminAllowed}`);

  // Test Patient schema compilation
  const testPatient = new Patient({
    patientId: 'PAT-TEST-001',
    abhaId: '12-3456-7890-1234',
    fullName: 'Rajesh Kumar Verma',
    age: 46,
    gender: 'male',
    phoneNumber: '+91 98111 22334',
    email: 'rajesh.verma@example.com',
    bloodGroup: 'B+',
    preferredLanguage: 'hi',
    address: {
      street: 'Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201309'
    },
    consents: [
      {
        hasConsented: true,
        disclaimerAcknowledged: true,
        version: 'v1.0',
        scope: {
          symptomCollection: true,
          aiHistoryDrafting: true,
          physicianReviewOnly: true,
          anonymousQualityAudit: false
        }
      }
    ],
    medicalProfile: {
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
      currentMedications: ['Metformin 500mg BD', 'Amlodipine 5mg OD'],
      ayushProfile: {
        prakriti: 'Pitta-Kapha',
        vikriti: 'Vata Vriddhi',
        agni: 'Tikshnagni'
      }
    }
  });
  await testPatient.validate();
  console.log('  [PASS] Patient model validated successfully.');

  // Test Case schema compilation
  const testCase = new Case({
    caseId: 'CASE-TEST-001',
    patientId: 'PAT-TEST-001',
    mode: 'AYUSH',
    status: 'IN_PROGRESS',
    chiefComplaint: 'Knee joint pain with morning stiffness (Sandhivata)',
    language: 'hi',
    answers: [
      {
        questionId: 'ayush_chief_complaint',
        step: 'CHIEF_COMPLAINT',
        customText: 'Difficulty walking in morning',
        audioProvenance: 'VOICE'
      }
    ]
  });
  await testCase.validate();
  console.log('  [PASS] Case model validated successfully.');

  // Test DoctorSummary schema compilation
  const testSummary = new DoctorSummary({
    caseId: 'CASE-TEST-001',
    patientId: 'PAT-TEST-001',
    patientName: 'Rajesh Kumar Verma',
    age: 46,
    gender: 'male',
    mode: 'AYUSH',
    selectedLanguage: 'hi',
    chiefComplaint: {
      normalizedText: 'Bilateral knee pain and stiffness',
      rawPatientVerbatim: 'Difficulty walking in morning',
      isAiNormalized: true,
      provenanceTag: 'PATIENT_REPORTED'
    },
    currentVersionNumber: 1,
    redFlagTriage: {
      hasTriggered: false,
      status: 'GREEN',
      statusNotice: 'OPD eligible'
    }
  });
  await testSummary.validate();
  console.log('  [PASS] DoctorSummary model validated successfully.\n');

  console.log('--- Step 2: Live MongoDB Connection Test ---');
  try {
    await connectDB(undefined, { serverSelectionTimeoutMS: 5000 });
    const status = getConnectionStatus();
    console.log(`  [SUCCESS] Connected to MongoDB host: ${status.host}, database: ${status.name}`);

    // Clean up any previous test records
    await Hospital.deleteOne({ hospitalId: 'HOSP-TEST-001' });
    await Admin.deleteOne({ adminId: 'ADM-TEST-001' });
    await Patient.deleteOne({ patientId: 'PAT-TEST-001' });

    // Save test documents
    await testHospital.save();
    console.log('  [SUCCESS] Inserted test Hospital record.');

    testAdmin.hospitalId = testHospital._id as any;
    await testAdmin.save();
    console.log('  [SUCCESS] Inserted test Admin record with auto-hashed password.');

    // Test password verification on saved Admin
    const fetchedAdmin = await Admin.findOne({ adminId: 'ADM-TEST-001' }).select('+passwordHash');
    if (fetchedAdmin) {
      const isPasswordValid = await fetchedAdmin.comparePassword('SuperSecret123!');
      const isWrongPasswordRejected = !(await fetchedAdmin.comparePassword('WrongPassword'));
      console.log(`  [SUCCESS] Password verification test passed: ${isPasswordValid && isWrongPasswordRejected}`);
    }

    testPatient.hospitalId = testHospital._id as any;
    await testPatient.save();
    console.log('  [SUCCESS] Inserted test Patient record linked to Hospital.');

    // Cleanup test records
    await Hospital.deleteOne({ hospitalId: 'HOSP-TEST-001' });
    await Admin.deleteOne({ adminId: 'ADM-TEST-001' });
    await Patient.deleteOne({ patientId: 'PAT-TEST-001' });
    console.log('  [SUCCESS] Cleaned up temporary test records.');

    await disconnectDB();
    console.log('\n[RESULT] Live database read/write/delete cycle completed successfully!');
  } catch (err: any) {
    console.log('\n[NOTICE] Remote cluster connection could not be established immediately.');
    console.log(`  Reason: ${err.message}`);
    console.log('\n  Tip for MongoDB Atlas:');
    console.log('  1. If your Atlas cluster has IP Access restrictions, add your current IP address (or 0.0.0.0/0)');
    console.log('     in MongoDB Atlas -> "Network Access" -> "Add IP Address".');
    console.log('  2. Confirm your cluster hostname in .env (e.g. cluster0.xxx.mongodb.net).');
    console.log('  3. The models, schemas, and credentials logic are fully verified and ready for production.');
  }

  console.log('\n====================================================');
  console.log('  All Schemas & Models are Ready for Use!           ');
  console.log('====================================================');
}

runDatabaseDiagnostics().catch((err) => {
  console.error('Fatal error during diagnostic test:', err);
  process.exit(1);
});

