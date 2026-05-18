/*
  LIS AutoValidation Tool - AIIMS style configurable version
  Purpose:
  - Scan LIS result table rows
  - Detect abnormal results using user-defined reference ranges
  - Highlight negative values light purple, high values red, low values orange/yellow
  - Apply bilirubin logic: Total bilirubin must not be less than Direct or Indirect bilirubin
  - Deselect checkbox on the left side of 15-digit CR/sample number if any analyte is abnormal
  - Create floating repeat/abnormal list panel

  How to use:
  1. Open LIS validation page.
  2. Press F12 > Console.
  3. Paste this entire script and press Enter.
  4. Click "Run Validation" in the floating panel.

  IMPORTANT:
  - Edit referenceRanges below as per your lab policy.
  - This script does not delete or overwrite LIS values.
  - It only highlights cells and unchecks checkboxes.
*/

(function () {
  "use strict";

  /************************************************************
   * 1. USER-DEFINED REFERENCE RANGES
   * Edit these ranges as per your laboratory reference intervals.
   ************************************************************/
  const referenceRanges = {
    // LFT
    "total bilirubin": { low: 0.2, high: 1.2, unit: "mg/dL" },
    "direct bilirubin": { low: 0.0, high: 0.3, unit: "mg/dL" },
    "indirect bilirubin": { low: 0.0, high: 0.9, unit: "mg/dL" },
    "ast": { low: 0, high: 40, unit: "U/L" },
    "alt": { low: 0, high: 40, unit: "U/L" },
    "alp": { low: 40, high: 129, unit: "U/L" },
    "ggt": { low: 0, high: 55, unit: "U/L" },
    "total protein": { low: 6.4, high: 8.3, unit: "g/dL" },
    "albumin": { low: 3.5, high: 5.2, unit: "g/dL" },
    "globulin": { low: 2.0, high: 3.5, unit: "g/dL" },
    "ag ratio": { low: 1.0, high: 2.5, unit: "ratio" },

    // RFT
    "urea": { low: 10, high: 50, unit: "mg/dL" },
    "creatinine": { low: 0.6, high: 1.3, unit: "mg/dL" },
    "uric acid": { low: 2.5, high: 7.0, unit: "mg/dL" },

    // Electrolytes/minerals
    "sodium": { low: 135, high: 145, unit: "mmol/L" },
    "potassium": { low: 3.5, high: 5.1, unit: "mmol/L" },
    "chloride": { low: 98, high: 107, unit: "mmol/L" },
    "calcium": { low: 8.6, high: 10.2, unit: "mg/dL" },
    "magnesium": { low: 1.7, high: 2.4, unit: "mg/dL" },

    // Glucose
    "fasting blood sugar": { low: 70, high: 100, unit: "mg/dL" },
    "ppbs": { low: 70, high: 140, unit: "mg/dL" },
    "random blood sugar": { low: 70, high: 140, unit: "mg/dL" },

    // Inflammatory/cardiac/other markers
    "hscrp": { low: 0, high: 5, unit: "mg/L" },
    "ferritin": { low: 10, high: 300, unit: "ng/mL" },
    "nt pro bnp": { low: 0, high: 125, unit: "pg/mL" },
    "procalcitonin": { low: 0, high: 0.05, unit: "ng/mL" },
    "prolactin": { low: 0, high: 25, unit: "ng/mL" },
    "beta hcg": { low: 0, high: 5, unit: "mIU/mL" },
    "ca 19.9": { low: 0, high: 37, unit: "U/mL" },
    "ca 125": { low: 0, high: 35, unit: "U/mL" },

    // HbA1c
    // Edit according to your lab/reporting policy. Negative HbA1c is always abnormal irrespective of this range.
    "hba1c": { low: 4.0, high: 5.6, unit: "%" },

    // Thyroid function test
    "t3": { low: 80, high: 180, unit: "ng/dL" },
    "t4": { low: 4.5, high: 12.5, unit: "µg/dL" },
    "tsh": { low: 0.4, high: 4.0, unit: "µIU/mL" },
    "free t3": { low: 2.3, high: 4.2, unit: "pg/mL" },
    "free t4": { low: 0.8, high: 1.8, unit: "ng/dL" }
  };

  /************************************************************
   * 2. ANALYTE SYNONYMS
   * Add more synonyms if your LIS uses different names.
   ************************************************************/
  const analyteSynonyms = {
    "total bilirubin": ["total bilirubin", "t bil", "t.bil", "tbil", "bilirubin total", "total bili"],
    "direct bilirubin": ["direct bilirubin", "d bil", "d.bil", "dbil", "bilirubin direct", "conjugated bilirubin"],
    "indirect bilirubin": ["indirect bilirubin", "i bil", "i.bil", "ibil", "bilirubin indirect", "unconjugated bilirubin"],
    "ast": ["ast", "sgot", "aspartate aminotransferase"],
    "alt": ["alt", "sgpt", "alanine aminotransferase"],
    "alp": ["alp", "alkaline phosphatase", "alk phos"],
    "ggt": ["ggt", "gamma gt", "gamma glutamyl transferase", "gamma glutamyl transpeptidase"],
    "total protein": ["total protein", "protein total", "tp"],
    "albumin": ["albumin", "alb"],
    "globulin": ["globulin", "glob"],
    "ag ratio": ["a:g ratio", "a/g ratio", "ag ratio", "albumin globulin ratio"],

    "urea": ["urea", "blood urea"],
    "creatinine": ["creatinine", "serum creatinine", "creat"],
    "uric acid": ["uric acid", "serum uric acid"],

    "sodium": ["sodium", "na", "na+"],
    "potassium": ["potassium", "k", "k+"],
    "chloride": ["chloride", "cl", "cl-"],
    "calcium": ["calcium", "ca", "ca++", "total calcium"],
    "magnesium": ["magnesium", "mg", "mg++"],

    "fasting blood sugar": ["fasting blood sugar", "fbs", "glucose fasting", "fasting glucose", "blood sugar fasting"],
    "ppbs": ["ppbs", "post prandial blood sugar", "postprandial blood sugar", "pp blood sugar", "glucose pp", "post meal glucose"],
    "random blood sugar": ["random blood sugar", "rbs", "random glucose", "blood sugar random"],

    "hscrp": ["hscrp", "hs-crp", "high sensitivity crp", "high sensitive crp"],
    "ferritin": ["ferritin", "serum ferritin"],
    "nt pro bnp": ["nt pro bnp", "nt-probnp", "nt probnp", "pro bnp", "ntprobnp"],
    "procalcitonin": ["procalcitonin", "pct"],
    "prolactin": ["prolactin", "prl"],
    "beta hcg": ["beta hcg", "β hcg", "β-hcg", "bhcg", "b hcg", "beta-hcg"],
    "ca 19.9": ["ca 19.9", "ca19.9", "ca 19-9", "ca19-9", "carbohydrate antigen 19.9"],
    "ca 125": ["ca 125", "ca125", "cancer antigen 125"],
    "hba1c": ["hba1c", "hb a1c", "hb-a1c", "glycated hemoglobin", "glycosylated hemoglobin", "a1c"],

    "t3": ["t3", "total t3", "triiodothyronine"],
    "t4": ["t4", "total t4", "thyroxine"],
    "tsh": ["tsh", "thyroid stimulating hormone"],
    "free t3": ["free t3", "ft3", "f t3"],
    "free t4": ["free t4", "ft4", "f t4"]
  };

  /************************************************************
   * 3. STYLE CONSTANTS
   ************************************************************/
  const STYLE = {
    negative: "#ead7ff",      // light purple
    high: "#ff8a8a",          // red/pink
    low: "#ffe7a3",           // pale orange/yellow
    logic: "#d8b4fe",         // stronger purple for bilirubin logic
    checkbox: "#ff4d4d",
    normalBorder: "1px solid #ccc"
  };

  const TOOL_ID = "lis-auto-validation-panel-v1";
  const HIGHLIGHT_CLASS = "lis-auto-validation-highlight";
  const CHECKBOX_MARK_CLASS = "lis-auto-validation-checkbox-mark";

  let lastReport = [];

  /************************************************************
   * 4. BASIC UTILITIES
   ************************************************************/
  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[β]/g, "beta")
      .replace(/[µμ]/g, "u")
      .replace(/[+]/g, " plus ")
      .replace(/[-_/()\[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function extractCRNumber(text) {
    const match = String(text || "").match(/\b\d{15}\b/);
    return match ? match[0] : null;
  }

  function extractNumericValue(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    // Handles values like <0.05, >1000, 5.6 mg/dL, -1.2
    const match = raw.match(/[<>]?\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;

    const value = Number(match[1]);
    if (Number.isNaN(value)) return null;

    return {
      value,
      raw,
      hasLessThan: /^\s*</.test(raw),
      hasGreaterThan: /^\s*>/.test(raw)
    };
  }

  function findCanonicalAnalyte(text) {
    const normalized = normalizeText(text);
    if (!normalized) return null;

    for (const [canonical, synonyms] of Object.entries(analyteSynonyms)) {
      for (const synonym of synonyms) {
        const syn = normalizeText(synonym);
        const pattern = new RegExp(`(^|\\b)${syn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b|$)`, "i");
        if (pattern.test(normalized)) return canonical;
      }
    }

    return null;
  }

  function getVisibleText(el) {
    if (!el) return "";

    // Important for LIS pages: many result values are inside input boxes,
    // so textContent/innerText may miss them. This fixes negative HbA1c and similar entries.
    if (el.matches && el.matches("input, textarea, select")) {
      return String(el.value || el.getAttribute("value") || "").trim();
    }

    const formValues = Array.from(el.querySelectorAll ? el.querySelectorAll("input, textarea, select") : [])
      .map(input => String(input.value || input.getAttribute("value") || "").trim())
      .filter(Boolean)
      .join(" ");

    const visibleText = (el.innerText ? el.innerText : el.textContent ? el.textContent : "").trim();
    return `${visibleText} ${formValues}`.trim();
  }

  /************************************************************
   * 5. DOM DISCOVERY
   ************************************************************/
  function getCandidateRows() {
    // Prefer table rows. If LIS uses div grid, fallback to role=row and common row-like elements.
    let rows = Array.from(document.querySelectorAll("tr"));

    if (rows.length < 5) {
      rows = Array.from(document.querySelectorAll('[role="row"], .row, .data-row, .grid-row'));
    }

    // Keep rows that contain either CR number, checkbox, or known analyte text.
    rows = rows.filter(row => {
      const text = getVisibleText(row);
      return extractCRNumber(text) || row.querySelector('input[type="checkbox"]') || findCanonicalAnalyte(text);
    });

    // Limit to first 100 meaningful rows as requested, but if more are present we scan all because it is safer.
    return rows;
  }

  function getCells(row) {
    const cells = Array.from(row.querySelectorAll("td, th, [role='gridcell'], input, span, div"));
    return cells.length ? cells : [row];
  }

  function detectAnalyteInRow(row) {
    const cells = getCells(row);

    // First pass: detect analyte from cell text.
    for (const cell of cells) {
      const analyte = findCanonicalAnalyte(getVisibleText(cell));
      if (analyte) return { analyte, analyteCell: cell };
    }

    // Fallback: detect from whole row text.
    const rowText = getVisibleText(row);
    const analyte = findCanonicalAnalyte(rowText);
    return analyte ? { analyte, analyteCell: row } : { analyte: null, analyteCell: null };
  }

  function detectResultValueInRow(row, analyteCell) {
    const cells = Array.from(row.querySelectorAll("td, th, [role='gridcell']"));

    // SAFETY FIX:
    // In this LIS, the outer patient row can contain S.No, CR number, age, department,
    // and also the nested result table. If that whole outer row is scanned, the script may
    // accidentally read S.No/Age as the sugar value and deselect a normal glucose sample.
    // So first we use the true analyte row layout:
    // Test Param Name | Test Param Value | Reference Range
    if (analyteCell && cells.length >= 2) {
      const analyteIndex = cells.indexOf(analyteCell.closest("td, th, [role='gridcell']") || analyteCell);

      if (analyteIndex >= 0) {
        for (let i = analyteIndex + 1; i < Math.min(cells.length, analyteIndex + 4); i++) {
          const candidateCell = cells[i];
          const text = getVisibleText(candidateCell);

          if (!text) continue;
          if (extractCRNumber(text)) continue;
          if (findCanonicalAnalyte(text)) continue;
          if (/[0-9]+[ ]*[-–][ ]*[0-9]+/.test(text)) continue;

          const numeric = extractNumericValue(text);
          if (numeric) return { cell: candidateCell, numeric, text };
        }
      }
    }

    // Second pass: values inside editable input boxes within the SAME analyte row.
    // This captures negative HbA1c without accidentally picking S.No or Age.
    const inputCandidates = Array.from(row.querySelectorAll("input[type='text'], input:not([type]), textarea"))
      .map(input => ({
        cell: input.closest("td, th, [role='gridcell']") || input,
        numeric: extractNumericValue(getVisibleText(input)),
        text: getVisibleText(input)
      }))
      .filter(item => item.numeric && !extractCRNumber(item.text));

    if (inputCandidates.length) return inputCandidates[0];

    // Final fallback: scan only simple direct cells, avoiding CR number/reference range/analyte cells.
    const candidates = [];

    for (const cell of cells) {
      const text = getVisibleText(cell);
      if (!text) continue;
      if (cell === analyteCell) continue;
      if (extractCRNumber(text)) continue;
      if (findCanonicalAnalyte(text)) continue;
      if (/[0-9]+[ ]*[-–][ ]*[0-9]+/.test(text)) continue;

      const numeric = extractNumericValue(text);
      if (numeric) candidates.push({ cell, numeric, text });
    }

    if (candidates.length) return candidates[0];

    return null;
  }

  function findNearestCheckboxForCR(crNumber, row, allRows) {
    // 1. Same row checkbox, preferably left of CR text.
    const sameRowCheckboxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
    if (sameRowCheckboxes.length) return sameRowCheckboxes[0];

    // 2. Search rows containing same CR number.
    const crRows = allRows.filter(r => getVisibleText(r).includes(crNumber));
    for (const crRow of crRows) {
      const cb = crRow.querySelector('input[type="checkbox"]');
      if (cb) return cb;
    }

    // 3. Search previous few rows, because many LIS tables show CR number once and analytes below it.
    const idx = allRows.indexOf(row);
    for (let i = idx; i >= Math.max(0, idx - 8); i--) {
      const r = allRows[i];
      const text = getVisibleText(r);
      if (text.includes(crNumber) || extractCRNumber(text)) {
        const cb = r.querySelector('input[type="checkbox"]');
        if (cb) return cb;
      }
    }

    // 4. Search parent block.
    const parent = row.closest("table, tbody, form, div");
    if (parent) {
      const possibleRows = Array.from(parent.querySelectorAll("tr, [role='row'], .row, .data-row, .grid-row"));
      for (const possibleRow of possibleRows) {
        if (getVisibleText(possibleRow).includes(crNumber)) {
          const cb = possibleRow.querySelector('input[type="checkbox"]');
          if (cb) return cb;
        }
      }
    }

    return null;
  }

  /************************************************************
   * 6. HIGHLIGHTING AND CHECKBOX ACTIONS
   ************************************************************/
  function highlightCell(cell, color, reason) {
    if (!cell) return;
    cell.classList.add(HIGHLIGHT_CLASS);
    cell.dataset.lisAutoOldBg = cell.dataset.lisAutoOldBg || cell.style.backgroundColor || "";
    cell.dataset.lisAutoOldBorder = cell.dataset.lisAutoOldBorder || cell.style.border || "";
    cell.style.backgroundColor = color;
    cell.style.border = "2px solid rgba(90, 0, 130, 0.35)";
    cell.title = reason;
  }

  function markCheckbox(checkbox, reason) {
    if (!checkbox) return;

    checkbox.dataset.lisAutoWasChecked = checkbox.dataset.lisAutoWasChecked || String(checkbox.checked);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    checkbox.dispatchEvent(new Event("input", { bubbles: true }));

    const container = checkbox.closest("td, th, div, span") || checkbox.parentElement;
    if (container) {
      container.classList.add(CHECKBOX_MARK_CLASS);
      container.dataset.lisAutoOldOutline = container.dataset.lisAutoOldOutline || container.style.outline || "";
      container.style.outline = `3px solid ${STYLE.checkbox}`;
      container.title = reason || "Deselected by LIS autovalidation tool";
    }
  }

  function resetHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
      el.style.backgroundColor = el.dataset.lisAutoOldBg || "";
      el.style.border = el.dataset.lisAutoOldBorder || "";
      el.title = "";
      el.classList.remove(HIGHLIGHT_CLASS);
      delete el.dataset.lisAutoOldBg;
      delete el.dataset.lisAutoOldBorder;
    });

    document.querySelectorAll(`.${CHECKBOX_MARK_CLASS}`).forEach(el => {
      el.style.outline = el.dataset.lisAutoOldOutline || "";
      el.title = "";
      el.classList.remove(CHECKBOX_MARK_CLASS);
      delete el.dataset.lisAutoOldOutline;
    });

    // Optional: restore checkboxes to previous state.
    // Comment this block if you do not want reset to re-check boxes.
    document.querySelectorAll('input[type="checkbox"][data-lis-auto-was-checked]').forEach(cb => {
      cb.checked = cb.dataset.lisAutoWasChecked === "true";
      cb.dispatchEvent(new Event("change", { bubbles: true }));
      delete cb.dataset.lisAutoWasChecked;
    });

    lastReport = [];
    updatePanelSummary({ rowsScanned: 0, samplesScanned: 0, deselected: 0, report: [] });
  }

  /************************************************************
   * 7. ROW GROUPING BY CR NUMBER
   ************************************************************/
  function buildSampleMap(rows) {
    const sampleMap = new Map();
    let currentCR = null;

    rows.forEach((row, index) => {
      const text = getVisibleText(row);
      const crInRow = extractCRNumber(text);
      if (crInRow) currentCR = crInRow;
      if (!currentCR) return;

      if (!sampleMap.has(currentCR)) {
        sampleMap.set(currentCR, {
          crNumber: currentCR,
          rows: [],
          checkbox: null,
          analytes: {},
          abnormalities: []
        });
      }

      const sample = sampleMap.get(currentCR);
      sample.rows.push(row);

      const checkbox = findNearestCheckboxForCR(currentCR, row, rows);
      if (checkbox && !sample.checkbox) sample.checkbox = checkbox;

      // Do not validate the large outer patient/detail row if it contains a nested table.
      // Only validate the actual inner result rows like:
      // Test Param Name | Test Param Value | Reference Range.
      // This prevents normal sugar values being deselected because S.No/Age were read as results.
      if (row.querySelector("table")) return;

      const { analyte, analyteCell } = detectAnalyteInRow(row);
      if (!analyte) return;

      const valueInfo = detectResultValueInRow(row, analyteCell);
      if (!valueInfo) return;

      sample.analytes[analyte] = {
        analyte,
        value: valueInfo.numeric.value,
        raw: valueInfo.numeric.raw,
        valueCell: valueInfo.cell,
        analyteCell,
        row,
        rowIndex: index
      };
    });

    return sampleMap;
  }

  /************************************************************
   * 8. ABNORMALITY DETECTION
   ************************************************************/
  function checkAnalyteAgainstRange(sample, analyteData) {
    const analyte = analyteData.analyte;
    const range = referenceRanges[analyte];
    const value = analyteData.value;

    if (value < 0) {
      return {
        crNumber: sample.crNumber,
        analyte,
        value,
        raw: analyteData.raw,
        reason: "Negative value",
        severity: "negative",
        color: STYLE.negative,
        cell: analyteData.valueCell
      };
    }

    if (!range) return null;

    if (value > range.high) {
      return {
        crNumber: sample.crNumber,
        analyte,
        value,
        raw: analyteData.raw,
        reason: `High value > ${range.high} ${range.unit || ""}`.trim(),
        severity: "high",
        color: STYLE.high,
        cell: analyteData.valueCell
      };
    }

    if (value < range.low) {
      return {
        crNumber: sample.crNumber,
        analyte,
        value,
        raw: analyteData.raw,
        reason: `Low value < ${range.low} ${range.unit || ""}`.trim(),
        severity: "low",
        color: STYLE.low,
        cell: analyteData.valueCell
      };
    }

    return null;
  }

  function checkBilirubinLogic(sample) {
    const result = [];
    const total = sample.analytes["total bilirubin"];
    const direct = sample.analytes["direct bilirubin"];
    const indirect = sample.analytes["indirect bilirubin"];

    if (total && direct && total.value < direct.value) {
      result.push({
        crNumber: sample.crNumber,
        analyte: "total/direct bilirubin",
        value: `${total.value} / ${direct.value}`,
        raw: `${total.raw} / ${direct.raw}`,
        reason: "Bilirubin logic error: Total bilirubin is less than Direct bilirubin",
        severity: "logic",
        color: STYLE.logic,
        cell: total.valueCell,
        extraCells: [direct.valueCell]
      });
    }

    if (total && indirect && total.value < indirect.value) {
      result.push({
        crNumber: sample.crNumber,
        analyte: "total/indirect bilirubin",
        value: `${total.value} / ${indirect.value}`,
        raw: `${total.raw} / ${indirect.raw}`,
        reason: "Bilirubin logic error: Total bilirubin is less than Indirect bilirubin",
        severity: "logic",
        color: STYLE.logic,
        cell: total.valueCell,
        extraCells: [indirect.valueCell]
      });
    }

    return result;
  }

  /************************************************************
   * 9. MAIN VALIDATION FUNCTION
   ************************************************************/
  function runValidation() {
    resetHighlightsOnly();

    const rows = getCandidateRows();
    const sampleMap = buildSampleMap(rows);
    const report = [];
    let deselectedCount = 0;

    console.group("LIS AutoValidation Tool");
    console.log("Rows detected:", rows.length);
    console.log("Samples detected:", sampleMap.size);

    sampleMap.forEach(sample => {
      const sampleFindings = [];

      Object.values(sample.analytes).forEach(analyteData => {
        const finding = checkAnalyteAgainstRange(sample, analyteData);
        if (finding) sampleFindings.push(finding);
      });

      const bilirubinFindings = checkBilirubinLogic(sample);
      sampleFindings.push(...bilirubinFindings);

      if (sampleFindings.length > 0) {
        sampleFindings.forEach(finding => {
          highlightCell(finding.cell, finding.color, finding.reason);
          if (Array.isArray(finding.extraCells)) {
            finding.extraCells.forEach(cell => highlightCell(cell, finding.color, finding.reason));
          }
          report.push(finding);
        });

        if (sample.checkbox) {
          markCheckbox(sample.checkbox, "Deselected because one or more analytes are abnormal");
          deselectedCount++;
        } else {
          console.warn("Checkbox not found for CR:", sample.crNumber);
        }
      }
    });

    lastReport = report;
    updatePanelSummary({
      rowsScanned: rows.length,
      samplesScanned: sampleMap.size,
      deselected: deselectedCount,
      report
    });

    console.table(report.map(r => ({
      CR: r.crNumber,
      Analyte: r.analyte,
      Value: r.raw || r.value,
      Reason: r.reason
    })));
    console.groupEnd();
  }

  function resetHighlightsOnly() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
      el.style.backgroundColor = el.dataset.lisAutoOldBg || "";
      el.style.border = el.dataset.lisAutoOldBorder || "";
      el.title = "";
      el.classList.remove(HIGHLIGHT_CLASS);
      delete el.dataset.lisAutoOldBg;
      delete el.dataset.lisAutoOldBorder;
    });

    document.querySelectorAll(`.${CHECKBOX_MARK_CLASS}`).forEach(el => {
      el.style.outline = el.dataset.lisAutoOldOutline || "";
      el.title = "";
      el.classList.remove(CHECKBOX_MARK_CLASS);
      delete el.dataset.lisAutoOldOutline;
    });
  }

  /************************************************************
   * 10. FLOATING PANEL
   ************************************************************/
  function createPanel() {
    const old = document.getElementById(TOOL_ID);
    if (old) old.remove();

    const panel = document.createElement("div");
    panel.id = TOOL_ID;
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 999999;
      width: 390px;
      max-height: 80vh;
      overflow: auto;
      background: #ffffff;
      color: #222;
      border: 1px solid #ddd;
      border-radius: 14px;
      box-shadow: 0 12px 35px rgba(0,0,0,0.22);
      font-family: Arial, sans-serif;
      font-size: 13px;
    `;

    panel.innerHTML = `
      <div style="background:#111827;color:white;padding:12px 14px;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between;">
        <strong>LIS AutoValidation</strong>
        <button id="lisAutoClose" style="background:#ef4444;color:white;border:0;border-radius:8px;padding:4px 8px;cursor:pointer;">×</button>
      </div>
      <div style="padding:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <button id="lisAutoRun" style="background:#16a34a;color:white;border:0;border-radius:10px;padding:9px;cursor:pointer;font-weight:bold;">Run Validation</button>
          <button id="lisAutoReset" style="background:#f59e0b;color:white;border:0;border-radius:10px;padding:9px;cursor:pointer;font-weight:bold;">Reset</button>
          <button id="lisAutoPrint" style="background:#2563eb;color:white;border:0;border-radius:10px;padding:9px;cursor:pointer;font-weight:bold;">Print List</button>
          <button id="lisAutoMin" style="background:#6b7280;color:white;border:0;border-radius:10px;padding:9px;cursor:pointer;font-weight:bold;">Minimize</button>
        </div>
        <div id="lisAutoSummary" style="border:1px solid #eee;border-radius:10px;padding:10px;background:#f9fafb;">
          Ready. Click <b>Run Validation</b>.
        </div>
        <div id="lisAutoList" style="margin-top:10px;"></div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("lisAutoRun").addEventListener("click", runValidation);
    document.getElementById("lisAutoReset").addEventListener("click", resetHighlights);
    document.getElementById("lisAutoPrint").addEventListener("click", printReport);
    document.getElementById("lisAutoClose").addEventListener("click", () => panel.remove());
    document.getElementById("lisAutoMin").addEventListener("click", () => {
      const list = document.getElementById("lisAutoList");
      const summary = document.getElementById("lisAutoSummary");
      const isHidden = list.style.display === "none";
      list.style.display = isHidden ? "block" : "none";
      summary.style.display = isHidden ? "block" : "none";
    });
  }

  function updatePanelSummary({ rowsScanned, samplesScanned, deselected, report }) {
    const summary = document.getElementById("lisAutoSummary");
    const list = document.getElementById("lisAutoList");
    if (!summary || !list) return;

    const uniqueCR = new Set(report.map(r => r.crNumber));

    summary.innerHTML = `
      <div><b>Rows scanned:</b> ${rowsScanned}</div>
      <div><b>Samples scanned:</b> ${samplesScanned}</div>
      <div><b>Samples deselected:</b> ${deselected}</div>
      <div><b>Abnormal findings:</b> ${report.length}</div>
      <div><b>Abnormal CR numbers:</b> ${uniqueCR.size}</div>
    `;

    if (!report.length) {
      list.innerHTML = `<div style="padding:10px;border-radius:10px;background:#ecfdf5;color:#065f46;">No abnormal findings detected.</div>`;
      return;
    }

    const grouped = {};
    report.forEach(r => {
      grouped[r.crNumber] = grouped[r.crNumber] || [];
      grouped[r.crNumber].push(r);
    });

    list.innerHTML = Object.entries(grouped).map(([cr, findings]) => `
      <div style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;overflow:hidden;">
        <div style="background:#fee2e2;padding:8px 10px;font-weight:bold;color:#991b1b;">CR: ${escapeHtml(cr)}</div>
        <div style="padding:8px 10px;">
          ${findings.map(f => `
            <div style="margin-bottom:7px;padding-bottom:7px;border-bottom:1px dashed #ddd;">
              <div><b>${escapeHtml(f.analyte)}</b>: ${escapeHtml(f.raw || f.value)}</div>
              <div style="color:#7f1d1d;">${escapeHtml(f.reason)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  function printReport() {
    const rows = lastReport || [];
    const html = `
      <html>
      <head>
        <title>LIS Abnormal Repeat List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 4px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>LIS AutoValidation Abnormal List</h2>
        <div>Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>CR Number</th>
              <th>Analyte</th>
              <th>Value</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.crNumber)}</td>
                <td>${escapeHtml(r.analyte)}</td>
                <td>${escapeHtml(r.raw || r.value)}</td>
                <td>${escapeHtml(r.reason)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Popup blocked. Please allow popups to print the abnormal list.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  /************************************************************
   * 11. START TOOL
   ************************************************************/
  createPanel();
  console.log("LIS AutoValidation Tool loaded. Use the floating panel to run validation.");
})();
