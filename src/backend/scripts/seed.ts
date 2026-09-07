/**
 * CarePrep MongoDB Development Seed Script
 * 
 * Run with:
 * npx tsx src/backend/scripts/seed.ts
 * 
 * IMPORTANT: This is for DEVELOPMENT / DEMONSTRATION testing only.
 * Production databases should NOT run this automatically.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load .env variables if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0 && !process.env[key.trim()]) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    }
  }
} catch (e) {}

import { Patient, MedicalHistory, Assessment, MedicalReport, Consultation, Prescription } from '../models';

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in .env file. Please configure MONGODB_URI first.');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB Atlas for development seeding...');
  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB Atlas:', mongoose.connection.name);

  console.log('🧹 Clearing existing test records (if any)...');
  await Promise.all([
    Patient.deleteMany({ patientId: /^usr-pat-demo-/ }),
    MedicalHistory.deleteMany({ patientId: /^usr-pat-demo-/ }),
    Assessment.deleteMany({ patientId: /^usr-pat-demo-/ }),
    MedicalReport.deleteMany({ patientId: /^usr-pat-demo-/ }),
    Consultation.deleteMany({ patientId: /^usr-pat-demo-/ }),
    Prescription.deleteMany({ patientId: /^usr-pat-demo-/ })
  ]);

  console.log('🌱 Seeding demo patient record...');
  const demoPatientId = 'usr-pat-demo-001';

  await Patient.create({
    patientId: demoPatientId,
    fullName: 'Rameshwar Sharma',
    email: 'rameshwar.sharma@example.com',
    phoneNumber: '+91 98451 22319',
    bloodGroup: 'B+',
    age: 52,
    gender: 'male',
    abhaId: '91-4562-7819-2041',
    address: { city: 'Jaipur' },
    preferredLanguage: 'hi'
  });

  console.log('🌱 Seeding demo medical history...');
  await MedicalHistory.create({
    patientId: demoPatientId,
    existingConditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension', 'Osteoarthritis Knee'],
    previousSurgeries: ['Appendectomy (2014)'],
    allergies: ['Penicillin', 'Sulfa drugs'],
    currentMedications: [
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', instructions: 'After meals' },
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', instructions: 'Morning' }
    ],
    familyHistory: ['Father: Type 2 Diabetes', 'Mother: Hypertension'],
    lifestyle: {
      diet: 'Vegetarian, low salt',
      smoking: 'Non-smoker',
      alcohol: 'Non-drinker',
      physicalActivity: 'Morning walk 25 mins daily',
      sleepHours: '6-7 hours'
    },
    otherRelevantHistory: 'Monitors fasting blood sugar weekly.'
  });

  console.log('🌱 Seeding demo pre-visit assessment...');
  await Assessment.create({
    assessmentId: 'asm-demo-001',
    patientId: demoPatientId,
    chiefComplaint: 'Bilateral knee pain and morning stiffness for 3 months',
    symptoms: ['Knee pain on climbing stairs', 'Morning stiffness 20 minutes', 'Occasional lower back ache'],
    symptomDuration: '3 months',
    socratesData: {
      site: 'Bilateral knee joints',
      onset: 'Gradual',
      character: 'Dull aching, aggravated by weight bearing',
      radiation: 'No radiation to feet',
      associations: 'Stiffness after resting',
      timing: 'Worse in the morning and after heavy walking',
      exacerbating: 'Stairs, prolonged standing',
      severity: 6
    },
    ayushData: {
      prakriti: 'Vata-Pitta',
      agni: 'Vishamagni',
      koshtha: 'Krura'
    },
    triageStatus: 'NORMAL',
    priority: 'ROUTINE',
    status: 'SUBMITTED_TO_DOCTOR',
    tokenNumber: 'CP-108',
    queuePosition: 2,
    language: 'hi'
  });

  console.log('🌱 Seeding demo medical report...');
  await MedicalReport.create({
    reportId: 'rep-demo-001',
    patientId: demoPatientId,
    fileName: 'Comprehensive_Metabolic_Panel.pdf',
    fileType: 'pdf',
    fileSize: 412000,
    processingStatus: 'COMPLETED',
    labResults: [
      { testName: 'Fasting Blood Glucose', value: '138', numericValue: 138, unit: 'mg/dL', referenceRange: '70 - 99', status: 'high', isAbnormal: true },
      { testName: 'HbA1c', value: '7.2', numericValue: 7.2, unit: '%', referenceRange: '4.0 - 5.6', status: 'high', isAbnormal: true },
      { testName: 'Serum Creatinine', value: '0.9', numericValue: 0.9, unit: 'mg/dL', referenceRange: '0.7 - 1.2', status: 'normal', isAbnormal: false },
      { testName: 'Hemoglobin', value: '14.2', numericValue: 14.2, unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'normal', isAbnormal: false }
    ],
    medications: [
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', duration: 'Ongoing' },
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', duration: 'Ongoing' }
    ],
    diagnoses: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
    hospitalDetails: {
      facilityName: 'SMS Hospital Central Laboratory, Jaipur',
      doctorName: 'Dr. S. K. Gupta, MD',
      reportDate: '2026-08-15'
    },
    aiSummary: {
      mainPurpose: 'Routine diabetic evaluation and renal safety panel',
      keyFindings: [
        'Fasting blood sugar elevated at 138 mg/dL',
        'HbA1c of 7.2% indicates sub-optimal glycaemic control over past 3 months',
        'Kidney function normal with Serum Creatinine at 0.9 mg/dL'
      ],
      importantObservations: ['Recommended endocrinology follow-up for metformin dosage titration.'],
      patientFriendlySummary: 'Your sugar levels are slightly higher than target range. Kidney function tests are normal.',
      doctorReviewSummary: 'Patient exhibits chronic DM-2 with moderate glycemic elevation. Review medication adherence.'
    }
  });

  console.log('✅ Development seeding complete!');
  console.log('Demo Patient ID:', demoPatientId);
  await mongoose.disconnect();
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
