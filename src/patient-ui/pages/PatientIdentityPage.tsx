import React, { useState } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { PatientIdentity } from '../../data-models/patient';
import { User, CreditCard, Phone, MapPin, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface PatientIdentityPageProps {
  onContinue: () => void;
  onBack: () => void;
}

export const PatientIdentityPage: React.FC<PatientIdentityPageProps> = ({
  onContinue,
  onBack
}) => {
  const { t, language } = useLanguage();
  const { patient, setPatient } = useIntake();

  const [formData, setFormData] = useState<Partial<PatientIdentity>>({
    fullName: patient?.fullName || '',
    age: patient?.age || 35,
    gender: patient?.gender || 'male',
    phoneNumber: patient?.phoneNumber || '',
    abhaId: patient?.abhaId || '',
    city: patient?.city || '',
    emergencyContactPhone: patient?.emergencyContactPhone || ''
  });

  const handleGenerateDemoAbha = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const mockAbha = `91-4562-7819-${randomSuffix}`;
    setFormData(prev => ({ ...prev, abhaId: mockAbha }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPat: PatientIdentity = {
      id: patient?.id || `pat-${Date.now().toString(36)}`,
      fullName: formData.fullName?.trim() || 'Patient',
      age: Number(formData.age) || 30,
      gender: (formData.gender as any) || 'other',
      phoneNumber: formData.phoneNumber?.trim() || '+91 90000 00000',
      abhaId: formData.abhaId?.trim() || undefined,
      city: formData.city?.trim() || 'Jaipur',
      emergencyContactPhone: formData.emergencyContactPhone?.trim() || undefined,
      preferredLanguage: language,
      createdAt: patient?.createdAt || new Date().toISOString()
    };
    setPatient(newPat);
    onContinue();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl mx-auto w-full my-auto py-6">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-clinical-100 text-clinical-700 mx-auto flex items-center justify-center mb-3">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('identity.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {t('identity.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          {/* ABHA ID with generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-clinical-600" />
                {t('identity.abha_label')}
              </label>
              <button
                type="button"
                onClick={handleGenerateDemoAbha}
                className="text-[11px] font-semibold text-clinical-700 hover:text-clinical-900 bg-clinical-50 hover:bg-clinical-100 px-2 py-0.5 rounded-lg border border-clinical-200 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {t('identity.abha_demo_btn')}
              </button>
            </div>
            <input
              type="text"
              value={formData.abhaId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, abhaId: e.target.value }))}
              placeholder={t('identity.abha_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {t('identity.name_label')} *
            </label>
            <input
              type="text"
              required
              value={formData.fullName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder={t('identity.name_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800"
            />
          </div>

          {/* Age and Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('identity.age_label')} *
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={formData.age || 35}
                onChange={(e) => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('identity.gender_label')} *
              </label>
              <select
                value={formData.gender || 'male'}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800 bg-white"
              >
                <option value="male">{t('identity.gender_male')}</option>
                <option value="female">{t('identity.gender_female')}</option>
                <option value="other">{t('identity.gender_other')}</option>
              </select>
            </div>
          </div>

          {/* Phone and City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('identity.phone_label')} *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('identity.city_label')}
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. New Delhi / Chennai"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-clinical-500 focus:ring-2 focus:ring-clinical-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-clinical-600 to-teal-600 hover:from-clinical-700 hover:to-teal-700 text-white font-bold text-base shadow-md shadow-clinical-200 transition-all"
            >
              <span>{t('identity.continue_btn')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
