/*
================================================================================
LIS AutoValidator for Clinical Biochemistry
Plain JavaScript | Console-ready | Bookmarklet-compatible after hosting
================================================================================

WHAT THIS TOOL DOES
- Scans visible LIS result rows.
- Detects 15-digit CR numbers.
- Detects analytes using aliases/spelling variations.
- Extracts numeric result values without mistaking CR numbers as results.
- Compares results with editable reference ranges.
- Flags high, low, negative, invalid, 24-hour urine, and bilirubin logic errors.
- Deselects the checkbox located near/left of the CR number for abnormal samples.
- Generates a floating Biochemistry Repeat List with print, copy, and CSV download.

HOW TO RUN IN CONSOLE
1. Open LIS validation page.
2. Press F12 > Console.
3. Paste this full script and press Enter.
4. Run:
   window.LISAutoValidator.run()

HOW TO RESET HIGHLIGHTS/PANEL
   window.LISAutoValidator.reset()

BOOKMARKLET AFTER HOSTING THIS FILE
1. Upload this file as lis_auto_validator.js to GitHub Pages / Cloudflare Pages.
2. Create a browser bookmark.
3. Paste this into the bookmark URL, replacing YOUR_HOSTED_FILE_URL:

javascript:(()=>{const s=document.createElement('script');s.src='YOUR_HOSTED_FILE_URL?ver='+Date.now();document.body.appendChild(s);s.onload=()=>window.LISAutoValidator&&window.LISAutoValidator.run();})();

TEMPORARY BOOKMARKLET AFTER YOU HAVE ALREADY PASTED THIS SCRIPT ONCE
javascript:(()=>window.LISAutoValidator&&window.LISAutoValidator.run())();

IMPORTANT SAFETY NOTE
This tool only changes the browser UI checkbox state and page highlighting.
It does not submit, save, validate, or modify server-side LIS data.
Always manually review the repeat list before final validation.
================================================================================
*/

(function () {
  "use strict";

  /*****************************************************************************
   * 1. EDIT REFERENCE RANGES HERE
   * -------------------------------------------------------------------------
   * Change min/max/unit according to your laboratory policy.
   * Add aliases if your LIS uses different spellings.
   *****************************************************************************/
  const referenceRanges = {
    glucose_fasting: {
      min: 70,
      max: 100,
      unit: "mg/dL",
      aliases: ["fasting", "fbs", "fasting blood sugar", "fasting plasma glucose", "glucose fasting"]
    },
    glucose_pp: {
      min: 70,
      max: 140,
      unit: "mg/dL",
      aliases: ["ppbs", "post prandial", "postprandial", "post-prandial", "2 hr pp", "2h pp", "glucose pp"]
    },
    glucose_random: {
      min: 70,
      max: 200,
      unit: "mg/dL",
      aliases: ["random blood sugar", "rbs", "random glucose", "glucose random"]
    },
    hba1c: {
      min: 4.0,
      max: 5.6,
      unit: "%",
      aliases: ["hba1c", "hb a1c", "glycated hemoglobin", "glycosylated hemoglobin"]
    },

    sodium: {
      min: 135,
      max: 145,
      unit: "mmol/L",
      aliases: ["sodium", "na", "na+"]
    },
    potassium: {
      min: 3.5,
      max: 5.1,
      unit: "mmol/L",
      aliases: ["potassium", "k", "k+"]
    },
    chloride: {
      min: 98,
      max: 107,
      unit: "mmol/L",
      aliases: ["chloride", "cl", "cl-"]
    },
    calcium: {
      min: 8.6,
      max: 10.2,
      unit: "mg/dL",
      aliases: ["calcium", "ca", "ca++", "total calcium"]
    },
    magnesium: {
      min: 1.7,
      max: 2.4,
      unit: "mg/dL",
      aliases: ["magnesium", "mg", "mg++"]
    },
    phosphate: {
      min: 2.5,
      max: 4.5,
      unit: "mg/dL",
      aliases: ["phosphate", "phosphorus", "po4", "inorganic phosphate"]
    },

    urea: {
      min: 15,
      max: 40,
      unit: "mg/dL",
      aliases: ["urea", "blood urea"]
    },
    creatinine: {
      min: 0.6,
      max: 1.3,
      unit: "mg/dL",
      aliases: ["creatinine", "creat", "serum creatinine"]
    },
    uric_acid: {
      min: 3.5,
      max: 7.2,
      unit: "mg/dL",
      aliases: ["uric acid", "urate"]
    },

    total_bilirubin: {
      min: 0.2,
      max: 1.2,
      unit: "mg/dL",
      aliases: ["total bilirubin", "t bil", "t.bil", "tbil", "bilirubin total", "bil total"]
    },
    direct_bilirubin: {
      min: 0.0,
      max: 0.3,
      unit: "mg/dL",
      aliases: ["direct bilirubin", "d bil", "d.bil", "dbil", "bilirubin direct", "conjugated bilirubin"]
    },
    indirect_bilirubin: {
      min: 0.0,
      max: 0.9,
      unit: "mg/dL",
      aliases: ["indirect bilirubin", "i bil", "i.bil", "ibil", "bilirubin indirect", "unconjugated bilirubin"]
    },
    ast: {
      min: 0,
      max: 40,
      unit: "U/L",
      aliases: ["ast", "sgot", "aspartate aminotransferase"]
    },
    alt: {
      min: 0,
      max: 40,
      unit: "U/L",
      aliases: ["alt", "sgpt", "alanine aminotransferase"]
    },
    alp: {
      min: 40,
      max: 129,
      unit: "U/L",
      aliases: ["alp", "alkaline phosphatase"]
    },
    ggt: {
      min: 0,
      max: 55,
      unit: "U/L",
      aliases: ["ggt", "gamma gt", "gamma glutamyl transferase", "gamma-glutamyl transferase"]
    },
    total_protein: {
      min: 6.4,
      max: 8.3,
      unit: "g/dL",
      aliases: ["total protein", "protein total"]
    },
    albumin: {
      min: 3.5,
      max: 5.2,
      unit: "g/dL",
      aliases: ["albumin", "alb"]
    },
    globulin: {
      min: 2.0,
      max: 3.5,
      unit: "g/dL",
      aliases: ["globulin", "glob"]
    },

    t3: {
      min: 80,
      max: 180,
      unit: "ng/dL",
      aliases: ["t3", "total t3", "tri iodothyronine", "triiodothyronine"]
    },
    t4: {
      min: 4.5,
      max: 12.5,
      unit: "ug/dL",
      aliases: ["t4", "total t4", "thyroxine"]
    },
    tsh: {
      min: 0.4,
      max: 4.5,
      unit: "uIU/mL",
      aliases: ["tsh", "thyroid stimulating hormone"]
    },
    ft4: {
      min: 0.8,
      max: 1.8,
      unit: "ng/dL",
      aliases: ["ft4", "free t4", "free thyroxine"]
    },
    ft3: {
      min: 2.3,
      max: 4.2,
      unit: "pg/mL",
      aliases: ["ft3", "free t3", "free triiodothyronine"]
    },

    serum_iron: {
      min: 60,
      max: 170,
      unit: "ug/dL",
      aliases: ["serum iron", "iron"]
    },
    tibc: {
      min: 240,
      max: 450,
      unit: "ug/dL",
      aliases: ["tibc", "total iron binding capacity"]
    },
    uibc: {
      min: 111,
      max: 343,
      unit: "ug/dL",
      aliases: ["uibc", "unsaturated iron binding capacity"]
    },
    transferrin_saturation: {
      min: 20,
      max: 50,
      unit: "%",
      aliases: ["transferrin saturation", "tsat", "t sat", "iron saturation"]
    },
    ferritin: {
      min: 15,
      max: 300,
      unit: "ng/mL",
      aliases: ["ferritin"]
    },

    vitamin_d: {
      min: 30,
      max: 100,
      unit: "ng/mL",
      aliases: ["vitamin d", "25 oh vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d", "25(oh)d"]
    },
    vitamin_b12: {
      min: 200,
      max: 900,
      unit: "pg/mL",
      aliases: ["vitamin b12", "b12", "cyanocobalamin"]
    },

    hscrp: {
      min: 0,
      max: 3,
      unit: "mg/L",
      aliases: ["hscrp", "hs-crp", "high sensitivity crp", "high sensitive crp"]
    },
    crp: {
      min: 0,
      max: 5,
      unit: "mg/L",
      aliases: ["crp", "c reactive protein", "c-reactive protein"]
    },
    procalcitonin: {
      min: 0,
      max: 0.5,
      unit: "ng/mL",
      aliases: ["procalcitonin", "pct"]
    },
    ntprobnp: {
      min: 0,
      max: 125,
      unit: "pg/mL",
      aliases: ["nt-probnp", "nt probnp", "ntpro bnp", "nt probnp", "pro bnp", "probnp", "nt-pro bnp"]
    },
    prolactin: {
      min: 0,
      max: 25,
      unit: "ng/mL",
      aliases: ["prolactin", "prl"]
    },
    beta_hcg: {
      min: 0,
      max: 5,
      unit: "mIU/mL",
      aliases: ["beta hcg", "beta-hcg", "b-hcg", "bhcg", "β hcg", "β-hcg"]
    },
    ca199: {
      min: 0,
      max: 37,
      unit: "U/mL",
      aliases: ["ca 19.9", "ca19.9", "ca 19-9", "ca19-9", "carbohydrate antigen 19.9", "carbohydrate antigen 19-9"]
    },
    ca125: {
      min: 0,
      max: 35,
      unit: "U/mL",
      aliases: ["ca 125", "ca125", "cancer antigen 125"]
    }
  };

  /*****************************************************************************
   * 2. CONFIGURATION
   *****************************************************************************/
  const CONFIG = {
    crRegex: /\b\d{15}\b/g,
    maxRowsToScan: 10000,
    rowSelector: "tr",
    inputCheckboxSelector: "input[type='checkbox']",
    panelId: "lis-auto-validator-repeat-panel",
    toastId: "lis-auto-validator-toast",
    highlightAttribute: "data-lis-av-highlighted",
    previousStyleAttribute: "data-lis-av-previous-style",
    colors: {
      negative: "#ead7ff",       // light purple
      high: "#ffd6d6",           // light red/pink
      low: "#fff0b8",            // light orange/yellow
      bilirubin: "#d9e8ff",      // light blue
      urine24h: "#e6e6e6",       // grey
      invalid: "#f7d5ff",        // violet-pink
      checkboxMark: "#ffb3b3"
    },
    debug: true
  };

  const state = {
    repeats: [],
    rowsScanned: 0,
    crNumbersFound: new Set(),
    deselectedCRs: new Set(),
    checkboxNotFound: new Set(),
    rowRecords: [],
    bilirubinByCR: new Map(),
    highlightedElements: new Set()
  };

  /*****************************************************************************
   * 3. TEXT NORMALIZATION AND MATCHING
   *****************************************************************************/
  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[β]/g, "beta")
      .replace(/[µμ]/g, "u")
      .replace(/[\u00A0]/g, " ")
      .replace(/[_/\\|,:;()\[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function aliasMatches(text, alias) {
    const normalizedText = normalizeText(text);
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) return false;

    // Special handling for short aliases such as Na, K, Cl, Ca, Mg.
    // This avoids matching K inside words like alkaline.
    if (normalizedAlias.length <= 3 && /^[a-z0-9+\-]+$/.test(normalizedAlias)) {
      const shortPattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedAlias)}($|\\s)`, "i");
      return shortPattern.test(normalizedText);
    }

    return normalizedText.includes(normalizedAlias);
  }

  function detectAnalyte(rowText) {
    const text = normalizeText(rowText);

    // Ordered matching matters. More specific aliases should win before broad ones.
    const priorityKeys = [
      "glucose_fasting", "glucose_pp", "glucose_random",
      "total_bilirubin", "direct_bilirubin", "indirect_bilirubin",
      "transferrin_saturation", "serum_iron",
      "vitamin_d", "vitamin_b12",
      "ntprobnp", "procalcitonin", "prolactin",
      "beta_hcg", "ca199", "ca125",
      "hba1c", "hscrp", "crp",
      "creatinine", "urea", "uric_acid",
      "sodium", "potassium", "chloride", "calcium", "magnesium", "phosphate",
      "albumin", "globulin", "total_protein",
      "ast", "alt", "alp", "ggt",
      "ft3", "ft4", "tsh", "t3", "t4",
      "tibc", "uibc", "ferritin"
    ];

    for (const key of priorityKeys) {
      const range = referenceRanges[key];
      if (!range || !Array.isArray(range.aliases)) continue;
      if (range.aliases.some(alias => aliasMatches(text, alias))) {
        return { key, range, displayName: prettyAnalyteName(key) };
      }
    }

    return null;
  }

  function prettyAnalyteName(key) {
    const names = {
      glucose_fasting: "Fasting blood sugar",
      glucose_pp: "PPBS",
      glucose_random: "Random blood sugar",
      hba1c: "HbA1c",
      sodium: "Sodium",
      potassium: "Potassium",
      chloride: "Chloride",
      calcium: "Calcium",
      magnesium: "Magnesium",
      phosphate: "Phosphate",
      urea: "Urea",
      creatinine: "Creatinine",
      uric_acid: "Uric acid",
      total_bilirubin: "Total bilirubin",
      direct_bilirubin: "Direct bilirubin",
      indirect_bilirubin: "Indirect bilirubin",
      ast: "AST/SGOT",
      alt: "ALT/SGPT",
      alp: "ALP",
      ggt: "GGT",
      total_protein: "Total protein",
      albumin: "Albumin",
      globulin: "Globulin",
      t3: "T3",
      t4: "T4",
      tsh: "TSH",
      ft3: "FT3",
      ft4: "FT4",
      serum_iron: "Serum iron",
      tibc: "TIBC",
      uibc: "UIBC",
      transferrin_saturation: "Transferrin saturation",
      ferritin: "Ferritin",
      vitamin_d: "Vitamin D",
      vitamin_b12: "Vitamin B12",
      hscrp: "hsCRP",
      crp: "CRP",
      ntprobnp: "NT-proBNP",
      procalcitonin: "Procalcitonin",
      prolactin: "Prolactin",
      beta_hcg: "Beta-hCG",
      ca199: "CA 19.9",
      ca125: "CA 125"
    };
    return names[key] || key.replace(/_/g, " ");
  }

  /*****************************************************************************
   * 4. CR NUMBER, ROW, CELL, AND VALUE EXTRACTION
   *****************************************************************************/
  function getVisibleRows() {
    return Array.from(document.querySelectorAll(CONFIG.rowSelector))
      .filter(row => isVisible(row))
      .slice(0, CONFIG.maxRowsToScan);
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function detectCRNumbers(text) {
    const matches = String(text || "").match(CONFIG.crRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }

  function getCells(row) {
    return Array.from(row.querySelectorAll("td, th"));
  }

  function findCRCell(row, crNumber) {
    const cells = getCells(row);
    return cells.find(cell => String(cell.innerText || cell.textContent || "").includes(crNumber)) || row;
  }

  function extractResultValue(row, analyteInfo, crNumbers) {
    const cells = getCells(row);
    const rowText = row.innerText || row.textContent || "";

    // Prefer cells near the analyte name and away from CR number cells.
    const candidateCells = cells
      .map((cell, index) => ({ cell, index, text: String(cell.innerText || cell.textContent || "").trim() }))
      .filter(item => item.text)
      .filter(item => !crNumbers.some(cr => item.text.includes(cr)))
      .filter(item => !containsDateLikeText(item.text))
      .filter(item => !isLikelyReferenceRangeCell(item.text));

    // Strong preference: a cell containing mostly a single result-like value.
    const numericCandidates = [];

    for (const item of candidateCells) {
      const parsed = parseNumericResult(item.text);
      if (!parsed) continue;

      const analyteAliasHit = analyteInfo && analyteInfo.range.aliases.some(alias => aliasMatches(item.text, alias));
      const mostlyNumeric = isMostlyNumericResultCell(item.text);
      const score =
        (mostlyNumeric ? 50 : 0) +
        (analyteAliasHit ? -20 : 0) +
        (item.text.length <= 20 ? 20 : 0) +
        (parsed.comparator ? 5 : 0) +
        (parsed.value < 0 ? 10 : 0);

      numericCandidates.push({ ...item, ...parsed, score });
    }

    if (numericCandidates.length) {
      numericCandidates.sort((a, b) => b.score - a.score);
      const best = numericCandidates[0];
      return {
        value: best.value,
        raw: best.raw,
        comparator: best.comparator,
        cell: best.cell,
        source: "cell"
      };
    }

    // Fallback: parse row text after removing CR numbers and likely ranges.
    let cleanText = rowText;
    for (const cr of crNumbers) cleanText = cleanText.replaceAll(cr, " ");
    cleanText = removeReferenceRangePatterns(cleanText);

    const fallback = parseNumericResult(cleanText);
    if (fallback) {
      return {
        value: fallback.value,
        raw: fallback.raw,
        comparator: fallback.comparator,
        cell: row,
        source: "rowText"
      };
    }

    return null;
  }

  function containsDateLikeText(text) {
    return /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text) || /\b\d{1,2}:\d{2}\b/.test(text);
  }

  function isLikelyReferenceRangeCell(text) {
    const t = normalizeText(text);
    return (
      /\b(ref|reference|normal range|biological reference interval|bri)\b/.test(t) ||
      /\d+(\.\d+)?\s*[-–—to]+\s*\d+(\.\d+)?/.test(t)
    );
  }

  function removeReferenceRangePatterns(text) {
    return String(text || "")
      .replace(/\b\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\b/g, " ")
      .replace(/\b\d+(?:\.\d+)?\s+to\s+\d+(?:\.\d+)?\b/gi, " ");
  }

  function isMostlyNumericResultCell(text) {
    const cleaned = String(text || "")
      .replace(/[<>≤≥=]/g, "")
      .replace(/\s+/g, "")
      .trim();
    return /^-?\d+(?:\.\d+)?$/.test(cleaned);
  }

  function parseNumericResult(text) {
    const source = String(text || "").trim();
    if (!source) return null;

    // Capture result-like numbers including <0.01, >100, -1.2, 0.00.
    // Avoid 15-digit CR-like numbers.
    const regex = /([<>≤≥=])?\s*(-?\d+(?:\.\d+)?)/g;
    const candidates = [];
    let match;

    while ((match = regex.exec(source)) !== null) {
      const rawNumber = match[2];
      if (/^\d{15}$/.test(rawNumber)) continue;

      const value = Number(rawNumber);
      if (!Number.isFinite(value)) continue;

      const rawStart = Math.max(0, match.index - 2);
      const rawEnd = Math.min(source.length, regex.lastIndex + 2);
      const context = source.slice(rawStart, rawEnd);

      candidates.push({
        value,
        raw: context.trim(),
        comparator: normalizeComparator(match[1] || ""),
        index: match.index
      });
    }

    if (!candidates.length) return null;

    // Prefer negative values first because they are clinically impossible/suspicious in most analytes.
    const negative = candidates.find(c => c.value < 0);
    if (negative) return negative;

    // If there are multiple numbers, choose the first result-like number.
    return candidates[0];
  }

  function normalizeComparator(comp) {
    if (comp === "≤") return "<=";
    if (comp === "≥") return ">=";
    return comp || "";
  }

  /*****************************************************************************
   * 5. ABNORMALITY RULES
   *****************************************************************************/
  function evaluateResult(result, analyteInfo, rowText) {
    if (!result || !analyteInfo) {
      return { abnormal: false, reason: "", category: "" };
    }

    const value = result.value;
    const range = analyteInfo.range;

    if (!Number.isFinite(value)) {
      return { abnormal: true, reason: "Invalid/suspicious result", category: "invalid" };
    }

    if (value < 0) {
      return { abnormal: true, reason: "Negative value", category: "negative" };
    }

    // Interpret comparator values conservatively.
    // Example: >100 with max 100 is high. <70 with min 70 is low.
    if ((result.comparator === ">" || result.comparator === ">=") && value >= range.max) {
      return { abnormal: true, reason: "High value", category: "high" };
    }
    if ((result.comparator === "<" || result.comparator === "<=") && value <= range.min) {
      return { abnormal: true, reason: "Low value", category: "low" };
    }

    if (value < range.min) {
      return { abnormal: true, reason: "Low value", category: "low" };
    }
    if (value > range.max) {
      return { abnormal: true, reason: "High value", category: "high" };
    }

    // Invalid text detection for non-numeric-looking row values.
    const normalized = normalizeText(rowText);
    if (/\b(error|invalid|nan|nil|not detected|hemolyzed|clotted|insufficient|qns)\b/.test(normalized)) {
      return { abnormal: true, reason: "Invalid/suspicious result", category: "invalid" };
    }

    return { abnormal: false, reason: "Within range", category: "normal" };
  }

  function is24HourUrineRow(rowText) {
    const t = normalizeText(rowText);
    return /\b(24\s*hour|24\s*hr|24\s*hrs|twenty four hour)\b.*\burine\b/.test(t) ||
           /\burine\b.*\b(24\s*hour|24\s*hr|24\s*hrs|twenty four hour)\b/.test(t);
  }

  function collectBilirubin(crNumber, analyteKey, result, row, resultCell) {
    if (!["total_bilirubin", "direct_bilirubin", "indirect_bilirubin"].includes(analyteKey)) return;

    if (!state.bilirubinByCR.has(crNumber)) {
      state.bilirubinByCR.set(crNumber, {});
    }

    state.bilirubinByCR.get(crNumber)[analyteKey] = {
      value: result ? result.value : null,
      raw: result ? result.raw : "",
      row,
      cell: resultCell || row
    };
  }

  function validateBilirubinLogic() {
    for (const [crNumber, bilirubin] of state.bilirubinByCR.entries()) {
      const total = bilirubin.total_bilirubin;
      const direct = bilirubin.direct_bilirubin;
      const indirect = bilirubin.indirect_bilirubin;

      if (total && direct && Number.isFinite(total.value) && Number.isFinite(direct.value) && direct.value > total.value) {
        addBilirubinLogicRepeat(
          crNumber,
          bilirubin,
          "Bilirubin logic error: Direct bilirubin greater than total bilirubin"
        );
      }

      if (total && indirect && Number.isFinite(total.value) && Number.isFinite(indirect.value) && indirect.value > total.value) {
        addBilirubinLogicRepeat(
          crNumber,
          bilirubin,
          "Bilirubin logic error: Indirect bilirubin greater than total bilirubin"
        );
      }

      for (const key of ["total_bilirubin", "direct_bilirubin", "indirect_bilirubin"]) {
        const item = bilirubin[key];
        if (item && Number.isFinite(item.value) && item.value < 0) {
          addBilirubinLogicRepeat(
            crNumber,
            bilirubin,
            "Bilirubin logic error: Bilirubin fraction has negative value"
          );
        }
      }
    }
  }

  function addBilirubinLogicRepeat(crNumber, bilirubin, reason) {
    const affected = [bilirubin.total_bilirubin, bilirubin.direct_bilirubin, bilirubin.indirect_bilirubin].filter(Boolean);

    for (const item of affected) {
      highlightElement(item.cell || item.row, CONFIG.colors.bilirubin);
    }

    const checkbox = findCheckboxForCR(crNumber, affected[0] ? affected[0].row : null);
    const deselected = deselectCheckbox(checkbox, crNumber);

    addRepeat({
      crNumber,
      testName: "Bilirubin fractions",
      resultValue: formatBilirubinValues(bilirubin),
      referenceRange: "Direct/Indirect must not exceed Total",
      reason,
      category: "bilirubin",
      row: affected[0] ? affected[0].row : null,
      resultCell: affected[0] ? affected[0].cell : null,
      checkboxDeselected: deselected
    });
  }

  function formatBilirubinValues(bilirubin) {
    const parts = [];
    if (bilirubin.total_bilirubin) parts.push(`TBil ${bilirubin.total_bilirubin.value}`);
    if (bilirubin.direct_bilirubin) parts.push(`DBil ${bilirubin.direct_bilirubin.value}`);
    if (bilirubin.indirect_bilirubin) parts.push(`IBil ${bilirubin.indirect_bilirubin.value}`);
    return parts.join(", ");
  }

  /*****************************************************************************
   * 6. CHECKBOX LOCATION AND DESELECTION
   *****************************************************************************/
  function findCheckboxForCR(crNumber, row) {
    if (!crNumber) return null;

    // Strategy 1: same row, checkbox before CR cell.
    if (row) {
      const crCell = findCRCell(row, crNumber);
      const cells = getCells(row);
      const crIndex = cells.indexOf(crCell);

      if (crIndex >= 0) {
        for (let i = crIndex; i >= 0; i--) {
          const checkbox = cells[i].querySelector(CONFIG.inputCheckboxSelector);
          if (checkbox) return checkbox;
        }
      }

      // Strategy 2: any checkbox in the same row.
      const sameRowCheckbox = row.querySelector(CONFIG.inputCheckboxSelector);
      if (sameRowCheckbox) return sameRowCheckbox;
    }

    // Strategy 3: find row containing CR anywhere on page, then checkbox before CR.
    const rows = getVisibleRows();
    const crRow = rows.find(r => String(r.innerText || r.textContent || "").includes(crNumber));
    if (crRow) {
      const crCell = findCRCell(crRow, crNumber);
      const cells = getCells(crRow);
      const crIndex = cells.indexOf(crCell);
      if (crIndex >= 0) {
        for (let i = crIndex; i >= 0; i--) {
          const checkbox = cells[i].querySelector(CONFIG.inputCheckboxSelector);
          if (checkbox) return checkbox;
        }
      }
      const checkbox = crRow.querySelector(CONFIG.inputCheckboxSelector);
      if (checkbox) return checkbox;
    }

    // Strategy 4: nearest checkbox physically to CR text node/cell.
    const allCheckboxes = Array.from(document.querySelectorAll(CONFIG.inputCheckboxSelector)).filter(isVisible);
    const crElement = findElementContainingText(crNumber);
    if (crElement && allCheckboxes.length) {
      const crRect = crElement.getBoundingClientRect();
      let best = null;
      let bestDistance = Infinity;

      for (const checkbox of allCheckboxes) {
        const cbRect = checkbox.getBoundingClientRect();
        // Favor checkboxes to the left of CR number.
        const isLeft = cbRect.right <= crRect.left + 20;
        const verticalDistance = Math.abs((cbRect.top + cbRect.bottom) / 2 - (crRect.top + crRect.bottom) / 2);
        const horizontalDistance = Math.abs(crRect.left - cbRect.right);
        const distance = verticalDistance * 4 + horizontalDistance + (isLeft ? 0 : 1000);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = checkbox;
        }
      }
      if (best && bestDistance < 1500) return best;
    }

    state.checkboxNotFound.add(crNumber);
    return null;
  }

  function findElementContainingText(text) {
    const candidates = Array.from(document.querySelectorAll("td, th, span, div, label"));
    return candidates.find(el => isVisible(el) && String(el.innerText || el.textContent || "").includes(text)) || null;
  }

  function deselectCheckbox(checkbox, crNumber) {
    if (!checkbox) {
      state.checkboxNotFound.add(crNumber);
      return false;
    }

    if (checkbox.checked) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("input", { bubbles: true }));
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

      // Some LIS UIs re-toggle on synthetic click. Enforce unchecked again.
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    markCheckbox(checkbox);
    state.deselectedCRs.add(crNumber);
    return true;
  }

  function markCheckbox(checkbox) {
    const target = checkbox.closest("td, th") || checkbox.parentElement || checkbox;
    highlightElement(target, CONFIG.colors.checkboxMark);
  }

  /*****************************************************************************
   * 7. HIGHLIGHTING, REPEAT STORAGE, AND DEDUPLICATION
   *****************************************************************************/
  function highlightElement(element, color) {
    if (!element) return;

    if (!element.hasAttribute(CONFIG.previousStyleAttribute)) {
      element.setAttribute(CONFIG.previousStyleAttribute, element.getAttribute("style") || "");
    }

    element.style.backgroundColor = color;
    element.style.outline = "1px solid rgba(0,0,0,0.15)";
    element.setAttribute(CONFIG.highlightAttribute, "true");
    state.highlightedElements.add(element);
  }

  function addRepeat(item) {
    const key = [item.crNumber, item.testName, item.resultValue, item.reason].join("|");
    if (state.repeats.some(existing => existing._key === key)) return;
    state.repeats.push({ ...item, _key: key });
  }

  function makeReferenceRangeText(range) {
    if (!range) return "Not configured";
    return `${range.min} - ${range.max} ${range.unit || ""}`.trim();
  }

  function resultDisplay(result) {
    if (!result) return "Not numeric / suspicious";
    return `${result.comparator || ""}${result.value}`;
  }

  /*****************************************************************************
   * 8. MAIN SCAN FUNCTION
   *****************************************************************************/
  function run() {
    reset({ silent: true });
    resetStateCounters();

    const rows = getVisibleRows();
    state.rowsScanned = rows.length;

    for (const row of rows) {
      const rowText = row.innerText || row.textContent || "";
      const crNumbers = detectCRNumbers(rowText);

      if (!crNumbers.length) continue;

      for (const cr of crNumbers) state.crNumbersFound.add(cr);

      const analyteInfo = detectAnalyte(rowText);
      const isUrine24 = is24HourUrineRow(rowText);

      for (const crNumber of crNumbers) {
        let result = null;
        let evaluation = { abnormal: false, reason: "", category: "" };

        if (analyteInfo) {
          result = extractResultValue(row, analyteInfo, crNumbers);
          collectBilirubin(crNumber, analyteInfo.key, result, row, result ? result.cell : row);
          evaluation = evaluateResult(result, analyteInfo, rowText);
        }

        if (isUrine24) {
          const checkbox = findCheckboxForCR(crNumber, row);
          const deselected = deselectCheckbox(checkbox, crNumber);
          highlightElement(row, CONFIG.colors.urine24h);
          addRepeat({
            crNumber,
            testName: analyteInfo ? analyteInfo.displayName : "24-hour urine sample",
            resultValue: result ? resultDisplay(result) : "",
            referenceRange: analyteInfo ? makeReferenceRangeText(analyteInfo.range) : "Hold/review",
            reason: "24-hour urine sample",
            category: "urine24h",
            row,
            resultCell: result ? result.cell : row,
            checkboxDeselected: deselected
          });
        }

        if (analyteInfo && evaluation.abnormal) {
          const color = CONFIG.colors[evaluation.category] || CONFIG.colors.invalid;
          const highlightTarget = result ? result.cell : row;
          highlightElement(highlightTarget, color);

          const checkbox = findCheckboxForCR(crNumber, row);
          const deselected = deselectCheckbox(checkbox, crNumber);

          addRepeat({
            crNumber,
            testName: analyteInfo.displayName,
            resultValue: resultDisplay(result),
            referenceRange: makeReferenceRangeText(analyteInfo.range),
            reason: evaluation.reason,
            category: evaluation.category,
            row,
            resultCell: highlightTarget,
            checkboxDeselected: deselected
          });
        }

        state.rowRecords.push({ crNumber, row, analyteInfo, result, evaluation, isUrine24 });
      }
    }

    validateBilirubinLogic();
    renderRepeatPanel();
    showToast(`Auto-validation completed: ${state.repeats.length} repeats found, ${state.deselectedCRs.size} checkboxes deselected.`);
    logDebugSummary();

    return getSummary();
  }

  function resetStateCounters() {
    state.repeats = [];
    state.rowsScanned = 0;
    state.crNumbersFound = new Set();
    state.deselectedCRs = new Set();
    state.checkboxNotFound = new Set();
    state.rowRecords = [];
    state.bilirubinByCR = new Map();
    state.highlightedElements = new Set();
  }

  /*****************************************************************************
   * 9. UI PANEL
   *****************************************************************************/
  function renderRepeatPanel() {
    removePanel();

    const panel = document.createElement("div");
    panel.id = CONFIG.panelId;
    panel.style.cssText = `
      position: fixed;
      top: 70px;
      right: 18px;
      width: 520px;
      max-width: calc(100vw - 36px);
      max-height: 78vh;
      z-index: 999999;
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 14px;
      box-shadow: 0 12px 35px rgba(0,0,0,0.22);
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2328;
      overflow: hidden;
    `;

    const timestamp = new Date().toLocaleString();

    panel.innerHTML = `
      <div style="padding:12px 14px;background:#0f172a;color:white;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div>
          <div style="font-weight:700;font-size:15px;">Biochemistry Repeat List</div>
          <div style="font-size:11px;opacity:0.85;">${escapeHTML(timestamp)} | ${state.repeats.length} repeat(s)</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button data-lis-av-action="minimize" style="${buttonStyle()}">−</button>
          <button data-lis-av-action="close" style="${buttonStyle()}">×</button>
        </div>
      </div>
      <div data-lis-av-toolbar style="display:flex;gap:7px;padding:10px;background:#f6f8fa;border-bottom:1px solid #d0d7de;flex-wrap:wrap;">
        <button data-lis-av-action="print" style="${toolbarButtonStyle()}">Print</button>
        <button data-lis-av-action="copy" style="${toolbarButtonStyle()}">Copy</button>
        <button data-lis-av-action="csv" style="${toolbarButtonStyle()}">Download CSV</button>
        <button data-lis-av-action="reset" style="${toolbarButtonStyle()}">Reset UI</button>
      </div>
      <div data-lis-av-body style="max-height:58vh;overflow:auto;">
        ${repeatTableHTML()}
      </div>
      <div style="padding:8px 12px;background:#f6f8fa;border-top:1px solid #d0d7de;font-size:11px;color:#57606a;">
        Rows scanned: ${state.rowsScanned} | CR numbers: ${state.crNumbersFound.size} | Checkbox not found: ${state.checkboxNotFound.size}
      </div>
    `;

    document.body.appendChild(panel);
    attachPanelActions(panel);
  }

  function buttonStyle() {
    return "border:0;border-radius:8px;background:#334155;color:white;padding:4px 9px;cursor:pointer;font-size:14px;";
  }

  function toolbarButtonStyle() {
    return "border:1px solid #d0d7de;border-radius:8px;background:white;color:#24292f;padding:6px 9px;cursor:pointer;font-size:12px;";
  }

  function repeatTableHTML() {
    if (!state.repeats.length) {
      return `
        <div style="padding:22px;text-align:center;color:#22863a;font-weight:700;">
          No repeat values detected in configured tests.
        </div>
      `;
    }

    const rows = state.repeats.map((item, index) => `
      <tr>
        <td style="${tdStyle()}">${index + 1}</td>
        <td style="${tdStyle()};font-family:monospace;">${escapeHTML(item.crNumber)}</td>
        <td style="${tdStyle()}">${escapeHTML(item.testName)}</td>
        <td style="${tdStyle()}">${escapeHTML(item.resultValue)}</td>
        <td style="${tdStyle()}">${escapeHTML(item.referenceRange)}</td>
        <td style="${tdStyle()}">${escapeHTML(item.reason)}</td>
      </tr>
    `).join("");

    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead style="position:sticky;top:0;background:#eaeef2;z-index:1;">
          <tr>
            <th style="${thStyle()}">#</th>
            <th style="${thStyle()}">CR Number</th>
            <th style="${thStyle()}">Test</th>
            <th style="${thStyle()}">Result</th>
            <th style="${thStyle()}">Reference</th>
            <th style="${thStyle()}">Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function thStyle() {
    return "padding:8px;border-bottom:1px solid #d0d7de;text-align:left;font-weight:700;color:#24292f;";
  }

  function tdStyle() {
    return "padding:7px 8px;border-bottom:1px solid #eaeef2;vertical-align:top;";
  }

  function attachPanelActions(panel) {
    panel.addEventListener("click", event => {
      const button = event.target.closest("button[data-lis-av-action]");
      if (!button) return;

      const action = button.getAttribute("data-lis-av-action");
      if (action === "close") removePanel();
      if (action === "minimize") togglePanelMinimize(panel, button);
      if (action === "print") printRepeatList();
      if (action === "copy") copyRepeatList();
      if (action === "csv") downloadCSV();
      if (action === "reset") reset();
    });
  }

  function togglePanelMinimize(panel, button) {
    const body = panel.querySelector("[data-lis-av-body]");
    const toolbar = panel.querySelector("[data-lis-av-toolbar]");
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "block" : "none";
    toolbar.style.display = isHidden ? "flex" : "none";
    button.textContent = isHidden ? "−" : "+";
  }

  function removePanel() {
    const existing = document.getElementById(CONFIG.panelId);
    if (existing) existing.remove();
  }

  function showToast(message) {
    const existing = document.getElementById(CONFIG.toastId);
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = CONFIG.toastId;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000000;
      background: #0f172a;
      color: white;
      padding: 11px 14px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.25);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      max-width: 420px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5500);
  }

  /*****************************************************************************
   * 10. COPY, CSV, PRINT
   *****************************************************************************/
  function getRepeatListText() {
    const lines = [];
    lines.push("Biochemistry Repeat List");
    lines.push(`Timestamp: ${new Date().toLocaleString()}`);
    lines.push(`Total repeats: ${state.repeats.length}`);
    lines.push("");
    lines.push("#\tCR Number\tTest\tResult\tReference Range\tReason");

    state.repeats.forEach((item, index) => {
      lines.push([
        index + 1,
        item.crNumber,
        item.testName,
        item.resultValue,
        item.referenceRange,
        item.reason
      ].join("\t"));
    });

    return lines.join("\n");
  }

  async function copyRepeatList() {
    const text = getRepeatListText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Repeat list copied to clipboard.");
    } catch (error) {
      console.warn("Clipboard API failed. Copy manually from console output.", error);
      console.log(text);
      showToast("Clipboard blocked. Repeat list printed in console.");
    }
  }

  function downloadCSV() {
    const csv = toCSV(state.repeats);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biochemistry_repeat_list_${timestampForFilename()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded.");
  }

  function toCSV(repeats) {
    const header = ["Serial", "CR Number", "Test", "Result", "Reference Range", "Reason"];
    const lines = [header.map(csvEscape).join(",")];
    repeats.forEach((item, index) => {
      lines.push([
        index + 1,
        item.crNumber,
        item.testName,
        item.resultValue,
        item.referenceRange,
        item.reason
      ].map(csvEscape).join(","));
    });
    return lines.join("\n");
  }

  function csvEscape(value) {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function timestampForFilename() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  function printRepeatList() {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) {
      showToast("Popup blocked. Please allow popups to print.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>Biochemistry Repeat List</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111827; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #4b5563; margin-bottom: 18px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Biochemistry Repeat List</h1>
        <div class="meta">Generated: ${escapeHTML(new Date().toLocaleString())} | Total repeats: ${state.repeats.length}</div>
        ${repeatTableHTML()}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  /*****************************************************************************
   * 11. RESET
   *****************************************************************************/
  function reset(options = {}) {
    removePanel();

    const highlighted = Array.from(document.querySelectorAll(`[${CONFIG.highlightAttribute}='true']`));
    for (const el of highlighted) {
      const previous = el.getAttribute(CONFIG.previousStyleAttribute);
      if (previous !== null) {
        el.setAttribute("style", previous);
      } else {
        el.style.backgroundColor = "";
        el.style.outline = "";
      }
      el.removeAttribute(CONFIG.highlightAttribute);
      el.removeAttribute(CONFIG.previousStyleAttribute);
    }

    const toast = document.getElementById(CONFIG.toastId);
    if (toast) toast.remove();

    if (!options.silent) {
      showToast("AutoValidator UI reset. Checkboxes were not rechecked.");
    }
  }

  /*****************************************************************************
   * 12. DEBUGGING AND SUMMARY
   *****************************************************************************/
  function getSummary() {
    return {
      rowsScanned: state.rowsScanned,
      crNumbersFound: state.crNumbersFound.size,
      abnormalResultsFound: state.repeats.length,
      checkboxesDeselected: state.deselectedCRs.size,
      deselectedCRNumbers: Array.from(state.deselectedCRs),
      checkboxNotFound: Array.from(state.checkboxNotFound),
      repeats: state.repeats.map(({ _key, row, resultCell, ...safe }) => safe)
    };
  }

  function logDebugSummary() {
    if (!CONFIG.debug) return;

    const summary = getSummary();
    console.group("LIS AutoValidator Debug Summary");
    console.log("Total rows scanned:", summary.rowsScanned);
    console.log("Total CR numbers found:", summary.crNumbersFound);
    console.log("Total abnormal results found:", summary.abnormalResultsFound);
    console.log("Total checkboxes deselected:", summary.checkboxesDeselected);
    console.log("CR numbers deselected:", summary.deselectedCRNumbers);
    console.log("Rows where checkbox could not be found:", summary.checkboxNotFound);
    console.table(summary.repeats);
    console.groupEnd();
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /*****************************************************************************
   * 13. PUBLIC API
   *****************************************************************************/
  window.LISAutoValidator = {
    run,
    reset,
    downloadCSV,
    copyRepeatList,
    printRepeatList,
    getSummary,
    referenceRanges,
    config: CONFIG
  };

  console.log(
    "%cLIS AutoValidator loaded. Run window.LISAutoValidator.run()",
    "background:#0f172a;color:white;padding:6px 8px;border-radius:6px;"
  );
})();
