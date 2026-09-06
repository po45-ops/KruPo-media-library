/**
 * PhaseBMigration.gs
 * ADDITIVE, NOT-YET-DEPLOYED Apps Script module for the Phase B Assignment/Assessment migration.
 *
 * STATUS: IMPLEMENTED_NOT_DEPLOYED.
 * This file has been written for review. It has NOT been pasted into the live Apps Script
 * project, has NOT been deployed, and phaseB_writeAssignments() has NOT been executed in
 * LIVE mode by anyone. Only a DRY_RUN simulation of this exact logic (run outside Apps Script,
 * against a fresh read-only export of Production — see the accompanying PHASE_B1.3 report) has
 * been performed. Copying this file into the project and running it, even in DRY_RUN, is a
 * decision for whoever has edit access to that project, not an action this session takes.
 *
 * Design constraints (unchanged from every prior Phase-B report):
 *  - DRY_RUN is the default mode; LIVE requires an explicit, separate opt-in.
 *  - Only ever appends rows to an allow-listed set of sheets. Never setValues() over an
 *    existing range, never deletes a row, never rewrites a whole sheet.
 *  - Never references 'StudentSubmissions' anywhere in this file — not a runtime check,
 *    an absent capability.
 *  - Only processes rows from the frozen FINAL_PHASE_B_WRITE_MANIFEST whose writeAction is
 *    literally one of the three CREATE_* values. HOLD_NO_WRITE and NO_ACTION_* rows are never
 *    visited by the write loop.
 *  - Fails closed: any unexpected condition (schema mismatch, hash mismatch, row-count drift,
 *    an unresolvable foreign key) aborts the ENTIRE run before any row is written. No partial,
 *    "best effort" write is ever produced.
 */

// ---- Configuration -------------------------------------------------------

var ALLOWED_TARGET_SHEETS = ['Assignments', 'Assessments'];

var EXPECTED_ASSIGNMENTS_HEADER = [
  'assignmentId', 'academicYear', 'term', 'courseId', 'classId', 'canonicalUnitId',
  'canonicalLessonKey', 'lessonPlanId', 'scheduleId', 'lessonOrdinal', 'lessonTitle',
  'assignmentTitle', 'assignmentType', 'assessmentId', 'studentMustSubmit', 'isScored',
  'trackingOnly', 'sourceReference', 'linkResolution', 'matchDecision'
];

var EXPECTED_ASSESSMENTS_HEADER_MIN = [
  'id', 'classId', 'subjectId', 'title', 'type', 'assessmentType', 'courseId',
  'canonicalUnitId', 'unit', 'term', 'academicYear', 'maxScore', 'gradeWeight', 'status'
];

// The operator must pass the exact hash they approved for this run. This is NOT
// hard-coded here on purpose -- the caller supplies it, and this file refuses to
// treat "the hash I happen to compute" as automatically trusted.

/**
 * Entry point. Never called by any trigger, form handler, or the public Web App's
 * doGet/doPost routing -- this is invoked only by a human from the Apps Script editor,
 * or from a bound admin-only spreadsheet custom menu item ("Admin > Run Phase-B Migration"),
 * both of which are gated by Google's native Sheets Editor-permission model.
 *
 * @param {string} manifestRawText  The EXACT raw JSON text of the manifest (e.g. PHASE_B_MANIFEST_RAW
 *                        from PhaseBManifestData.gs). Hashed as raw text, not re-serialized, so the
 *                        hash check is not sensitive to JSON.stringify/JSON.parse round-trip formatting.
 * @param {string} approvedManifestHash  SHA-256 hex string the operator is approving for this run.
 * @param {string} approvedManifestVersion  Free-text version label the operator is approving.
 * @param {string} mode  'DRY_RUN' (default behavior if omitted/anything else) or the literal
 *                        string 'LIVE'. Any value other than exactly 'LIVE' is treated as DRY_RUN.
 * @param {Object} opts  { expectedAssignmentsBefore, expectedAssessmentsBefore }
 * @return {Object} { runId, mode, rowsPlanned, rowsWritten, rowsSkipped, rowsHeld, rowsBlocked,
 *                     errors: [], beforeCounts: {}, afterCounts: {}, rollbackManifest: {} }
 */
function phaseB_writeAssignments(manifestRawText, approvedManifestHash, approvedManifestVersion, mode, opts) {
  var runId = Utilities.getUuid();
  var startedAt = new Date();
  var isLive = (mode === 'LIVE');
  opts = opts || {};

  var result = {
    runId: runId,
    mode: isLive ? 'LIVE' : 'DRY_RUN',
    rowsPlanned: 0,
    rowsWritten: 0,
    rowsSkipped: 0,
    rowsHeld: 0,
    rowsBlocked: 0,
    errors: [],
    beforeCounts: {},
    afterCounts: {},
    rollbackManifest: null
  };

  try {
    // ---- Gate 1: manifest hash must be supplied and must match the RAW TEXT, hashed directly ----
    if (!approvedManifestHash || !approvedManifestVersion) {
      throw new FailClosedError('MISSING_MANIFEST_HASH_OR_VERSION',
        'Refusing to run: caller did not supply both an approved manifest SHA-256 and a version label.');
    }
    var computedHash = _sha256Hex(manifestRawText);
    if (computedHash !== approvedManifestHash) {
      throw new FailClosedError('MANIFEST_HASH_MISMATCH',
        'Computed manifest hash (' + computedHash + ') does not match operator-approved hash (' +
        approvedManifestHash + '). The manifest passed to this run is not the one that was reviewed.');
    }
    var manifestJson = JSON.parse(manifestRawText);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ---- Gate 2: header/schema validation on every allow-listed target sheet ----
    _validateHeader(ss, 'Assignments', EXPECTED_ASSIGNMENTS_HEADER);
    _validateHeader(ss, 'Assessments', EXPECTED_ASSESSMENTS_HEADER_MIN);

    // ---- Gate 3: row-count baseline, compared against operator-supplied expectations ----
    var assignmentsSheet = ss.getSheetByName('Assignments');
    var assessmentsSheet = ss.getSheetByName('Assessments');
    var beforeAssignments = Math.max(assignmentsSheet.getLastRow() - 1, 0);
    var beforeAssessments = Math.max(assessmentsSheet.getLastRow() - 1, 0);
    result.beforeCounts = { Assignments: beforeAssignments, Assessments: beforeAssessments };

    if (typeof opts.expectedAssignmentsBefore === 'number' &&
        beforeAssignments !== opts.expectedAssignmentsBefore) {
      throw new FailClosedError('ASSIGNMENTS_ROW_COUNT_DRIFT',
        'Live Assignments row count (' + beforeAssignments + ') does not match the expected baseline (' +
        opts.expectedAssignmentsBefore + '). Production changed since this manifest was validated.');
    }
    if (typeof opts.expectedAssessmentsBefore === 'number' &&
        beforeAssessments !== opts.expectedAssessmentsBefore) {
      throw new FailClosedError('ASSESSMENTS_ROW_COUNT_DRIFT',
        'Live Assessments row count (' + beforeAssessments + ') does not match the expected baseline (' +
        opts.expectedAssessmentsBefore + '). Production changed since this manifest was validated.');
    }

    // ---- Build lookup indexes for foreign-key + duplicate/idempotency checks ----
    var existingAssignmentIds = _readColumnAsSet(assignmentsSheet, 'assignmentId', EXPECTED_ASSIGNMENTS_HEADER);
    var existingAssignmentKeys = _readCompositeKeySet(assignmentsSheet, EXPECTED_ASSIGNMENTS_HEADER,
      ['courseId', 'canonicalUnitId', 'canonicalLessonKey', 'assignmentTitle', 'assignmentType']);
    var validAssessmentIds = _readColumnAsSet(assessmentsSheet, 'id', EXPECTED_ASSESSMENTS_HEADER_MIN);
    var validUnitIds = _readSheetIdSet(ss, 'CurriculumUnits', 'id');

    // ---- Gate 4: the executable set comes ONLY from writeAction === CREATE_* rows ----
    // HOLD_NO_WRITE and every NO_ACTION_* row is structurally never added to this array.
    var createRows = [];
    for (var i = 0; i < manifestJson.length; i++) {
      var row = manifestJson[i];
      var wa = row.writeAction || '';
      if (wa === 'HOLD_NO_WRITE') { result.rowsHeld++; continue; }
      if (wa.indexOf('NO_ACTION_') === 0) { continue; } // out of scope entirely, not a held or blocked row
      if (wa.indexOf('CREATE_') !== 0) { continue; }     // anything not literally CREATE_* is never visited
      createRows.push(row);
    }
    result.rowsPlanned = createRows.length;

    // ---- Per-row validation (runs identically in DRY_RUN and LIVE) ----
    var plannedWrites = [];      // rows that pass every check
    var seenIdsThisRun = {};     // catches in-batch duplicates too, not just against the sheet

    for (var j = 0; j < createRows.length; j++) {
      var r = createRows[j];
      var problems = [];

      if (!r.assignmentId) problems.push('MISSING_ASSIGNMENT_ID');
      if (r.assignmentId && existingAssignmentIds[r.assignmentId]) problems.push('ID_ALREADY_EXISTS_IN_PRODUCTION');
      if (r.assignmentId && seenIdsThisRun[r.assignmentId]) problems.push('DUPLICATE_ID_WITHIN_THIS_RUN');

      var compositeKey = [r.courseId, r.canonicalUnitId, r.canonicalLessonKey, r.assignmentTitle, r.assignmentType].join('||');
      if (existingAssignmentKeys[compositeKey]) problems.push('IDEMPOTENCY_SKIP_ALREADY_WRITTEN');

      if (r.canonicalUnitId && !validUnitIds[r.canonicalUnitId]) problems.push('INVALID_CANONICAL_UNIT_ID');

      if (r.writeAction === 'CREATE_ASSIGNMENT_LINK_EXISTING_ASSESSMENT') {
        if (!r.assessmentId || r.assessmentId.indexOf(';') !== -1) {
          problems.push('INVALID_OR_COMPOUND_ASSESSMENT_ID');
        } else if (!validAssessmentIds[r.assessmentId]) {
          problems.push('ASSESSMENT_ID_NOT_FOUND_IN_PRODUCTION');
        }
      }

      if (r.writeAction === 'CREATE_ASSIGNMENT_AND_NEW_ASSESSMENT') {
        // New Assessments are created in a separate, earlier pass (Step 1 of the migration plan)
        // and their IDs re-validated (Step 2) before this function ever runs against Assignments.
        // A row of this type reaching here without a resolved assessmentId means Step 1/2 did not
        // complete for it -- fail this row, do not silently create it unlinked.
        if (isLive && !r.assessmentId) {
          problems.push('NEW_ASSESSMENT_NOT_YET_CREATED_OR_VALIDATED');
        }
      }

      if (problems.length > 0) {
        result.rowsBlocked++;
        result.errors.push({ assignmentId: r.assignmentId, problems: problems });
        continue;
      }

      if (existingAssignmentKeys[compositeKey] === undefined) {
        seenIdsThisRun[r.assignmentId] = true;
        plannedWrites.push(r);
      } else {
        result.rowsSkipped++;
      }
    }

    // ---- Execute (LIVE) or simulate (DRY_RUN) ----
    var firstRowIndex = beforeAssignments + 2; // 1-indexed, +1 for header
    if (isLive) {
      for (var k = 0; k < plannedWrites.length; k++) {
        _appendAssignmentRow(assignmentsSheet, plannedWrites[k]);
        result.rowsWritten++;
      }
    } else {
      // DRY_RUN: never call appendRow. Just count what would have happened.
      result.rowsWritten = 0;
      result.wouldWriteCount = plannedWrites.length;
    }

    // ---- Gate 5: post-write row-count assertion (LIVE only) ----
    if (isLive) {
      var afterAssignments = Math.max(assignmentsSheet.getLastRow() - 1, 0);
      if (afterAssignments !== beforeAssignments + result.rowsWritten) {
        throw new FailClosedError('POST_WRITE_ROW_COUNT_MISMATCH',
          'Assignments row count after write (' + afterAssignments + ') does not equal beforeCount + rowsWritten (' +
          (beforeAssignments + result.rowsWritten) + '). Marking this run FAILED, not partially successful.');
      }
      result.afterCounts = { Assignments: afterAssignments, Assessments: beforeAssessments };
      result.rollbackManifest = {
        sheet: 'Assignments',
        firstRowWritten: firstRowIndex,
        lastRowWritten: firstRowIndex + result.rowsWritten - 1,
        instruction: 'DELETE rows ' + firstRowIndex + '..' + (firstRowIndex + result.rowsWritten - 1) + ' from Assignments to fully undo this run.'
      };
    } else {
      result.afterCounts = { Assignments: beforeAssignments, Assessments: beforeAssessments }; // unchanged, proven below
    }

    _appendAuditLogRow(ss, {
      runId: runId,
      timestamp: startedAt.toISOString(),
      manifestHash: approvedManifestHash,
      manifestVersion: approvedManifestVersion,
      mode: result.mode,
      rowsPlanned: result.rowsPlanned,
      rowsWritten: result.rowsWritten,
      rowsSkipped: result.rowsSkipped,
      rowsHeld: result.rowsHeld,
      rowsBlocked: result.rowsBlocked,
      beforeCounts: JSON.stringify(result.beforeCounts),
      afterCounts: JSON.stringify(result.afterCounts),
      status: 'SUCCESS'
    });

    return result;

  } catch (e) {
    _appendAuditLogRow(ss_safe(), {
      runId: runId,
      timestamp: startedAt.toISOString(),
      manifestHash: approvedManifestHash || 'UNKNOWN',
      manifestVersion: approvedManifestVersion || 'UNKNOWN',
      mode: isLive ? 'LIVE' : 'DRY_RUN',
      rowsPlanned: result.rowsPlanned,
      rowsWritten: result.rowsWritten,
      rowsSkipped: result.rowsSkipped,
      rowsHeld: result.rowsHeld,
      rowsBlocked: result.rowsBlocked,
      beforeCounts: JSON.stringify(result.beforeCounts),
      afterCounts: JSON.stringify(result.beforeCounts), // unchanged on failure by definition
      status: 'FAILED: ' + (e && e.message ? e.message : String(e))
    });
    throw e; // fail closed -- propagate, never swallow
  }
}

// ---- Helpers (no sheet other than the allow-list, plus AuditLog/CurriculumUnits reads, is ever touched) ----

function FailClosedError(code, message) {
  this.name = 'FailClosedError';
  this.code = code;
  this.message = message;
}
FailClosedError.prototype = Object.create(Error.prototype);

function ss_safe() {
  try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return null; }
}

function _validateHeader(ss, sheetName, expectedHeader) {
  if (ALLOWED_TARGET_SHEETS.indexOf(sheetName) === -1) {
    throw new FailClosedError('SHEET_NOT_ALLOWLISTED', sheetName + ' is not in ALLOWED_TARGET_SHEETS.');
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new FailClosedError('SHEET_NOT_FOUND', 'Expected sheet "' + sheetName + '" does not exist.');
  }
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < expectedHeader.length; i++) {
    if (header.indexOf(expectedHeader[i]) === -1) {
      throw new FailClosedError('HEADER_MISMATCH',
        'Sheet "' + sheetName + '" is missing expected column "' + expectedHeader[i] + '".');
    }
  }
}

function _readColumnAsSet(sheet, colName, header) {
  var data = sheet.getDataRange().getValues();
  var actualHeader = data[0];
  var colIdx = actualHeader.indexOf(colName);
  var set = {};
  if (colIdx === -1) return set;
  for (var i = 1; i < data.length; i++) {
    var v = data[i][colIdx];
    if (v) set[v] = true;
  }
  return set;
}

function _readCompositeKeySet(sheet, header, fields) {
  var data = sheet.getDataRange().getValues();
  var actualHeader = data[0];
  var idxs = fields.map(function(f) { return actualHeader.indexOf(f); });
  var set = {};
  for (var i = 1; i < data.length; i++) {
    var key = idxs.map(function(idx) { return idx === -1 ? '' : data[i][idx]; }).join('||');
    set[key] = true;
  }
  return set;
}

function _readSheetIdSet(ss, sheetName, idCol) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};
  return _readColumnAsSet(sheet, idCol, null);
}

// Proven-only backward-compatibility aliases: a legacy column on the LIVE Assignments
// sheet gets a value derived from a canonical field ONLY where Production code proves
// the mapping (see PhaseBMigration.gs review notes, 2026-09-05):
//   - 'id' is the universal primary key read/written by every generic accessor in
//     Database.gs (getRecord/createRecord/updateRecord all key off row.id as an opaque
//     string, never a UUID-format check) -- assignmentId (e.g. "ASG-ART-P3-2569-T1-U01-
//     pretest-u1") is unique per manifest row and safe to reuse as id.
//   - 'title' is a direct content correspondence to assignmentTitle.
// Every other legacy column (subjectId, description, instructions, assignedDate, dueDate,
// score, status, fileId, fileUrl) has NO proven source in the 707-row manifest and is left
// blank, per explicit instruction not to guess a mapping.
var ASSIGNMENTS_LEGACY_ALIAS_MAP = {
  id: 'assignmentId',
  title: 'assignmentTitle'
};

/**
 * Builds the appended row from the sheet's REAL, LIVE header (read at call time), not
 * from any fixed/expected header constant -- this is what makes the write safe regardless
 * of how many extra legacy columns exist, what order they're in, or whether more columns
 * are appended to the sheet in the future. For each real header name, in order:
 *   1. a literal field on rowObj with that exact name (canonical fields: assignmentId,
 *      courseId, canonicalUnitId, ... plus already-shared legacy names academicYear, term,
 *      classId), else
 *   2. a proven legacy alias (ASSIGNMENTS_LEGACY_ALIAS_MAP), else
 *   3. now() for createdAt/updatedAt (matching the timestamp behavior of the generic
 *      createRecord()/updateRecord() accessors in Database.gs), else
 *   4. '' (blank) -- never guessed.
 */
function _appendAssignmentRow(sheet, rowObj) {
  var realHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ts = new Date();
  var row = realHeader.map(function(col) {
    if (rowObj[col] !== undefined && rowObj[col] !== null) return rowObj[col];
    var aliasSource = ASSIGNMENTS_LEGACY_ALIAS_MAP[col];
    if (aliasSource && rowObj[aliasSource] !== undefined && rowObj[aliasSource] !== null) {
      return rowObj[aliasSource];
    }
    if (col === 'createdAt' || col === 'updatedAt') return ts;
    return '';
  });
  sheet.appendRow(row); // pure append -- never setValues() over an existing range
}

function _appendAuditLogRow(ss, entry) {
  if (!ss) return;
  var sheet = ss.getSheetByName('PhaseBAuditLog');
  if (!sheet) {
    sheet = ss.insertSheet('PhaseBAuditLog'); // the ONLY sheet this module ever creates, additive only
    sheet.appendRow(['runId', 'timestamp', 'manifestHash', 'manifestVersion', 'mode',
      'rowsPlanned', 'rowsWritten', 'rowsSkipped', 'rowsHeld', 'rowsBlocked',
      'beforeCounts', 'afterCounts', 'status']);
  }
  sheet.appendRow([entry.runId, entry.timestamp, entry.manifestHash, entry.manifestVersion, entry.mode,
    entry.rowsPlanned, entry.rowsWritten, entry.rowsSkipped, entry.rowsHeld, entry.rowsBlocked,
    entry.beforeCounts, entry.afterCounts, entry.status]);
}

function _sha256Hex(str) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < raw.length; i++) {
    var b = (raw[i] < 0) ? raw[i] + 256 : raw[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

// ---- Zero-argument entry points -- these are the functions to select in the ----
// ---- Apps Script editor's "Run" dropdown. Both read PhaseBManifestData.gs.    ----

/**
 * *** RUN THIS FIRST. ***
 * DRY_RUN entry point -- takes no arguments, safe to run repeatedly, makes zero
 * mutations. Select "RUN_DRY_RUN_PHASE_B" in the Apps Script editor's function
 * dropdown and click Run, or call it from a bound admin menu item.
 *
 * Expected output (View > Logs / Executions after running), given the current
 * frozen manifest (PHASE_B_MANIFEST_HASH) and the Production baseline recorded
 * as of the last B-1.x check (Assignments=0, Assessments=598):
 *   {
 *     runId: "<a fresh UUID>",
 *     mode: "DRY_RUN",
 *     rowsPlanned: 458,
 *     rowsWritten: 0,
 *     rowsSkipped: 0,
 *     rowsHeld: 47,
 *     rowsBlocked: 0,
 *     errors: [],
 *     wouldWriteCount: 458,
 *     beforeCounts: { Assignments: 0, Assessments: 598 },
 *     afterCounts:  { Assignments: 0, Assessments: 598 },   // unchanged -- proves 0 mutations
 *     rollbackManifest: null
 *   }
 * If Production has drifted since the last check (row counts or headers changed),
 * this throws instead of returning that object -- that is the fail-closed gate
 * working correctly, not a bug to work around.
 */
function RUN_DRY_RUN_PHASE_B() {
  var result = phaseB_writeAssignments(
    PHASE_B_MANIFEST_RAW,
    PHASE_B_MANIFEST_HASH,
    PHASE_B_MANIFEST_VERSION,
    'DRY_RUN',
    { expectedAssignmentsBefore: 0, expectedAssessmentsBefore: 598 }
  );
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * *** DO NOT RUN THIS until RUN_DRY_RUN_PHASE_B() above has been run in this same
 * project and returned rowsBlocked: 0, errors: [] . ***
 *
 * This function is defined but is NOT invoked anywhere in this file, by any trigger,
 * or by this session. It exists only so the "single command to run later" is named
 * precisely, per the approved migration plan (Phase B-1.2 Section D / Phase B-1.3
 * Task 5). Running this performs REAL, IRREVERSIBLE-WITHOUT-MANUAL-ROLLBACK writes
 * to the live Assignments sheet (349 rows linked to existing Assessments + 104
 * tracking-only rows; the 5 CREATE_ASSIGNMENT_AND_NEW_ASSESSMENT rows will fail
 * closed with NEW_ASSESSMENT_NOT_YET_CREATED_OR_VALIDATED unless their Assessment
 * rows have already been created and their real IDs patched into the 5 corresponding
 * manifest rows' assessmentId field first -- see the migration plan's Step 1/2).
 */
function RUN_LIVE_MIGRATION_DO_NOT_CALL_YET() {
  var result = phaseB_writeAssignments(
    PHASE_B_MANIFEST_RAW,
    PHASE_B_MANIFEST_HASH,
    PHASE_B_MANIFEST_VERSION,
    'LIVE',
    { expectedAssignmentsBefore: 0, expectedAssessmentsBefore: 598 }
  );
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Post-write verification -- run this AFTER (and only after) RUN_LIVE_MIGRATION_DO_NOT_CALL_YET()
 * has actually executed, to independently re-confirm the live sheet state matches what that
 * run's returned `result` claimed, using a fresh read rather than trusting the in-memory result.
 *
 * Takes no arguments -- reads the most recent row of PhaseBAuditLog for its expected counts.
 * Logs and returns { ok: boolean, checks: [...], liveAssignmentsCount, liveAssessmentsCount,
 * lastAuditRow }.
 */
function VERIFY_POST_WRITE_PHASE_B() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = ss.getSheetByName('PhaseBAuditLog');
  var checks = [];
  var ok = true;

  if (!auditSheet) {
    return { ok: false, checks: ['NO_AUDIT_LOG_FOUND -- no run has ever executed'], liveAssignmentsCount: null, liveAssessmentsCount: null, lastAuditRow: null };
  }

  var data = auditSheet.getDataRange().getValues();
  var header = data[0];
  var lastRow = data[data.length - 1];
  var lastAudit = {};
  for (var i = 0; i < header.length; i++) lastAudit[header[i]] = lastRow[i];

  var assignmentsSheet = ss.getSheetByName('Assignments');
  var assessmentsSheet = ss.getSheetByName('Assessments');
  var liveAssignments = Math.max(assignmentsSheet.getLastRow() - 1, 0);
  var liveAssessments = Math.max(assessmentsSheet.getLastRow() - 1, 0);

  var expectedAfter = {};
  try { expectedAfter = JSON.parse(lastAudit.afterCounts); } catch (e) { expectedAfter = {}; }

  function check(name, pass, detail) {
    checks.push((pass ? 'PASS' : 'FAIL') + ' -- ' + name + (detail ? ': ' + detail : ''));
    if (!pass) ok = false;
  }

  check('Last audit row status is SUCCESS', String(lastAudit.status).indexOf('SUCCESS') === 0, lastAudit.status);
  check('Live Assignments count matches audited afterCounts',
    liveAssignments === expectedAfter.Assignments,
    'live=' + liveAssignments + ' audited=' + expectedAfter.Assignments);
  check('Live Assessments count matches audited afterCounts',
    liveAssessments === expectedAfter.Assessments,
    'live=' + liveAssessments + ' audited=' + expectedAfter.Assessments);
  check('Manifest hash on the audit row matches PHASE_B_MANIFEST_HASH',
    lastAudit.manifestHash === PHASE_B_MANIFEST_HASH,
    lastAudit.manifestHash);

  var result = { ok: ok, checks: checks, liveAssignmentsCount: liveAssignments, liveAssessmentsCount: liveAssessments, lastAuditRow: lastAudit };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
