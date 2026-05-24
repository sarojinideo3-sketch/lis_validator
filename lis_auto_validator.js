/*
  LIS AutoValidator
  Repository file: lis_auto_validator.js

  How to use:
  1. Paste your complete JavaScript auto-validation code in this file.
  2. Keep window.LISAutoValidator.run() at the end if you want the bookmarklet to run automatically.
  3. Host this repository with GitHub Pages.
  4. Use the bookmarklet loader URL shown below.

  Bookmarklet template:
  javascript:(function(){var s=document.createElement('script');s.src='https://sarojinideo3-sketch.github.io/lis_validator/lis_auto_validator.js?v='+Date.now();document.body.appendChild(s);})();
*/

(function () {
  'use strict';

  // Prevent duplicate panels/highlights if the bookmark is clicked multiple times.
  if (window.LISAutoValidator && typeof window.LISAutoValidator.reset === 'function') {
    try {
      window.LISAutoValidator.reset();
    } catch (error) {
      console.warn('[LISAutoValidator] Previous reset failed:', error);
    }
  }

  const CONFIG = {
    crRegex: /\b\d{15}\b/,
    colors: {
      high: '#ffd6d6',
      low: '#fff3bf',
      negative: '#eadcff',
      bilirubinLogic: '#dbeafe',
      urine24h: '#e5e7eb'
    },
    referenceRanges: {
      glucose_fasting: { min: 70, max: 100, unit: 'mg/dL', aliases: ['fasting', 'fbs', 'fasting blood sugar'] },
      glucose_pp: { min: 70, max: 140, unit: 'mg/dL', aliases: ['ppbs', 'post prandial', 'postprandial'] },
      glucose_random: { min: 70, max: 200, unit: 'mg/dL', aliases: ['random blood sugar', 'rbs'] },
      hba1c: { min: 4.0, max: 5.6, unit: '%', aliases: ['hba1c', 'glycated hemoglobin'] },
      sodium: { min: 135, max: 145, unit: 'mmol/L', aliases: ['sodium', 'na'] },
      potassium: { min: 3.5, max: 5.1, unit: 'mmol/L', aliases: ['potassium', 'k'] },
      chloride: { min: 98, max: 107, unit: 'mmol/L', aliases: ['chloride', 'cl'] },
      calcium: { min: 8.6, max: 10.2, unit: 'mg/dL', aliases: ['calcium', 'ca'] },
      magnesium: { min: 1.7, max: 2.4, unit: 'mg/dL', aliases: ['magnesium', 'mg'] },
      phosphate: { min: 2.5, max: 4.5, unit: 'mg/dL', aliases: ['phosphate', 'phosphorus'] },
      urea: { min: 15, max: 40, unit: 'mg/dL', aliases: ['urea'] },
      creatinine: { min: 0.6, max: 1.3, unit: 'mg/dL', aliases: ['creatinine', 'creat'] },
      total_bilirubin: { min: 0.2, max: 1.2, unit: 'mg/dL', aliases: ['total bilirubin', 't bil', 't.bil', 'tbil'] },
      direct_bilirubin: { min: 0, max: 0.3, unit: 'mg/dL', aliases: ['direct bilirubin', 'd bil', 'd.bil', 'dbil'] },
      indirect_bilirubin: { min: 0, max: 0.9, unit: 'mg/dL', aliases: ['indirect bilirubin', 'i bil', 'i.bil', 'ibil'] },
      ast: { min: 0, max: 40, unit: 'U/L', aliases: ['ast', 'sgot'] },
      alt: { min: 0, max: 40, unit: 'U/L', aliases: ['alt', 'sgpt'] },
      alp: { min: 40, max: 129, unit: 'U/L', aliases: ['alp', 'alkaline phosphatase'] },
      ggt: { min: 0, max: 55, unit: 'U/L', aliases: ['ggt', 'gamma gt'] },
      tsh: { min: 0.4, max: 4.5, unit: 'uIU/mL', aliases: ['tsh'] },
      ft4: { min: 0.8, max: 1.8, unit: 'ng/dL', aliases: ['ft4', 'free t4'] },
      ft3: { min: 2.3, max: 4.2, unit: 'pg/mL', aliases: ['ft3', 'free t3'] },
      ferritin: { min: 15, max: 300, unit: 'ng/mL', aliases: ['ferritin'] },
      hscrp: { min: 0, max: 3, unit: 'mg/L', aliases: ['hscrp', 'hs-crp', 'high sensitivity crp'] },
      procalcitonin: { min: 0, max: 0.5, unit: 'ng/mL', aliases: ['procalcitonin', 'pct'] },
      ntprobnp: { min: 0, max: 125, unit: 'pg/mL', aliases: ['nt-probnp', 'nt probnp', 'pro bnp'] },
      prolactin: { min: 0, max: 25, unit: 'ng/mL', aliases: ['prolactin'] },
      beta_hcg: { min: 0, max: 5, unit: 'mIU/mL', aliases: ['beta hcg', 'b-hcg', 'bhcg'] },
      ca199: { min: 0, max: 37, unit: 'U/mL', aliases: ['ca 19.9', 'ca19.9', 'ca 19-9'] },
      ca125: { min: 0, max: 35, unit: 'U/mL', aliases: ['ca 125', 'ca125'] }
    }
  };

  const state = {
    repeatList: [],
    highlightedElements: [],
    uncheckedCheckboxes: [],
    panelId: 'lis-auto-validator-repeat-panel'
  };

  function normalizeText(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findAnalyte(rowText) {
    const normalized = normalizeText(rowText);
    for (const [key, range] of Object.entries(CONFIG.referenceRanges)) {
      if (range.aliases.some(alias => normalized.includes(alias.toLowerCase()))) {
        return { key, range };
      }
    }
    return null;
  }

  function extractResultValue(rowText, crNumber) {
    const withoutCR = String(rowText || '').replace(crNumber || '', '');
    const matches = withoutCR.match(/[<>]?\s*-?\d+(?:\.\d+)?/g) || [];
    for (const raw of matches) {
      const cleaned = raw.replace(/[<>\s]/g, '');
      const num = Number(cleaned);
      if (Number.isFinite(num)) return { raw: raw.trim(), value: num };
    }
    return null;
  }

  function findCheckboxNearCR(row, crNumber) {
    const checkboxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
    if (checkboxes.length > 0) return checkboxes[0];

    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const rowRect = row.getBoundingClientRect();
    let best = null;
    let bestDistance = Infinity;

    for (const checkbox of allCheckboxes) {
      const rect = checkbox.getBoundingClientRect();
      const verticalDistance = Math.abs(rect.top - rowRect.top);
      const isLeftSide = rect.left <= rowRect.left + rowRect.width;
      if (isLeftSide && verticalDistance < bestDistance) {
        best = checkbox;
        bestDistance = verticalDistance;
      }
    }

    return bestDistance < 40 ? best : null;
  }

  function highlightRow(row, color) {
    row.style.backgroundColor = color;
    row.dataset.lisAutoValidatorHighlighted = 'true';
    state.highlightedElements.push(row);
  }

  function addRepeat(item) {
    state.repeatList.push(item);
  }

  function deselectCheckbox(checkbox, crNumber) {
    if (!checkbox) {
      console.warn('[LISAutoValidator] Checkbox not found for CR:', crNumber);
      return false;
    }

    if (checkbox.checked) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    }

    state.uncheckedCheckboxes.push({ crNumber, checkbox });
    return true;
  }

  function createRepeatPanel() {
    const oldPanel = document.getElementById(state.panelId);
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = state.panelId;
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 520px;
      max-height: 70vh;
      overflow: auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
      z-index: 999999;
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #0f172a;
    `;

    const rows = state.repeatList.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.crNumber}</td>
        <td>${item.testName}</td>
        <td>${item.result}</td>
        <td>${item.range}</td>
        <td>${item.reason}</td>
      </tr>
    `).join('');

    panel.innerHTML = `
      <div style="padding:10px 12px; background:#0f172a; color:#fff; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center;">
        <strong>Biochemistry Repeat List (${state.repeatList.length})</strong>
        <span>
          <button id="lis-av-copy">Copy</button>
          <button id="lis-av-csv">CSV</button>
          <button id="lis-av-print">Print</button>
          <button id="lis-av-close">X</button>
        </span>
      </div>
      <div style="padding:8px 12px; color:#475569;">Scan time: ${new Date().toLocaleString()}</div>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>#</th><th>CR No.</th><th>Test</th><th>Result</th><th>Range</th><th>Reason</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center; padding:12px;">No repeats found</td></tr>'}</tbody>
      </table>
    `;

    document.body.appendChild(panel);
    document.getElementById('lis-av-close').onclick = () => panel.remove();
    document.getElementById('lis-av-copy').onclick = copyRepeatList;
    document.getElementById('lis-av-csv').onclick = downloadCSV;
    document.getElementById('lis-av-print').onclick = printRepeatList;
  }

  function copyRepeatList() {
    const text = state.repeatList.map((item, index) => `${index + 1}. ${item.crNumber} | ${item.testName} | ${item.result} | ${item.range} | ${item.reason}`).join('\n');
    navigator.clipboard.writeText(text).then(() => alert('Repeat list copied.'));
  }

  function downloadCSV() {
    const header = ['Serial', 'CR Number', 'Test Name', 'Result', 'Reference Range', 'Reason'];
    const rows = state.repeatList.map((item, index) => [index + 1, item.crNumber, item.testName, item.result, item.range, item.reason]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biochemistry-repeat-list-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printRepeatList() {
    const panel = document.getElementById(state.panelId);
    if (!panel) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Biochemistry Repeat List</title></head><body>${panel.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  function run() {
    reset();

    const rows = Array.from(document.querySelectorAll('tr'));
    const crToCheckbox = new Map();
    const crAbnormal = new Set();

    rows.forEach(row => {
      const rowText = row.innerText || row.textContent || '';
      const crMatch = rowText.match(CONFIG.crRegex);
      if (!crMatch) return;

      const crNumber = crMatch[0];
      const checkbox = findCheckboxNearCR(row, crNumber);
      if (checkbox && !crToCheckbox.has(crNumber)) crToCheckbox.set(crNumber, checkbox);

      const normalized = normalizeText(rowText);
      const is24hUrine = /24\s*-?\s*(hour|hr|hrs).*urine/.test(normalized);
      const analyte = findAnalyte(rowText);
      const result = extractResultValue(rowText, crNumber);

      if (is24hUrine) {
        highlightRow(row, CONFIG.colors.urine24h);
        addRepeat({ crNumber, testName: '24-hour urine', result: result ? result.raw : '', range: 'Hold', reason: '24-hour urine sample' });
        crAbnormal.add(crNumber);
        return;
      }

      if (!analyte || !result) return;

      const { key, range } = analyte;
      const rangeText = `${range.min}-${range.max} ${range.unit}`;

      if (result.value < 0) {
        highlightRow(row, CONFIG.colors.negative);
        addRepeat({ crNumber, testName: key, result: result.raw, range: rangeText, reason: 'Negative value' });
        crAbnormal.add(crNumber);
      } else if (result.value < range.min) {
        highlightRow(row, CONFIG.colors.low);
        addRepeat({ crNumber, testName: key, result: result.raw, range: rangeText, reason: 'Low value' });
        crAbnormal.add(crNumber);
      } else if (result.value > range.max) {
        highlightRow(row, CONFIG.colors.high);
        addRepeat({ crNumber, testName: key, result: result.raw, range: rangeText, reason: 'High value' });
        crAbnormal.add(crNumber);
      }
    });

    crAbnormal.forEach(crNumber => {
      deselectCheckbox(crToCheckbox.get(crNumber), crNumber);
    });

    createRepeatPanel();

    console.log('[LISAutoValidator] Total rows scanned:', rows.length);
    console.log('[LISAutoValidator] Total repeats found:', state.repeatList.length);
    console.log('[LISAutoValidator] Total checkboxes deselected:', state.uncheckedCheckboxes.length);
    console.log('[LISAutoValidator] CR numbers deselected:', Array.from(crAbnormal));

    alert(`Auto-validation completed: ${state.repeatList.length} repeats found, ${state.uncheckedCheckboxes.length} checkboxes deselected.`);
  }

  function reset() {
    const oldPanel = document.getElementById(state.panelId);
    if (oldPanel) oldPanel.remove();

    document.querySelectorAll('[data-lis-auto-validator-highlighted="true"]').forEach(el => {
      el.style.backgroundColor = '';
      delete el.dataset.lisAutoValidatorHighlighted;
    });

    state.repeatList = [];
    state.highlightedElements = [];
    state.uncheckedCheckboxes = [];
  }

  window.LISAutoValidator = {
    run,
    reset,
    copyRepeatList,
    downloadCSV,
    printRepeatList,
    CONFIG
  };

  run();
})();
