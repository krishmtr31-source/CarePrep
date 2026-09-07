import { parseLabReportText } from '../document-intelligence/parsers/labReportParser';

const text = `
HAEMOGLOBIN 14.2 12--18 gm/dl.
TOTAL W.B.C. COUNT 6800 4000--11000 /cummm
D.L.C.(Differential Leucocyte Count)
NEUTROPHILS H 76.00 45--70 %
LYMPHOCYTES L 18.00 20--45 %
EOSINOPHILS 4.00 0--6 %
MONOCYTES 2.00 0--4 %
BASOPHILS 0.00 0--1 %
RBC (TRBC) 5.37 3.5--5.5 milli/cumm
PCV [Haematocrit] H 47.3 35--45 %
MCV(MEAN CORPUSCULAR VOL) 88.1 76--96 fl.
MCH (Mean Corpuscular Hb) L 26.4 27--31 pg
MCHC (Mean Corp.Hb Conc.) L 30.1 32--36 %
`;

const res = parseLabReportText(text, 'test-jatin', '18-JATIN_YADAV.pdf');
console.log('Parsed count:', res.labResults.length);
res.labResults.forEach(r => {
  console.log('TEST:', r.testName, '| VAL:', r.resultValue, '| UNIT:', r.unit, '| RANGE:', r.sourceReferenceRange?.raw, '| HAS_RANGE:', r.sourceReferenceRange?.hasSourceRange, '| FLAG:', r.flag);
});
