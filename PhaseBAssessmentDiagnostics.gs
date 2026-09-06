/**
 * PhaseBAssessmentDiagnostics.gs
 * READ-ONLY diagnostic helper for Phase B Assessment creation (Step 1 of the migration
 * plan: "create the 5 missing Assessments"). This file NEVER calls appendRow, setValues,
 * createRecord, or any other mutating API. It only reads the live 'Assessments' sheet
 * and returns/logs findings for a human to review before any write happens.
 *
 * v2: splits output into several smaller Logger.log() calls (the Apps Script execution
 * log truncates a single very large log entry) and tightens the ART-M2 dedup keyword to
 * the actual midterm word instead of the generic subject name.
 *
 * Safe to run any number of times. Delete this file once Step 1 is complete; it is not
 * part of the permanent Phase B module set.
 */
function DIAGNOSE_ASSESSMENT_CREATION_INPUTS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assessments');
  if (!sheet) {
    var out = { error: 'Assessments sheet not found' };
    Logger.log(JSON.stringify(out, null, 2));
    return out;
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var obj = {};
    for (var h = 0; h < header.length; h++) obj[header[h]] = row[h];
    rows.push(obj);
  }

  // ---- 1) Distinct values of 'type' and 'assessmentType' across the whole live table ----
  var distinctType = {};
  var distinctAssessmentType = {};
  rows.forEach(function (r) {
    if (r.type !== undefined && r.type !== '') distinctType[r.type] = (distinctType[r.type] || 0) + 1;
    if (r.assessmentType !== undefined && r.assessmentType !== '') {
      distinctAssessmentType[r.assessmentType] = (distinctAssessmentType[r.assessmentType] || 0) + 1;
    }
  });
  Logger.log('SECTION 1 -- distinctType: ' + JSON.stringify(distinctType));
  Logger.log('SECTION 1 -- distinctAssessmentType: ' + JSON.stringify(distinctAssessmentType));

  // ---- 2) Row counts per target course ----
  var targetCourseIds = ['ART-P3', 'ART-P5', 'ART-M2'];
  var byCourse = {};
  targetCourseIds.forEach(function (c) { byCourse[c] = []; });
  rows.forEach(function (r) {
    if (targetCourseIds.indexOf(r.courseId) !== -1) byCourse[r.courseId].push(r);
  });
  Logger.log('SECTION 2 -- byCourseCounts: ' + JSON.stringify({
    'ART-P3': byCourse['ART-P3'].length, 'ART-P5': byCourse['ART-P5'].length, 'ART-M2': byCourse['ART-M2'].length
  }));

  // ---- 3) Precise dedup probes for the 3 unit-scoped candidates: match on canonicalUnitId
  //         AND academicYear/term, reported WITHOUT a broad keyword filter so nothing is
  //         hidden by an accidental keyword miss -- every live row for that exact unit/year/
  //         term is shown, and a human/careful read decides if any is the same evidence item. ----
  var unitScopedCandidates = [
    { assignmentId: 'ASG-ART-P3-2569-T1-U03-coloredpencil', courseId: 'ART-P3', academicYear: 2569, term: 1, canonicalUnitId: 'UNIT-ART-P3-2569-T1-U03' },
    { assignmentId: 'ASG-ART-P3-2569-T2-U05-movement-5.3', courseId: 'ART-P3', academicYear: 2569, term: 2, canonicalUnitId: 'UNIT-ART-P3-2569-T2-U05' },
    { assignmentId: 'ASG-ART-P5-2569-T2-U07-worksheet-7-1', courseId: 'ART-P5', academicYear: 2569, term: 2, canonicalUnitId: 'UNIT-ART-P5-2569-T2-U07' }
  ];
  unitScopedCandidates.forEach(function (c) {
    var matches = rows.filter(function (r) {
      return r.courseId === c.courseId && String(r.academicYear) === String(c.academicYear) &&
        String(r.term) === String(c.term) && r.canonicalUnitId === c.canonicalUnitId;
    }).map(function (m) {
      return { id: m.id, title: m.title, type: m.type, assessmentType: m.assessmentType, maxScore: m.maxScore, weight: m.weight };
    });
    Logger.log('SECTION 3 -- ' + c.assignmentId + ' (unit=' + c.canonicalUnitId + '): ' + matches.length + ' live row(s) for this exact unit/year/term: ' + JSON.stringify(matches));
  });

  // ---- 4) ART-M2 course-level midterm probe: any live row whose title/type contains the
  //         actual midterm word (กลางภาค = midterm), for
  //         academicYear 2569, regardless of term (the manifest's own term field for these
  //         two rows is 'UNKNOWN'/2 -- inconsistent in the source manifest itself, not
  //         something to silently fix). ----
  var m2Midterm = rows.filter(function (r) {
    return r.courseId === 'ART-M2' && String(r.academicYear) === '2569' &&
      (String(r.title || '').indexOf('กลางภาค') !== -1 ||
       String(r.type || '').indexOf('กลางภาค') !== -1);
  }).map(function (r) {
    return { id: r.id, title: r.title, type: r.type, assessmentType: r.assessmentType, academicYear: r.academicYear, term: r.term, classId: r.classId, maxScore: r.maxScore, weight: r.weight };
  });
  Logger.log('SECTION 4 -- ART-M2 live rows whose title/type contains the midterm word (กลางภาค), academicYear 2569: ' + m2Midterm.length + ' found: ' + JSON.stringify(m2Midterm));

  // ---- 5) All distinct assessmentType values seen specifically on ART-M2 rows (to confirm
  //         UNIT_CHECK is a real, already-used enum value for this course, not just for P3/P5) ----
  var m2AssessmentTypes = {};
  byCourse['ART-M2'].forEach(function (r) {
    if (r.assessmentType) m2AssessmentTypes[r.assessmentType] = (m2AssessmentTypes[r.assessmentType] || 0) + 1;
  });
  Logger.log('SECTION 5 -- ART-M2 distinct assessmentType usage: ' + JSON.stringify(m2AssessmentTypes));

  // ---- 6) classId(s) actually seen on live ART-M2 / ART-P3 / ART-P5 rows (to cross-check
  //         against the classId already present on the 5 manifest rows) ----
  var classIdsSeenPerCourse = {};
  targetCourseIds.forEach(function (c) {
    var set = {};
    byCourse[c].forEach(function (r) { if (r.classId) set[r.classId] = true; });
    classIdsSeenPerCourse[c] = Object.keys(set);
  });
  Logger.log('SECTION 6 -- classIdsSeenPerCourse: ' + JSON.stringify(classIdsSeenPerCourse));

  Logger.log('DONE -- liveAssessmentsRowCount=' + rows.length + ' header=' + JSON.stringify(header));

  return { ok: true, note: 'See execution log SECTION 1-6 entries.' };
}
