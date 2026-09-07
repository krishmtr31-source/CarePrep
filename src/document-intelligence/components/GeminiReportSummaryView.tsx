import React from 'react';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Stethoscope, 
  Building2, 
  User, 
  Calendar, 
  Pill, 
  Activity, 
  Info, 
  Printer, 
  Eye,
  AlertTriangle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { ExtractedDocumentData, GeminiMedicalDocumentAnalysis } from '../models/document';

interface GeminiReportSummaryViewProps {
  document: ExtractedDocumentData;
  isDoctorView?: boolean;
  onViewOriginal?: () => void;
}

export const GeminiReportSummaryView: React.FC<GeminiReportSummaryViewProps> = ({
  document,
  isDoctorView = false,
  onViewOriginal
}) => {
  const analysis: GeminiMedicalDocumentAnalysis | undefined = document.geminiAnalysis;

  // Metadata helper: prevents fake defaults from ever displaying
  const sanitizeMeta = (val?: string | null): string => {
    if (!val) return 'Not available in report';
    const trimmed = val.trim();
    if (/^(Patient Record|Attending Physician|Diagnostic Center \/ Clinic|Not stated|Unknown|None)$/i.test(trimmed)) {
      return 'Not available in report';
    }
    return trimmed;
  };

  const docType = analysis?.document?.document_type || (document.classification ? document.classification.replace('_', ' ') : 'LAB REPORT');
  const docDate = sanitizeMeta(analysis?.document?.document_date || document.detectedDate);
  const hospital = sanitizeMeta(analysis?.document?.hospital_or_lab || document.facilityName);
  const doctor = sanitizeMeta(analysis?.document?.doctor_name || document.doctorName);

  const patientName = sanitizeMeta(analysis?.patient?.name || (document.patientId ? `Patient ${document.patientId}` : null));
  const patientAge = analysis?.patient?.age;
  const patientGender = analysis?.patient?.gender && !/not stated/i.test(analysis.patient.gender) ? analysis.patient.gender : undefined;
  const patientId = analysis?.patient?.patient_id && !/not stated/i.test(analysis.patient.patient_id) 
    ? analysis.patient.patient_id 
    : (document.patientId || 'Not available in report');

  // Extract lab results from analysis or document.labResults
  const labResults = (analysis?.laboratory_results && analysis.laboratory_results.length > 0)
    ? analysis.laboratory_results.map(l => ({
        test_name: l.test_name || (l as any).testName,
        value: l.value,
        unit: l.unit,
        reference_range: l.reference_range || (l as any).referenceRange || 'Not specified in report',
        status: ((l.status || 'unknown').toLowerCase()) as 'normal' | 'high' | 'low' | 'abnormal' | 'borderline' | 'unknown'
      }))
    : document.labResults.map(l => ({
        test_name: l.testName,
        value: l.resultValue || String(l.value ?? ''),
        unit: l.unit,
        reference_range: l.referenceRange || l.sourceReferenceRange?.raw || 'Not specified in report',
        status: ((l.status || (l.flag === 'HIGH' ? 'high' : l.flag === 'LOW' ? 'low' : l.flag === 'NORMAL' ? 'normal' : 'unknown')).toLowerCase()) as any
      }));

  const medications = (analysis?.medications && analysis.medications.length > 0)
    ? analysis.medications
    : document.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration
      }));

  const diagnoses = analysis?.diagnoses_or_conditions_mentioned || document.diagnoses.map(d => d.conditionName);
  const symptoms = analysis?.symptoms_mentioned || [];
  const missingInfo = (analysis?.missing_or_unclear_information || document.unreliableFields || [])
    .filter(f => !/Degraded scan or unstandardized layout/i.test(f) || labResults.length === 0);
  const followUp = analysis?.follow_up_information || [];

  // Key findings and summaries
  const keyFindings: string[] = analysis?.summary?.key_findings || [];
  const observations: string[] = analysis?.summary?.important_observations || [];
  const mainPurpose = analysis?.summary?.main_purpose || document.summaryNote || (
    labResults.length > 0 
      ? `Extracted and structured ${labResults.length} clinical laboratory parameter(s) with document-printed biological reference intervals.`
      : 'Diagnostic documentation evaluation.'
  );

  const patientSummary = analysis?.patient_friendly_summary || document.summaryNote || (
    labResults.length > 0
      ? `Your laboratory report has been analyzed. A total of ${labResults.length} laboratory test parameter(s) were extracted and compared against reference intervals for your physician's review.`
      : 'Your document was evaluated and structured for your physician.'
  );

  const doctorReviewSummary = analysis?.doctor_review_summary || document.summaryNote || (
    labResults.length > 0
      ? `Comprehensive panel analysis: ${labResults.length} parameters extracted. Reference ranges derived directly from document source. Physical correlation recommended.`
      : 'Extracted documentation details ready for clinical correlation.'
  );

  // Identify abnormal/borderline results
  const abnormalLabs = labResults.filter(l => l.status === 'high' || l.status === 'low' || l.status === 'abnormal' || l.status === 'borderline');

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Normal
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            High
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Low
          </span>
        );
      case 'borderline':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Borderline
          </span>
        );
      case 'abnormal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Abnormal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            Reported
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Medical Compliance & Disclaimer Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDoctorView 
          ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
          : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isDoctorView ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold">
              {isDoctorView 
                ? 'Clinical Document Understanding • CarePrep AI Verified' 
                : 'AI-Assisted Document Summary'}
            </h4>
            <p className="text-xs opacity-90 mt-0.5">
              {isDoctorView 
                ? 'AI-assisted information. Verify against the original document before clinical use.' 
                : 'Please discuss these results with your healthcare professional. Do not alter medications without physician consultation.'}
            </p>
          </div>
        </div>

        {onViewOriginal && (
          <button
            type="button"
            onClick={onViewOriginal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>View Original Document</span>
          </button>
        )}
      </div>

      {/* 2. Document & Patient Header Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Metadata */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Information</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Document Type</span>
              <span className="font-bold text-slate-900 capitalize">{docType}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">Report Date</span>
              <span className="font-semibold text-slate-800">{docDate}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">Facility / Laboratory</span>
              <span className="font-semibold text-slate-800">{hospital}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">Consulting Doctor</span>
              <span className="font-semibold text-slate-800">{doctor}</span>
            </div>
          </div>
        </div>

        {/* Patient Metadata */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient Details</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Patient Name</span>
              <span className="font-bold text-slate-900">{patientName}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">Age &amp; Gender</span>
              <span className="font-semibold text-slate-800">
                {patientAge ? `${patientAge} yrs` : 'Not available in report'} {patientGender ? `• ${patientGender}` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">Patient ID / MRN</span>
              <span className="font-mono font-bold text-emerald-700">{patientId}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-50">
              <span className="text-slate-500">File Name</span>
              <span className="font-mono text-slate-600 truncate max-w-[200px]" title={document.fileName}>
                {document.fileName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Extracted Laboratory Results Table */}
      {labResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Extracted Laboratory Results</h3>
              <span className="text-xs text-slate-500">({labResults.length} parameter{labResults.length !== 1 ? 's' : ''} analyzed)</span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Source: uploaded_lab_report
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Reference Range</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labResults.map((lab, idx) => {
                  const isAbnormal = lab.status === 'high' || lab.status === 'low' || lab.status === 'abnormal' || lab.status === 'borderline';
                  return (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isAbnormal ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {lab.test_name}
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold ${
                        isAbnormal ? 'text-rose-700' : 'text-slate-800'
                      }`}>
                        {lab.value}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {lab.unit || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {lab.reference_range || 'Not specified in report'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {getStatusBadge(lab.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Key Findings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Findings</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
          {mainPurpose}
        </p>

        {keyFindings.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-800">Clinical Observations:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {keyFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {observations.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-800">Notable Parameters:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {observations.map((obs, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Abnormal / Borderline Results */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${abnormalLabs.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Abnormal / Borderline Results</h3>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            abnormalLabs.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {abnormalLabs.length > 0 ? `${abnormalLabs.length} Flagged` : '0 Abnormal'}
          </span>
        </div>

        {abnormalLabs.length > 0 ? (
          <div className="space-y-3">
            {abnormalLabs.map((abn, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span className="text-sm">{abn.test_name}</span>
                  {getStatusBadge(abn.status)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500">Observed Value: </span>
                    <span className="font-mono font-bold text-rose-700">{abn.value} {abn.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reference Interval: </span>
                    <span className="font-medium text-slate-800">{abn.reference_range}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500">Variance: </span>
                    <span className="font-medium text-amber-900 capitalize">{abn.status} vs reference</span>
                  </div>
                </div>
                <div className="pt-1 text-[11px] text-amber-900 italic">
                  Note: Cautious physician interpretation recommended. Consider clinical context, fasting state, and current medications.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>All extracted laboratory parameters are within biological reference intervals.</span>
          </div>
        )}
      </div>

      {/* 6. Plain-Language Summary & Doctor Review Synthesis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <User className="w-3.5 h-3.5" />
              <span>Plain-Language Patient Summary</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {patientSummary}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor Review Synthesis</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {doctorReviewSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Questions for Doctor & Recommended Follow-up */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Info className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Questions for Doctor &amp; Recommended Follow-up</h3>
        </div>

        <div className="space-y-3 text-xs">
          {followUp.length > 0 ? (
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-800">Suggested discussion topics for your consultation:</div>
              <ul className="space-y-1 text-slate-600">
                {followUp.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-800">Suggested questions for your upcoming doctor visit:</div>
              <ul className="space-y-1 text-slate-600">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>How do these laboratory findings correlate with my overall health status?</span>
                </li>
                {abnormalLabs.length > 0 && (
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>Do the flagged parameters ({abnormalLabs.map(a => a.test_name).join(', ')}) require re-testing or lifestyle adjustments?</span>
                  </li>
                )}
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>When should my next routine monitoring panel be scheduled?</span>
                </li>
              </ul>
            </div>
          )}

          {missingInfo.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-amber-800 font-semibold mb-1">Items for Clinician Clarification:</div>
              <ul className="space-y-1 text-slate-600">
                {missingInfo.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 8. Clinical Context: Diagnoses & Symptoms (Zero hallucination policy) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Stethoscope className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Context (Diagnoses &amp; Symptoms)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5">
            <div className="text-slate-500 font-semibold">Diagnoses / Indications:</div>
            {diagnoses.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {diagnoses.map((diag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    {diag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 italic p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                No diagnosis was provided in this report.
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-slate-500 font-semibold">Reported Symptoms:</div>
            {symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map((sym, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    {sym}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 italic p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                No symptoms were provided in the available patient information.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400 font-mono">
          CarePrep Clinical Intelligence • Extracted: {new Date(document.uploadedAt).toLocaleString()}
        </div>

        <div className="flex items-center gap-2">
          {onViewOriginal && (
            <button
              type="button"
              onClick={onViewOriginal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>View Original Document</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};
