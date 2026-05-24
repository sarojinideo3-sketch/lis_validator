javascript:(function () {
  "use strict";

  /**********************************************************************
   * LIS BIOCHEMISTRY AUTOVALIDATION TOOL V1
   * Purpose:
   * 1. Scan all visible LIS result rows.
   * 2. Detect 15-digit CR/sample number.
   * 3. Detect analyte/test name.
   * 4. Detect numeric result.
   * 5. Compare with reference range.
   * 6. Deselect checkbox near/left of the 15-digit CR number.
   * 7. Generate repeat list.
   * Note: Highlighting is disabled by default.
   **********************************************************************/

  const SETTINGS = {
    scanHiddenRows: false,
    deselectCheckboxes: true,
    addRepeatPanel: true,
    highlightNormal: false,
    enableHighlights: false,
    maxRowsToScan: 500,
    colors: {
      low: "#fff3b0",          // pale yellow
      high: "#ffb3b3",         // light red
      negative: "#eadcff",     // light purple
      bilirubinRule: "#ffd6a5",// orange
      analyte: "#d8ecff",      // light blue
      normal: "#e7ffe7"        // light green
    }
  };

  /**********************************************************************
   * EDIT YOUR REFERENCE RANGES HERE
   * Units must match your LIS display.
   * Add or modify min/max values according to your lab policy.
   **********************************************************************/
  const REF_RANGES = [
    // LFT
    { key: "total_bilirubin", label: "Total Bilirubin", aliases: ["total bilirubin", "t bil", "t.bil", "tbil", "bilirubin total"], min: 0.2, max: 1.2 },
    { key: "direct_bilirubin", label: "Direct Bilirubin", aliases: ["direct bilirubin", "d bil", "d.bil", "dbil", "bilirubin direct"], min: 0.0, max: 0.3 },
    { key: "indirect_bilirubin", label: "Indirect Bilirubin", aliases: ["indirect bilirubin", "i bil", "i.bil", "ibil", "bilirubin indirect"], min: 0.1, max: 0.9 },
    { key: "ast", label: "AST/SGOT", aliases: ["ast", "sgot"], min: 0, max: 40 },
    { key: "alt", label: "ALT/SGPT", aliases: ["alt", "sgpt"], min: 0, max: 40 },
    { key: "alp", label: "ALP", aliases: ["alp", "alkaline phosphatase"], min: 30, max: 120 },
    { key: "ggt", label: "GGT", aliases: ["ggt", "gamma gt", "gamma glutamyl"], min: 0, max: 55 },
    { key: "total_protein", label: "Total Protein", aliases: ["total protein"], min: 6.4, max: 8.3 },
    { key: "albumin", label: "Albumin", aliases: ["albumin"], min: 3.5, max: 5.2 },

    // RFT
    { key: "urea", label: "Urea", aliases: ["urea"], min: 15, max: 45 },
    { key: "creatinine", label: "Creatinine", aliases: ["creatinine", "creat"], min: 0.6, max: 1.3 },
    { key: "uric_acid", label: "Uric Acid", aliases: ["uric acid"], min: 2.4, max: 7.0 },

    // Electrolytes / minerals
    { key: "sodium", label: "Sodium", aliases: ["sodium", "na+", "na"], min: 135, max: 145 },
    { key: "potassium", label: "Potassium", aliases: ["potassium", "k+", " k "], min: 3.5, max: 5.1 },
    { key: "chloride", label: "Chloride", aliases: ["chloride", "cl-", "cl"], min: 98, max: 107 },
    { key: "calcium", label: "Calcium", aliases: ["calcium", "ca"], min: 8.6, max: 10.2 },
    { key: "magnesium", label: "Magnesium", aliases: ["magnesium", "mg"], min: 1.7, max: 2.4 },
    { key: "phosphate", label: "Phosphate", aliases: ["phosphate", "phosphorus"], min: 2.5, max: 4.5 },

    // Glucose / diabetes
    { key: "fasting_glucose", label: "Fasting Glucose", aliases: ["fasting glucose", "fbs", "fasting blood sugar"], min: 70, max: 100 },
    { key: "pp_glucose", label: "PP Glucose", aliases: ["ppbs", "post prandial", "post-prandial", "pp glucose", "post prandial blood sugar"], min: 70, max: 140 },
    { key: "random_glucose", label: "Random Glucose", aliases: ["random glucose", "rbs", "random blood sugar"], min: 70, max: 200 },
    { key: "hba1c", label: "HbA1c", aliases: ["hba1c", "hb a1c", "glycated hemoglobin", "glycosylated hemoglobin"], min: 4.0, max: 5.6 },

    // Thyroid
    { key: "t3", label: "T3", aliases: [" t3 ", "total t3"], min: 80, max: 200 },
    { key: "t4", label: "T4", aliases: [" t4 ", "total t4"], min: 5.1, max: 14.1 },
    { key: "tsh", label: "TSH", aliases: ["tsh", "thyroid stimulating hormone"], min: 0.27, max: 4.2 },
    { key: "ft3", label: "FT3", aliases: ["ft3", "free t3"], min: 2.0, max: 4.4 },
    { key: "ft4", label: "FT4", aliases: ["ft4", "free t4"], min: 0.93, max: 1.7 },

    // Iron profile / vitamins / inflammation
    { key: "iron", label: "Serum Iron", aliases: ["serum iron", "iron"], min: 60, max: 170 },
    { key: "tibc", label: "TIBC", aliases: ["tibc", "total iron binding capacity"], min: 240, max: 450 },
    { key: "uibc", label: "UIBC", aliases: ["uibc", "unsaturated iron binding capacity"], min: 110, max: 370 },
    { key: "ferritin", label: "Ferritin", aliases: ["ferritin"], min: 15, max: 300 },
    { key: "vitamin_d", label: "Vitamin D", aliases: ["vitamin d", "25 oh vitamin d", "25-oh vitamin d"], min: 30, max: 100 },
    { key: "vitamin_b12", label: "Vitamin B12", aliases: ["vitamin b12", "b12"], min: 200, max: 900 },
    { key: "hscrp", label: "hsCRP", aliases: ["hscrp", "hs-crp", "high sensitivity crp"], min: 0, max: 3 },
    { key: "crp", label: "CRP", aliases: ["crp", "c reactive protein", "c-reactive protein"], min: 0, max: 5 },

    // Cardiac / hormones / tumour markers
    { key: "ntprobnp", label: "NT-proBNP", aliases: ["nt probnp", "nt-probnp", "nt pro bnp", "pro bnp", "probnp"], min: 0, max: 125 },
    { key: "procalcitonin", label: "Procalcitonin", aliases: ["procalcitonin", "pct"], min: 0, max: 0.5 },
    { key: "prolactin", label: "Prolactin", aliases: ["prolactin"], min: 4, max: 23 },
    { key: "beta_hcg", label: "Beta-hCG", aliases: ["beta hcg", "beta-hcg", "bhcg", "b hcg"], min: 0, max: 5 },
    { key: "ca199", label: "CA 19.9", aliases: ["ca 19.9", "ca19.9", "ca 19-9", "ca19-9"], min: 0, max: 37 },
    { key: "ca125", label: "CA 125", aliases: ["ca 125", "ca125"], min: 0, max: 35 }
  ];

  const state = {
    rowsScanned: 0,
    abnormalRows: [],
    uncheckedCRs: new Set(),
    crData: new Map(),
    originalCheckboxStates: new Map()
  };

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[()\[\]{}]/g, " ")
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
    const match = row.innerText.match(/\b\d{15}\b/);
    return match ? match[0] : null;
  }

  function matchAnalyte(rowText) {
    const text = ` ${normalizeText(rowText)} `;

    for (const item of REF_RANGES) {
      for (const alias of item.aliases) {
        const a = ` ${normalizeText(alias)} `;
        if (text.includes(a)) return item;
      }
    }
    return null;
  }

  function parseNumericValue(raw) {
    if (!raw) return null;

    let text = String(raw)
      .replace(/,/g, "")
      .replace(/[<>]/g, "")
      .trim();

    // Reject CR numbers, dates, ranges, and long identifiers.
    if (/\b\d{15}\b/.test(text)) return null;
    if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return null;
    if (/\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?/.test(text)) return null;
    if (/^\d{6,}$/.test(text)) return null;

    const match = text.match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function findAnalyteCellIndex(cells, analyte) {
    if (!analyte) return -1;
    for (let i = 0; i < cells.length; i++) {
      const txt = ` ${normalizeText(cells[i].innerText)} `;
      for (const alias of analyte.aliases) {
        const a = ` ${normalizeText(alias)} `;
        if (txt.includes(a)) return i;
      }
    }
    return -1;
  }

  function findResultCell(row, analyte) {
    const cells = Array.from(row.querySelectorAll("td, th"));
    if (!cells.length) return { cell: null, value: null };

    const analyteIndex = findAnalyteCellIndex(cells, analyte);

    // Prefer numeric cells after analyte name.
    if (analyteIndex >= 0) {
      for (let i = analyteIndex + 1; i < cells.length; i++) {
        const value = parseNumericValue(cells[i].innerText);
        if (value !== null) return { cell: cells[i], value };
      }
    }

    // Fallback: scan all cells and choose the first clean numeric value.
    for (const cell of cells) {
      const value = parseNumericValue(cell.innerText);
      if (value !== null) return { cell, value };
    }

    return { cell: null, value: null };
  }

  function findCheckboxNearCR(row, crNumber) {
    const rowCheckboxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
    if (rowCheckboxes.length) {
      return rowCheckboxes.find(cb => cb.checked) || rowCheckboxes[0];
    }

    // Fallback: find nearest visible checkbox on screen.
    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      .filter(cb => SETTINGS.scanHiddenRows || isVisible(cb));

    if (!allCheckboxes.length) return null;

    const rowRect = row.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;

    for (const cb of allCheckboxes) {
      const r = cb.getBoundingClientRect();
      const verticalDistance = Math.abs((r.top + r.bottom) / 2 - (rowRect.top + rowRect.bottom) / 2);
      const horizontalPenalty = r.left > rowRect.left + rowRect.width * 0.75 ? 1000 : 0;
      const score = verticalDistance + horizontalPenalty;

      if (score < bestScore) {
        best = cb;
        bestScore = score;
      }
    }

    return best;
  }

  function markCell(cell, color, title) {
    if (!SETTINGS.enableHighlights) return;
    if (!cell) return;
    cell.style.backgroundColor = color;
    cell.style.border = "2px solid #7a1f1f";
    cell.style.fontWeight = "700";
    cell.title = title || "Flagged by LIS AutoValidator";
  }

  function uncheckCR(crNumber, checkbox, reason) {
    if (!checkbox || !SETTINGS.deselectCheckboxes) return;

    if (!state.originalCheckboxStates.has(checkbox)) {
      state.originalCheckboxStates.set(checkbox, checkbox.checked);
    }

    if (checkbox.checked) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      checkbox.dispatchEvent(new Event("click", { bubbles: true }));
    }

    state.uncheckedCRs.add(crNumber);
    checkbox.title = `Deselected by LIS AutoValidator: ${reason}`;
  }

  function addCRValue(crNumber, key, value, row, cell) {
    if (!state.crData.has(crNumber)) {
      state.crData.set(crNumber, {});
    }
    state.crData.get(crNumber)[key] = { value, row, cell };
  }

  function evaluateRow(row) {
    const crNumber = findCRNumber(row);
    if (!crNumber) return;

    const rowText = row.innerText;
    const analyte = matchAnalyte(rowText);
    if (!analyte) return;

    const { cell, value } = findResultCell(row, analyte);
    if (value === null || !cell) return;

    state.rowsScanned++;
    addCRValue(crNumber, analyte.key, value, row, cell);

    let flag = null;
    let color = null;

    if (value < 0) {
      flag = "NEGATIVE VALUE";
      color = SETTINGS.colors.negative;
    } else if (value < analyte.min) {
      flag = "LOW";
      color = SETTINGS.colors.low;
    } else if (value > analyte.max) {
      flag = "HIGH";
      color = SETTINGS.colors.high;
    } else if (SETTINGS.highlightNormal) {
      markCell(cell, SETTINGS.colors.normal, "Within configured reference range");
    }

    if (flag) {
      const reason = `${analyte.label}: ${value} is ${flag}; range ${analyte.min}-${analyte.max}`;
      markCell(cell, color, reason);
      const checkbox = findCheckboxNearCR(row, crNumber);
      uncheckCR(crNumber, checkbox, reason);

      state.abnormalRows.push({
        crNumber,
        analyte: analyte.label,
        value,
        range: `${analyte.min}-${analyte.max}`,
        flag,
        reason
      });
    }
  }

  function applyBilirubinRules() {
    for (const [crNumber, values] of state.crData.entries()) {
      const total = values.total_bilirubin;
      const direct = values.direct_bilirubin;
      const indirect = values.indirect_bilirubin;

      const abnormalBilirubinObjects = [];
      const reasons = [];

      if (total && total.value < 0) {
        abnormalBilirubinObjects.push(total);
        reasons.push("Total bilirubin is negative");
      }
      if (direct && direct.value < 0) {
        abnormalBilirubinObjects.push(direct);
        reasons.push("Direct bilirubin is negative");
      }
      if (indirect && indirect.value < 0) {
        abnormalBilirubinObjects.push(indirect);
        reasons.push("Indirect bilirubin is negative");
      }
      if (total && direct && direct.value > total.value) {
        abnormalBilirubinObjects.push(total, direct);
        reasons.push("Direct bilirubin is greater than total bilirubin");
      }
      if (total && indirect && indirect.value > total.value) {
        abnormalBilirubinObjects.push(total, indirect);
        reasons.push("Indirect bilirubin is greater than total bilirubin");
      }

      if (abnormalBilirubinObjects.length) {
        const reason = reasons.join("; ");
        const uniqueObjects = Array.from(new Set(abnormalBilirubinObjects));

        for (const obj of uniqueObjects) {
          markCell(obj.cell, SETTINGS.colors.bilirubinRule, reason);
          const checkbox = findCheckboxNearCR(obj.row, crNumber);
          uncheckCR(crNumber, checkbox, reason);
        }

        state.abnormalRows.push({
          crNumber,
          analyte: "Bilirubin rule",
          value: "See TBil/DBil/IBil",
          range: "DBil and IBil must not exceed TBil; no negative values",
          flag: "BILIRUBIN LOGIC ERROR",
          reason
        });
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
      "position: fixed",
      "right: 16px",
      "top: 16px",
      "z-index: 999999",
      "width: 390px",
      "max-height: 80vh",
      "overflow: auto",
      "background: #ffffff",
      "border: 2px solid #2b2b2b",
      "border-radius: 12px",
      "box-shadow: 0 8px 28px rgba(0,0,0,0.25)",
      "font-family: Arial, sans-serif",
      "font-size: 13px",
      "color: #111"
    ].join(";");

    const rows = state.abnormalRows.map((item, index) => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px;">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.crNumber}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.analyte}</td>
        <td style="border:1px solid #ddd;padding:4px;font-weight:700;">${item.value}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.range}</td>
        <td style="border:1px solid #ddd;padding:4px;">${item.flag}</td>
      </tr>
    `).join("");

    panel.innerHTML = `
      <div style="background:#111;color:white;padding:10px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
        <b>LIS AutoValidator V1</b>
        <button id="lis-av-close" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;">×</button>
      </div>
      <div style="padding:10px;">
        <div style="margin-bottom:8px;line-height:1.45;">
          <b>Rows scanned:</b> ${state.rowsScanned}<br>
          <b>Abnormal flags:</b> ${state.abnormalRows.length}<br>
          <b>CR numbers deselected:</b> ${state.uncheckedCRs.size}
        </div>
        <button id="lis-av-print" style="margin:4px 4px 8px 0;padding:6px 10px;border-radius:8px;border:1px solid #444;cursor:pointer;">Print repeat list</button>
        <button id="lis-av-copy" style="margin:4px 4px 8px 0;padding:6px 10px;border-radius:8px;border:1px solid #444;cursor:pointer;">Copy list</button>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="border:1px solid #ddd;padding:4px;">#</th>
              <th style="border:1px solid #ddd;padding:4px;">CR</th>
              <th style="border:1px solid #ddd;padding:4px;">Test</th>
              <th style="border:1px solid #ddd;padding:4px;">Value</th>
              <th style="border:1px solid #ddd;padding:4px;">Range</th>
              <th style="border:1px solid #ddd;padding:4px;">Flag</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" style="padding:10px;text-align:center;">No abnormal values detected</td></tr>`}</tbody>
        </table>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("lis-av-close").onclick = () => panel.remove();
    document.getElementById("lis-av-print").onclick = () => window.print();
    document.getElementById("lis-av-copy").onclick = async () => {
      const text = state.abnormalRows.map((item, i) =>
        `${i + 1}. CR: ${item.crNumber} | ${item.analyte} | Value: ${item.value} | Range: ${item.range} | Flag: ${item.flag}`
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
    for (const row of rows) evaluateRow(row);
    applyBilirubinRules();
    createRepeatPanel();

    console.table(state.abnormalRows);
    console.log("LIS AutoValidator complete", {
      rowsScanned: state.rowsScanned,
      abnormalFlags: state.abnormalRows.length,
      uncheckedCRs: Array.from(state.uncheckedCRs)
    });
  }

  runAutoValidation();
})();
