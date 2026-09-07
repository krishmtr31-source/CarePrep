import dotenv from 'dotenv';
dotenv.config();

import {
  connectDB,
  disconnectDB,
  Hospital,
  Admin,
  Patient,
  Case,
  DoctorSummary
} from '../models';

async function seedDatabase() {
  console.log('--- Seeding CarePrep Database in MongoDB ---');

  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB.');

    // 1. Seed Hospital
    let hospitalDoc = await Hospital.findOne({ hospitalId: 'HOSP-DELHI-001' });
    if (!hospitalDoc) {
      hospitalDoc = await Hospital.create({
        hospitalId: 'HOSP-DELHI-001',
        name: 'CarePrep Central Apex Hospital & AYUSH Research Institute',
        registrationNumber: 'REG-NABH-2026-001',
        hospitalType: 'MULTI_SPECIALTY',
        contactNumber: '+91 11 2659 8700',
        emergencyHelpline: '108',
        email: 'apex.careprep@health.gov.in',
        website: 'https://careprep.health.gov.in',
        address: {
          street: 'Sri Aurobindo Marg, Ansari Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
          country: 'India'
        },
        geoCoordinates: {
          latitude: 28.5672,
          longitude: 77.2100
        },
        departments: [
          'Ayurveda',
          'Panchakarma',
          'General Medicine',
          'Cardiology',
          'Orthopedics',
          'Gastroenterology',
          'Emergency Care'
        ],
        ayushFacilitiesAvailable: true,
        ayushSpecialties: [
          'Kayachikitsa',
          'Panchakarma',
          'Shalya Tantra',
          'Yoga & Naturopathy'
        ],
        infrastructure: {
          totalBeds: 250,
          availableBeds: 68,
          icuBeds: 25,
          hasAmbulanceService: true,
          hasEmergency24x7: true,
          hasPharmacy: true,
          hasLaboratory: true
        },
        registeredDoctorsCount: 42,
        status: 'ACTIVE'
      });
      console.log('  [+] Created Hospital:', hospitalDoc.name);
    } else {
      console.log('  [*] Hospital already exists:', hospitalDoc.name);
    }

    // 2. Seed Super Admin & Doctor Admin
    const superAdminExists = await Admin.findOne({ username: 'avinash_admin' });
    if (!superAdminExists) {
      await Admin.create({
        adminId: 'ADM-001',
        fullName: 'Dr. Avinash Jha',
        username: 'avinash_admin',
        email: 'avinash.jha@careprep.health',
        passwordHash: 'CarePrepAdmin@2026',
        phoneNumber: '+91 98450 11223',
        role: 'SUPER_ADMIN',
        permissions: ['ALL_ACCESS']
      });
      console.log('  [+] Created Super Admin: avinash_admin (Pass: CarePrepAdmin@2026)');
    } else {
      console.log('  [*] Super Admin already exists.');
    }

    let doctorDoc = await Admin.findOne({ username: 'dr_sharma' });
    if (!doctorDoc) {
      doctorDoc = await Admin.create({
        adminId: 'DOC-001',
        fullName: 'Dr. Sunil Sharma, MD (Ayu)',
        username: 'dr_sharma',
        email: 'dr.sharma@careprep.health',
        passwordHash: 'DoctorPass@2026',
        phoneNumber: '+91 98110 33445',
        role: 'DOCTOR_ADMIN',
        hospitalId: hospitalDoc._id as any,
        department: 'Ayurveda',
        specialization: 'Kayachikitsa & Rheumatology',
        medicalLicenseNumber: 'DMC/AYU/2012/8472',
        permissions: [
          'VIEW_PATIENT_INTAKE',
          'EDIT_DOCTOR_SUMMARY',
          'APPROVE_TRIAGE',
          'MANAGE_PATIENTS',
          'EXPORT_REPORTS'
        ]
      });
      console.log('  [+] Created Doctor Admin: dr_sharma (Pass: DoctorPass@2026)');
    } else {
      console.log('  [*] Doctor Admin already exists.');
    }

    // 3. Seed Patients
    const patient1Exists = await Patient.findOne({ patientId: 'pat-seed-001' });
    if (!patient1Exists) {
      await Patient.create({
        patientId: 'pat-seed-001',
        abhaId: '91-4562-7819-2041',
        fullName: 'Rameshwar Sharma',
        age: 52,
        gender: 'male',
        phoneNumber: '+91 98451 22319',
        email: 'rameshwar.sharma@example.com',
        bloodGroup: 'B+',
        preferredLanguage: 'hi',
        hospitalId: hospitalDoc?._id,
        assignedDoctorId: doctorDoc?._id,
        address: {
          city: 'Jaipur',
          state: 'Rajasthan',
          postalCode: '302001',
          country: 'India'
        },
        emergencyContact: {
          name: 'Sunita Sharma',
          phoneNumber: '+91 98451 22320',
          relationship: 'Spouse'
        },
        consents: [{
          hasConsented: true,
          disclaimerAcknowledged: true,
          version: 'v1.0',
          scope: {
            symptomCollection: true,
            aiHistoryDrafting: true,
            physicianReviewOnly: true,
            anonymousQualityAudit: false
          }
        }],
        medicalProfile: {
          allergies: ['Penicillin'],
          chronicConditions: ['Hypertension', 'Mild Osteoarthritis'],
          currentMedications: ['Amlodipine 5mg OD'],
          familyHistory: ['Father had rheumatoid arthritis'],
          ayushProfile: {
            prakriti: 'Vata Predominant (Lean, Light, Quick, Sensitive to cold, Dry skin)',
            agni: 'Vishamagni (Irregular: sometimes intense hunger, sometimes no appetite)',
            koshtha: 'Krura Koshtha (Hard stools, prone to chronic constipation)',
            vyayamaShakti: 'Moderate Endurance'
          }
        }
      });
      console.log('  [+] Created Seed Patient: Rameshwar Sharma (pat-seed-001)');
    }

    const patient2Exists = await Patient.findOne({ patientId: 'pat-seed-002' });
    if (!patient2Exists) {
      await Patient.create({
        patientId: 'pat-seed-002',
        abhaId: '82-1920-3341-9011',
        fullName: 'Priya Meenakshi',
        age: 38,
        gender: 'female',
        phoneNumber: '+91 94440 18823',
        email: 'priya.meenakshi@example.com',
        bloodGroup: 'O+',
        preferredLanguage: 'ta',
        hospitalId: hospitalDoc?._id,
        assignedDoctorId: doctorDoc?._id,
        address: {
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India'
        },
        emergencyContact: {
          name: 'K. Meenakshi Sundaram',
          phoneNumber: '+91 94440 18824',
          relationship: 'Father'
        },
        consents: [{
          hasConsented: true,
          disclaimerAcknowledged: true,
          version: 'v1.0',
          scope: {
            symptomCollection: true,
            aiHistoryDrafting: true,
            physicianReviewOnly: true,
            anonymousQualityAudit: true
          }
        }],
        medicalProfile: {
          allergies: [],
          chronicConditions: ['GERD / Acid Peptic Disorder'],
          currentMedications: ['Pantoprazole 40mg (OD before food)'],
          familyHistory: []
        }
      });
      console.log('  [+] Created Seed Patient: Priya Meenakshi (pat-seed-002)');
    }

    // 4. Seed Cases
    const case1Exists = await Case.findOne({ caseId: 'case-seed-001' });
    if (!case1Exists) {
      await Case.create({
        caseId: 'case-seed-001',
        patientId: 'pat-seed-001',
        hospitalId: hospitalDoc?._id,
        mode: 'AYUSH',
        status: 'COMPLETED',
        chiefComplaint: 'Bilateral knee stiffness, swelling and lower back ache for 4 months (Sandhivata)',
        language: 'hi',
        redFlagsDetected: [],
        startedAt: new Date(Date.now() - 3600000 * 2),
        completedAt: new Date(Date.now() - 3600000 * 1.5),
        answers: [
          {
            questionId: 'ayush_chief_complaint',
            step: 'CHIEF_COMPLAINT',
            selectedOptionIds: ['Joint Pain, Stiffness & Sciatica (Sandhivata / Kati Shula)'],
            customText: 'Difficulty in climbing stairs and morning stiffness in knee joints.',
            audioProvenance: 'VOICE'
          }
        ]
      });
      console.log('  [+] Created Seed Case: case-seed-001');
    }

    console.log('\n[SUCCESS] Seeding completed successfully!');
    await disconnectDB();
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
