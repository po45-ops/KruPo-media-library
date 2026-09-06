/**
 * PhaseBCreateAssessments.gs
 * ONE-TIME, SCOPED write step: Step 1 of the Phase B migration plan -- create the 5
 * Assessment rows that the frozen manifest's writeAction === 'CREATE_ASSIGNMENT_AND_NEW_ASSESSMENT'
 * rows need, and nothing else.
 *
 * Safety properties:
 *  - Touches ONLY the 'Assessments' sheet, via the generic createRecord() in Database.gs
 *    (never appendRow/setValues directly -- reuses the exact same code path every other
 *    Assessment row in this system was created through).
 *  - Re-checks for an existing equivalent Assessment immediately before each create (defense
 *    in depth on top of the DIAGNOSE_ASSESSMENT_CREATION_INPUTS read-only check already run).
 *  - Creates AT MOST 5 rows. Refuses to run twice: if it finds it already created a row for a
 *    given assignmentId (tracked via a dedicated marker sheet 'PhaseBAssessmentCreationLog'),
 *    it skips that one rather than creating a duplicate.
 *  - IDs: omits `id` from the data passed to createRecord(), so Database.gs's own default
 *    (Utilities.getUuid()) mints it -- the same convention already proven for every
 *    PRETEST/POSTTEST/WORK_HABIT/UNIT_CHECK row in this system (verified read-only: no
 *    Production code parses or depends on the 'ASM-' string shape anywhere it was checked --
 *    Database.gs, AssessmentV2.gs (full file), Api.gs, Config.gs all treat Assessments.id as
 *    an opaque key).
 *  - Never touches Assignments, StudentSubmissions, or any sheet other than Assessments and
 *    its own tiny marker sheet.
 */

var PHASEB_ASSESSMENT_CANDIDATES = [
  {
    assignmentId: 'ASG-ART-P3-2569-T1-U03-coloredpencil',
    courseId: 'ART-P3', classId: 'fe46e5cc-18e5-432f-8f11-21f0cf831da5',
    academicYear: 2569, term: 1,
    canonicalUnitId: 'UNIT-ART-P3-2569-T1-U03', lessonPlanId: 'LP-ART-P3-2569-T1-U03-P003', scheduleId: null,
    title: 'ผลงานทัศนศิลป์เทคนิคสีไม้ + นำเสนอผลงาน',
    assessmentType: 'GRADE_EVIDENCE',
    sourceReference: 'แผน 3 สีไม้ฯ.docx'
  },
  {
    assignmentId: 'ASG-ART-P3-2569-T2-U05-movement-5.3',
    courseId: 'ART-P3', classId: 'fe46e5cc-18e5-432f-8f11-21f0cf831da5',
    academicYear: 2569, term: 2,
    canonicalUnitId: 'UNIT-ART-P3-2569-T2-U05', lessonPlanId: 'LP-ART-P3-2569-T2-U05-P005', scheduleId: null,
    title: 'ใบกิจกรรมที่ 5.3 เรื่อง การเคลื่อนไหวประกอบเพลงไทย + นำเสนอ',
    assessmentType: 'GRADE_EVIDENCE',
    sourceReference: 'แผน5 การเคลื่อนไหวประกอบเพลง.docx'
  },
  {
    assignmentId: 'ASG-ART-P5-2569-T2-U07-worksheet-7-1',
    courseId: 'ART-P5', classId: '29a037e5-bb7b-4375-9c05-b125820e9e85',
    academicYear: 2569, term: 2,
    canonicalUnitId: 'UNIT-ART-P5-2569-T2-U07', lessonPlanId: null, scheduleId: null,
    title: 'ใบงานที่ 7.1 เรื่อง การแสดงนาฏศิลป์',
    assessmentType: 'FORMATIVE',
    sourceReference: 'แผน1 การแสดงนาฏศิลป์.docx — §7 แผนฯที่1 items 3-4'
  },
  {
    assignmentId: 'NEW-ASG-M2-0085',
    courseId: 'ART-M2', classId: '0dd457be-6851-4ad0-8434-f987e38b1acf',
    academicYear: '2569', term: 'UNKNOWN',
    canonicalUnitId: null, lessonPlanId: null, scheduleId: null,
    title: 'ข้อสอบกลางภาค ภาคเรียนที่ 1 วิชาทัศนศิลป์ ม.2 (METeMid1-ARTM.2-26-1.docx)',
    assessmentType: 'UNIT_CHECK',
    sourceReference: 'n/a (course-level; see reconciliation notes for source doc filename)'
  },
  {
    assignmentId: 'NEW-ASG-M2-0086',
    courseId: 'ART-M2', classId: '0dd457be-6851-4ad0-8434-f987e38b1acf',
    academicYear: '2569', term: 2,
    canonicalUnitId: null, lessonPlanId: null, scheduleId: null,
    title: 'ข้อสอบกลางภาค ภาคเรียนที่ 1 วิชาดนตรี-นาฏศิลป์ ม.2 (MFTeMid1-ARTM.2-26-1.docx)',
    assessmentType: 'UNIT_CHECK',
    sourceReference: 'n/a (course-level; see reconciliation notes for source doc filename)'
  }
];

function CREATE_5_MISSING_ASSESSMENTS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var assessmentsSheet = ss.getSheetByName('Assessments');
  if (!assessmentsSheet) throw new Error('Assessments sheet not found -- aborting, nothing written.');

  var logSheet = ss.getSheetByName('PhaseBAssessmentCreationLog');
  if (!logSheet) {
    logSheet = ss.insertSheet('PhaseBAssessmentCreationLog');
    logSheet.appendRow(['assignmentId', 'createdAssessmentId', 'timestamp']);
  }
  var logData = logSheet.getDataRange().getValues();
  var alreadyCreated = {};
  for (var i = 1; i < logData.length; i++) alreadyCreated[logData[i][0]] = logData[i][1];

  // Live re-check right before writing (defense in depth on top of the earlier read-only diagnostic).
  var liveData = assessmentsSheet.getDataRange().getValues();
  var liveHeader = liveData[0];
  var liveRows = [];
  for (i = 1; i < liveData.length; i++) {
    var obj = {};
    for (var h = 0; h < liveHeader.length; h++) obj[liveHeader[h]] = liveData[i][h];
    liveRows.push(obj);
  }

  var results = [];

  PHASEB_ASSESSMENT_CANDIDATES.forEach(function (c) {
    if (alreadyCreated[c.assignmentId]) {
      results.push({ assignmentId: c.assignmentId, status: 'SKIPPED_ALREADY_CREATED', assessmentId: alreadyCreated[c.assignmentId] });
      return;
    }

    // Defense-in-depth dedup: same exact-title match within the same course/year/(unit or course-level).
    var dup = liveRows.filter(function (r) {
      if (str_(r.courseId) !== c.courseId) return false;
      if (String(r.academicYear) !== String(c.academicYear)) return false;
      if (c.canonicalUnitId) return r.canonicalUnitId === c.canonicalUnitId && str_(r.title) === c.title;
      return str_(r.title) === c.title;
    });
    if (dup.length) {
      results.push({ assignmentId: c.assignmentId, status: 'BLOCKED_DUPLICATE_FOUND', existing: dup.map(function (d) { return d.id; }) });
      return;
    }

    // Derive subjectId / unit / status / isRequired from a live sibling in the same course
    // (context-level attributes, not assessment-specific identity) -- never invented.
    var sibling = liveRows.filter(function (r) { return str_(r.courseId) === c.courseId; })[0] || {};

    var data = {
      classId: c.classId,
      subjectId: sibling.subjectId || '',
      title: c.title,
      type: c.assessmentType === 'UNIT_CHECK' ? 'กลางภาคเรียน' : 'ระหว่างภาค',
      date: '',
      unit: sibling.unit || '',
      maxScore: '',
      weight: '',
      description: 'สร้างโดย Phase B migration (' + c.assignmentId + ') จาก ' + c.sourceReference,
      academicYear: c.academicYear,
      term: c.term,
      courseId: c.courseId,
      canonicalUnitId: c.canonicalUnitId || '',
      lessonPlanId: c.lessonPlanId || '',
      scheduleId: c.scheduleId || '',
      assessmentType: c.assessmentType,
      gradeWeight: '',
      isRequired: sibling.isRequired !== undefined ? sibling.isRequired : '',
      rubricId: '',
      status: sibling.status || 'ACTIVE'
    };

    var created = createRecord('Assessments', data);
    logSheet.appendRow([c.assignmentId, created.id, new Date().toISOString()]);
    results.push({ assignmentId: c.assignmentId, status: 'CREATED', assessmentId: created.id, data: data });
  });

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function str_(v) { return (v === undefined || v === null) ? '' : String(v); }
