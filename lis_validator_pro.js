javascript:(function () {
  "use strict";

  /**********************************************************************
   * LIS BIOCHEMISTRY AUTOVALIDATION TOOL V2 REFINED
   *
   * Fixes added:
   * 1. No result highlighting.
   * 2. Stricter analyte matching, especially Calcium vs CA 125 / CA 19.9.
   * 3. Calcium supports both mg/dL and mmol/L values.
   * 4. TBil / DBil / IBil logic added.
   * 5. Repeat list has minimise button.
   * 6. Checkbox deselection avoids synthetic click, so it should not re-toggle.
   **********************************************************************/

  const SETTINGS = {
    scanHiddenRows: false,
    maxRowsToScan: 500,
    deselectCheckboxes: true,
    addRepeatPanel: true,
    panelTitle: "LIS AutoValidator V2 Refined",
    debugMode: true
  };

  /**********************************************************************
   * EDIT REFERENCE RANGES HERE
   *
   * Calcium:
   * - mg/dL range: 8.6-10.2
   * - mmol/L range: 2.10-2.60
   * The code auto-selects mmol/L range if value is <4 or row contains mmol/L.
   **********************************************************************/
  const REF_RANGES = {
    total_bilirubin: { label: "Total Bilirubin", min: 0.2, max: 1.2 },
    direct_bilirubin: { label: "Direct Bilirubin", min: 0.0, max: 0.3 },
    indirect_bilirubin: { label: "Indirect Bilirubin", min: 0.1, max: 0.9 },

    ast: { label: "AST/SGOT", min: 0, max: 40 },
    alt: { label: "ALT/SGPT", min: 0, max: 40 },
    alp: { label: "ALP", min: 30, max: 120 },
    ggt: { label: "GGT", min: 0, max: 55 },
    total_protein: { label: "Total Protein", min: 6.4, max: 8.3 },
    albumin: { label: "Albumin", min: 3.5, max: 5.2 },

    urea: { label: "Urea", min: 15, max: 45 },
    creatinine: { label: "Creatinine", min: 0.6, max: 1.3 },
    uric_acid: { label: "Uric Acid", min: 2.4, max: 7.0 },

    sodium: { label: "Sodium", min: 135, max: 145 },
    potassium: { label: "Potassium", min: 3.5, max: 5.1 },
    chloride: { label: "Chloride", min: 98, max: 107 },
    calcium: { label: "Calcium", min: 8.6, max: 10.2, mmolMin: 2.10, mmolMax: 2.60 },
    magnesium: { label: "Magnesium", min: 1.7, max: 2.4 },
    phosphate: { label: "Phosphate", min: 2.5, max: 4.5 },

    fasting_glucose: { label: "Fasting Glucose", min: 70, max: 100 },
    pp_glucose: { label: "PP Glucose", min: 70, max: 140 },
    random_glucose: { label: "Random Glucose", min: 70, max: 200 },
    hba1c: { label: "HbA1c", min: 4.0, max: 5.6 },

    t3: { label: "T3", min: 80, max: 200 },
    t4: { label: "T4", min: 5.1, max: 14.1 },
    tsh: { label: "TSH", min: 0.27, max: 4.2 },
    ft3: { label: "FT3", min: 2.0, max: 4.4 },
    ft4: { label: "FT4", min: 0.93, max: 1.7 },

    iron: { label: "Serum Iron", min: 60, max: 170 },
    tibc: { label: "TIBC", min: 240, max: 450 },
    uibc: { label: "UIBC", min: 110, max: 370 },
    ferritin: { label: "Ferritin", min: 15, max: 300 },
    vitamin_d: { label: "Vitamin D", min: 30, max: 100 },
    vitamin_b12: { label: "Vitamin B12", min: 200, max: 900 },
    hscrp: { label: "hsCRP", min: 0, max: 3 },
    crp: { label: "CRP", min: 0, max: 5 },

    ntprobnp: { label: "NT-proBNP", min: 0, max: 125 },
    procalcitonin: { label: "Procalcitonin", min: 0, max: 0.5 },
    prolactin: { label: "Prolactin", min: 4, max: 23 },
    beta_hcg: { label: "Beta-hCG", min: 0, max: 5 },
    ca199: { label: "CA 19.9", min: 0, max: 37 },
    ca125: { label: "CA 125", min: 0, max: 35 }
  };

  /**********************************************************************
   * STRICT TEST NAME PATTERNS
   *
   * CA 125 and CA 19.9 are intentionally before Calcium.
   * Calcium does NOT use plain "ca" as an alias, because that caused
   * false matches in V1.
   **********************************************************************/
  const TEST_PATTERNS = [
    { key: "ca199", patterns: [/\bca\s*19[\.\-]?9\b/i, /\bcarbohydrate\s+antigen\s+19[\.\-]?9\b/i] },
    { key: "ca125", patterns: [/\bca\s*125\b/i, /\bcancer\s+antigen\s+125\b/i] },

    { key: "total_bilirubin", patterns: [/\btotal\s+bilirubin\b/i, /\bbilirubin\s+total\b/i, /\bt\.?\s*bil\b/i, /\btbil\b/i] },
    { key: "direct_bilirubin", patterns: [/\bdirect\s+bilirubin\b/i, /\bbilirubin\s+direct\b/i, /\bd\.?\s*bil\b/i, /\bdbil\b/i] },
    { key: "indirect_bilirubin", patterns: [/\bindirect\s+bilirubin\b/i, /\bbilirubin\s+indirect\b/i, /\bi\.?\s*bil\b/i, /\bibil\b/i] },

    { key: "hba1c", patterns: [/\bhb\s*a1c\b/i, /\bhba1c\b/i, /\bglycated\s+hemoglobin\b/i, /\bglycosylated\s+hemoglobin\b/i] },
    { key: "fasting_glucose", patterns: [/\bfasting\s+(plasma\s+)?glucose\b/i, /\bfasting\s+blood\s+sugar\b/i, /\bfbs\b/i] },
    { key: "pp_glucose", patterns: [/\bppbs\b/i, /\bpost\s*prandial\s+(blood\s+sugar|glucose)\b/i, /\bpp\s+glucose\b/i] },
    { key: "random_glucose", patterns: [/\brandom\s+(blood\s+sugar|glucose)\b/i, /\brbs\b/i] },

    { key: "ast", patterns: [/\bast\b/i, /\bsgot\b/i] },
    { key: "alt", patterns: [/\balt\b/i, /\bsgpt\b/i] },
    { key: "alp", patterns: [/\balp\b/i, /\balkaline\s+phosphatase\b/i] },
    { key: "ggt", patterns: [/\bggt\b/i, /\bgamma\s*gt\b/i, /\bgamma\s+glutamyl/i] },
    { key: "total_protein", patterns: [/\btotal\s+protein\b/i] },
    { key: "albumin", patterns: [/\balbumin\b/i] },

    { key: "urea", patterns: [/\burea\b/i] },
    { key: "creatinine", patterns: [/\bcreatinine\b/i, /\bcreat\b/i] },
    { key: "uric_acid", patterns: [/\buric\s+acid\b/i] },

    { key: "sodium", patterns: [/\bsodium\b/i, /\bna\+\b/i, /\bserum\s+na\b/i, /\bna\s*\(sodium\)/i] },
    { key: "potassium", patterns: [/\bpotassium\b/i, /\bk\+\b/i, /\bserum\s+k\b/i, /\bk\s*\(potassium\)/i] },
    { key: "chloride", patterns: [/\bchloride\b/i, /\bcl\-\b/i, /\bserum\s+chloride\b/i] },
    { key: "calcium", patterns: [/\bcalcium\b/i, /\bserum\s+calcium\b/i, /\bca\+\+\b/i, /\bca2\+\b/i, /\bca\s*\(calcium\)/i] },
    { key: "magnesium", patterns: [/\bmagnesium\b/i, /\bserum\s+magnesium\b/i] },
    { key: "phosphate", patterns: [/\bphosphate\b/i, /\bphosphorus\b/i] },

    { key: "ft3", patterns: [/\bft3\b/i, /\bfree\s+t3\b/i] },
    { key: "ft4", patterns: [/\bft4\b/i, /\bfree\s+t4\b/i] },
    { key: "tsh", patterns: [/\btsh\b/i, /\bthyroid\s+stimulating\s+hormone\b/i] },
    { key: "t3", patterns: [/\btotal\s+t3\b/i, /(^|\s)t3($|\s)/i] },
    { key: "t4", patterns: [/\btotal\s+t4\b/i, /(^|\s)t4($|\s)/i] },

    { key: "tibc", patterns: [/\btibc\b/i, /\btotal\s+iron\s+binding\s+capacity\b/i] },
    { key: "uibc", patterns: [/\buibc\b/i, /\bunsaturated\s+iron\s+binding\s+capacity\b/i] },
    { key: "iron", patterns: [/\bserum\s+iron\b/i, /\biron\b/i] },
    { key: "ferritin", patterns: [/\bferritin\b/i] },
    { key: "vitamin_d", patterns: [/\bvitamin\s+d\b/i, /\b25\s*oh\s*vitamin\s*d\b/i, /\b25\-oh\s*vitamin\s*d\b/i] },
    { key: "vitamin_b12", patterns: [/\bvitamin\s*b12\b/i, /\bb12\b/i] },
    { key: "hscrp", patterns: [/\bhs\s*crp\b/i, /\bhs\-crp\b/i, /\bhigh\s+sensitivity\s+crp\b/i] },
    { key: "crp", patterns: [/\bc\s*reactive\s+protein\b/i, /\bc\-reactive\s+protein\b/i, /\bcrp\b/i] },

    { key: "ntprobnp", patterns: [/\bnt\s*pro\s*bnp\b/i, /\bnt\-pro\s*bnp\b/i, /\bntprobnp\b/i, /\bpro\s*bnp\b/i] },
    { key: "procalcitonin", patterns: [/\bprocalcitonin\b/i, /\bpct\b/i] },
    { key: "prolactin", patterns: [/\bprolactin\b/i] },
    { key: "beta_hcg", patterns: [/\bbeta\s*hcg\b/i, /\bbeta\-hcg\b/i, /\bbhcg\b/i, /\bb\s*hcg\b/i] }
  ];

  const BILIRUBIN_KEYS = ["total_bilirubin", "direct_bilirubin", "indirect_bilirubin"];

  const state = {
    rowsSeen: 0,
    rowsWithCR: 0,
    analyteRows: 0,
    abnormalRows: [],
    uncheckedCRs: new Set(),
    crData: new Map(),
    originalCheckboxStates: new Map(),
    flagKeys: new Set()
  };

  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function getRows() {
    return Array.from(document.querySelectorAll("tr"))
      .filter(row => SETTINGS.scanHiddenRows || isVisible(row))
      .slice(0, SETTINGS.maxRowsToScan);
  }

  function findCRNumber(row) {
    const match = cleanText(row.innerText).match(/\b\d{15}\b/);
    return match ? match[0] : null;
  }

  function matchAnalyteInText(text) {
    const source = cleanText(text);
    for (const test of TEST_PATTERNS) {
      if (test.patterns.some(pattern => pattern.test(source))) {
        return { key: test.key, ...REF_RANGES[test.key] };
      }
    }
    return null;
  }

  function findAnalyteCellIndex(cells, analyteKey) {
    const test = TEST_PATTERNS.find(t => t.key === analyteKey);
    if (!test) return -1;

    for (let i = 0; i < cells.length; i++) {
      const text = cleanText(cells[i].innerText);
      if (test.patterns.some(pattern => pattern.test(text))) return i;
    }
    return -1;
  }

  function hasReferenceRangePattern(text) {
    return /\d+(\.\d+)?\s*[-–—]\s*\d+(\.\d+)?/.test(text);
  }

  function isLikelyNonResultCell(text) {
    const t = cleanText(text);
    if (!t) return true;
    if (/\b\d{15}\b/.test(t)) return true;
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t)) return true;
    if (/\d{1,2}:\d{2}/.test(t)) return true;
    if (hasReferenceRangePattern(t)) return true;
    if (/^\d{6,}$/.test(t)) return true;
    return false;
  }

  function parseNumericValue(raw) {
    const text = cleanText(raw).replace(/,/g, "");
    if (isLikelyNonResultCell(text)) return null;

    const match = text.match(/[<>]?\s*(-?\d+(\.\d+)?)/);
    if (!match) return null;

    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function findResultCell(row, analyte) {
    const cells = Array.from(row.querySelectorAll("td, th"));
    if (!cells.length || !analyte) return { cell: null, value: null };

    const analyteIndex = findAnalyteCellIndex(cells, analyte.key);
    const startIndex = analyteIndex >= 0 ? analyteIndex + 1 : 0;

    for (let i = startIndex; i < cells.length; i++) {
      const cellText = cleanText(cells[i].innerText);
      const value = parseNumericValue(cellText);
      if (value !== null) return { cell: cells[i], value };
    }

    return { cell: null, value: null };
  }

  function getEffectiveRange(analyte, value, rowText) {
    if (analyte.key !== "calcium") {
      return { min: analyte.min, max: analyte.max, unitNote: "" };
    }

    const lower = cleanText(rowText).toLowerCase();

    if (/mmol\/?l/i.test(lower) || value < 4) {
      return {
        min: analyte.mmolMin,
        max: analyte.mmolMax,
        unitNote: " mmol/L calcium range"
      };
    }

    return {
      min: analyte.min,
      max: analyte.max,
      unitNote: " mg/dL calcium range"
    };
  }

  function findCheckboxNearCR(row) {
    const rowCheckboxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
    if (rowCheckboxes.length) {
      return rowCheckboxes.find(cb => cb.checked) || rowCheckboxes[0];
    }

    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      .filter(cb => SETTINGS.scanHiddenRows || isVisible(cb));

    if (!allCheckboxes.length) return null;

    const rowRect = row.getBoundingClientRect();
    const rowY = (rowRect.top + rowRect.bottom) / 2;
    const rowLeft = rowRect.left;

    let best = null;
    let bestScore = Infinity;

    for (const cb of allCheckboxes) {
      const cbRect = cb.getBoundingClientRect();
      const cbY = (cbRect.top + cbRect.bottom) / 2;
      const verticalDistance = Math.abs(cbY - rowY);
      const rightSidePenalty = cbRect.left > rowLeft + rowRect.width * 0.5 ? 500 : 0;
      const score = verticalDistance + rightSidePenalty;

      if (score < bestScore) {
        best = cb;
        bestScore = score;
      }
    }

    return bestScore <= 35 ? best : null;
  }

  function setCheckboxUnchecked(checkbox) {
    if (!checkbox || !SETTINGS.deselectCheckboxes) return false;

    if (!state.originalCheckboxStates.has(checkbox)) {
      state.originalCheckboxStates.set(checkbox, checkbox.checked);
    }

    if (!checkbox.checked) return true;

    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
    if (descriptor && descriptor.set) {
      descriptor.set.call(checkbox, false);
    } else {
      checkbox.checked = false;
    }

    checkbox.dispatchEvent(new Event("input", { bubbles: true }));
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    return checkbox.checked === false;
  }

  function addFlag(item) {
    const uniqueKey = [item.crNumber, item.analyteKey || item.analyte, item.flag, item.reason].join("|");
    if (state.flagKeys.has(uniqueKey)) return;
    state.flagKeys.add(uniqueKey);
    state.abnormalRows.push(item);
  }

  function uncheckCR(crNumber, row, reason) {
    const checkbox = findCheckboxNearCR(row);
    const ok = setCheckboxUnchecked(checkbox);
    if (ok) state.uncheckedCRs.add(crNumber);

    if (checkbox) {
      checkbox.title = `Deselected by LIS AutoValidator: ${reason}`;
    }

    return ok;
  }

  function addCRValue(crNumber, analyte, value, row, resultCell) {
    if (!state.crData.has(crNumber)) {
      state.crData.set(crNumber, {});
    }

    state.crData.get(crNumber)[analyte.key] = {
      key: analyte.key,
      label: analyte.label,
      value,
      row,
      resultCell
    };
  }

  function evaluateRow(row) {
    state.rowsSeen++;

    const crNumber = findCRNumber(row);
    if (!crNumber) return;
    state.rowsWithCR++;

    const rowText = cleanText(row.innerText);

    if (/\b24\s*(hour|hr|hrs|h)\s*urine\b/i.test(rowText)) {
      const checkbox = findCheckboxNearCR(row);
      setCheckboxUnchecked(checkbox);
      state.uncheckedCRs.add(crNumber);
      addFlag({
        crNumber,
        analyteKey: "24_hour_urine",
        analyte: "24-hour urine sample",
        value: "-",
        range: "Manual validation required",
        flag: "HOLD",
        deselected: checkbox ? "Yes" : "No checkbox found",
        reason: "24-hour urine row detected"
      });
      return;
    }

    const analyte = matchAnalyteInText(rowText);
    if (!analyte) return;
    state.analyteRows++;

    const { cell, value } = findResultCell(row, analyte);
    if (value === null || !cell) {
      if (SETTINGS.debugMode) {
        console.warn("No reliable result value found for row", { crNumber, analyte: analyte.label, rowText });
      }
      return;
    }

    addCRValue(crNumber, analyte, value, row, cell);

    const effectiveRange = getEffectiveRange(analyte, value, rowText);
    const min = effectiveRange.min;
    const max = effectiveRange.max;

    let flag = null;
    if (value < 0) flag = "NEGATIVE";
    else if (value < min) flag = "LOW";
    else if (value > max) flag = "HIGH";

    if (flag) {
      const reason = `${analyte.label}: ${value} is ${flag}; range ${min}-${max}${effectiveRange.unitNote || ""}`;
      const deselected = uncheckCR(crNumber, row, reason);

      addFlag({
        crNumber,
        analyteKey: analyte.key,
        analyte: analyte.label,
        value,
        range: `${min}-${max}${effectiveRange.unitNote || ""}`,
        flag,
        deselected: deselected ? "Yes" : "No checkbox found",
        reason
      });
    }
  }

  function availableBilirubinRows(values) {
    return BILIRUBIN_KEYS.map(key => values[key]).filter(Boolean);
  }

  function flagBilirubinGroup(crNumber, values, ruleName, reason) {
    const rows = availableBilirubinRows(values);
    if (!rows.length) return;

    let deselectedAny = false;
    for (const item of rows) {
      const ok = uncheckCR(crNumber, item.row, reason);
      if (ok) deselectedAny = true;
    }

    addFlag({
      crNumber,
      analyteKey: "bilirubin_logic",
      analyte: ruleName,
      value: rows.map(x => `${x.label}: ${x.value}`).join("; "),
      range: "TBil must be >= DBil and >= IBil; no negative fractions",
      flag: "BILIRUBIN RULE",
      deselected: deselectedAny ? "Yes" : "No checkbox found",
      reason
    });
  }

  function applyBilirubinRules() {
    for (const [crNumber, values] of state.crData.entries()) {
      const tbil = values.total_bilirubin;
      const dbil = values.direct_bilirubin;
      const ibil = values.indirect_bilirubin;

      if (!tbil && !dbil && !ibil) continue;

      const negativeItems = [tbil, dbil, ibil].filter(x => x && x.value < 0);
      if (negativeItems.length) {
        flagBilirubinGroup(
          crNumber,
          values,
          "Bilirubin negative value rule",
          `Negative bilirubin value detected: ${negativeItems.map(x => `${x.label} ${x.value}`).join(", ")}`
        );
      }

      if (tbil && dbil && dbil.value > tbil.value) {
        flagBilirubinGroup(
          crNumber,
          values,
          "DBil > TBil rule",
          `Direct bilirubin (${dbil.value}) is greater than total bilirubin (${tbil.value})`
        );
      }

      if (tbil && ibil && ibil.value > tbil.value) {
        flagBilirubinGroup(
          crNumber,
          values,
          "IBil > TBil rule",
          `Indirect bilirubin (${ibil.value}) is greater than total bilirubin (${tbil.value})`
        );
      }

      if (tbil && dbil && ibil) {
        const sum = dbil.value + ibil.value;
        const tolerance = 0.3;
        if (sum > tbil.value + tolerance) {
          flagBilirubinGroup(
            crNumber,
            values,
            "DBil + IBil > TBil rule",
            `Direct + indirect bilirubin (${sum.toFixed(2)}) exceeds total bilirubin (${tbil.value}) beyond tolerance ${tolerance}`
          );
        }
      }
    }
  }

  function createRepeatPanel() {
    if (!SETTINGS.addRepeatPanel) return;

    const oldPanel = document.getElementById("lis-autovalidation-repeat-panel");
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement("div");
    panel.id = "lis-autovalidation-repeat-panel";
    panel.style.cssText = [
      "position:fixed",
      "right:16px",
      "top:16px",
      "z-index:999999",
      "width:430px",
      "max-height:80vh",
      "overflow:auto",
      "background:#fff",
      "border:2px solid #222",
      "border-radius:12px",
      "box-shadow:0 8px 28px rgba(0,0,0,.25)",
      "font-family:Arial,sans-serif",
      "font-size:13px",
      "color:#111"
    ].join(";");

    const rows = state.abnormalRows.map((item, index) => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px;">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.crNumber}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.analyte}</td>
        <td style="border:1px solid #ddd;padding:4px;font-weight:700;">${item.value}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.range}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.flag}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.deselected || "Yes"}</td>
      </tr>
    `).join("");

    panel.innerHTML = `
      <div style="background:#111;color:white;padding:10px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <b>${SETTINGS.panelTitle}</b>
        <span>
          <button id="lis-av-minimise" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;margin-right:4px;">−</button>
          <button id="lis-av-close" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;">×</button>
        </span>
      </div>
      <div id="lis-av-body" style="padding:10px;">
        <div style="margin-bottom:8px;line-height:1.45;">
          <b>Rows seen:</b> ${state.rowsSeen}<br>
          <b>Rows with CR:</b> ${state.rowsWithCR}<br>
          <b>Recognised analyte rows:</b> ${state.analyteRows}<br>
          <b>Repeat flags:</b> ${state.abnormalRows.length}<br>
          <b>CR numbers deselected:</b> ${state.uncheckedCRs.size}
        </div>
        <button id="lis-av-print" style="margin:4px 4px 8px 0;padding:6px 10px;border-radius:8px;border:1px solid #444;cursor:pointer;">Print</button>
        <button id="lis-av-copy" style="margin:4px 4px 8px 0;padding:6px 10px;border-radius:8px;border:1px solid #444;cursor:pointer;">Copy</button>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="border:1px solid #ddd;padding:4px;">#</th>
              <th style="border:1px solid #ddd;padding:4px;">CR</th>
              <th style="border:1px solid #ddd;padding:4px;">Test</th>
              <th style="border:1px solid #ddd;padding:4px;">Value</th>
              <th style="border:1px solid #ddd;padding:4px;">Range</th>
              <th style="border:1px solid #ddd;padding:4px;">Flag</th>
              <th style="border:1px solid #ddd;padding:4px;">Unchecked</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7" style="padding:10px;text-align:center;">No abnormal values detected</td></tr>`}</tbody>
        </table>
      </div>
    `;

    document.body.appendChild(panel);

    const body = document.getElementById("lis-av-body");
    const minimiseBtn = document.getElementById("lis-av-minimise");

    document.getElementById("lis-av-close").onclick = () => panel.remove();

    minimiseBtn.onclick = () => {
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none";
      minimiseBtn.textContent = hidden ? "−" : "+";
      panel.style.width = hidden ? "430px" : "260px";
    };

    document.getElementById("lis-av-print").onclick = () => window.print();

    document.getElementById("lis-av-copy").onclick = async () => {
      const text = state.abnormalRows.map((item, i) =>
        `${i + 1}. CR: ${item.crNumber} | ${item.analyte} | Value: ${item.value} | Range: ${item.range} | Flag: ${item.flag} | ${item.reason}`
      ).join("\n");

      try {
        await navigator.clipboard.writeText(text);
        alert("Repeat list copied.");
      } catch (e) {
        alert(text || "No abnormal values detected.");
      }
    };
  }

  function runAutoValidation() {
    const rows = getRows();
    rows.forEach(evaluateRow);
    applyBilirubinRules();
    createRepeatPanel();

    if (SETTINGS.debugMode) {
      console.table(state.abnormalRows);
      console.log("LIS AutoValidator V2 complete", {
        rowsSeen: state.rowsSeen,
        rowsWithCR: state.rowsWithCR,
        recognisedAnalyteRows: state.analyteRows,
        abnormalFlags: state.abnormalRows.length,
        uncheckedCRs: Array.from(state.uncheckedCRs)
      });
    }
  }

  runAutoValidation();
})();
