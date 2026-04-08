(function () {
  'use strict';

  if (window.__AUTO_VALIDATION_TOOL__) {
    window.__AUTO_VALIDATION_TOOL__.destroy();
  }

  const TOOL = {
    running: false,
    stopRequested: false,
    processedRows: 0,
    deselectedRows: 0,
    abnormalItems: 0,
    log: [],
    pageDelayMs: 450,
    maxRowsToScan: 100,
    slightTolerance: 0.10,
    rowSelectors: [
      'table tbody tr',
      'tr'
    ]
  };

  const COLORS = {
    violet: '#ead7ff',
    red: '#ffd9d9',
    green: '#ddf7dd',
    yellow: '#fff3cd',
    outline: '#3b82f6'
  };

  const RANGE = {
    electrolytes: {
      sodium: { min: 135, max: 145, unit: 'mmol/L' },
      potassium: { min: 3.5, max: 5.1, unit: 'mmol/L' },
      chloride: { min: 98, max: 107, unit: 'mmol/L' },
      bicarbonate: { min: 22, max: 29, unit: 'mmol/L' }
    },
    calcium: {
      total: { min: 8.6, max: 10.2, unit: 'mg/dL' },
      ionized: { min: 1.12, max: 1.32, unit: 'mmol/L' }
    },
    phosphate: { min: 2.5, max: 4.5, unit: 'mg/dL' },
    magnesium: { min: 1.7, max: 2.2, unit: 'mg/dL' },
    lipid: {
      total_cholesterol: { min: 0, max: 200, unit: 'mg/dL' },
      triglycerides: { min: 0, max: 150, unit: 'mg/dL' },
      hdl_male: { min: 40, max: Infinity, unit: 'mg/dL' },
      hdl_female: { min: 50, max: Infinity, unit: 'mg/dL' },
      ldl: { min: 0, max: 100, unit: 'mg/dL' },
      vldl: { min: 5, max: 40, unit: 'mg/dL' }
    },
    lft: {
      ast: { min: 10, max: 40, unit: 'U/L' },
      alt: { min: 7, max: 56, unit: 'U/L' },
      alp: { min: 44, max: 147, unit: 'U/L' },
      ggt: { min: 9, max: 48, unit: 'U/L' },
      total_protein: { min: 6.0, max: 8.3, unit: 'g/dL' },
      albumin: { min: 3.5, max: 5.0, unit: 'g/dL' },
      globulin: { min: 2.0, max: 3.5, unit: 'g/dL' },
      ag_ratio: { min: 1.0, max: 2.2, unit: 'ratio' },
      total_bilirubin: { min: 0.2, max: 1.2, unit: 'mg/dL' },
      direct_bilirubin: { min: 0.0, max: 0.3, unit: 'mg/dL' },
      indirect_bilirubin: { min: 0.2, max: 0.9, unit: 'mg/dL' }
    },
    rft: {
      urea: { min: 15, max: 40, unit: 'mg/dL' },
      bun: { min: 7, max: 20, unit: 'mg/dL' },
      creatinine: { min: 0.6, max: 1.2, unit: 'mg/dL' },
      uric_acid: { min: 3.5, max: 7.2, unit: 'mg/dL' }
    },
    iron_profile: {
      serum_iron: { min: 60, max: 170, unit: 'µg/dL' },
      tibc: { min: 240, max: 450, unit: 'µg/dL' },
      uibc: { min: 150, max: 375, unit: 'µg/dL' },
      saturation: { min: 20, max: 50, unit: '%' },
      ferritin_male: { min: 30, max: 400, unit: 'ng/mL' },
      ferritin_female: { min: 13, max: 150, unit: 'ng/mL' },
      ferritin_generic: { min: 15, max: 300, unit: 'ng/mL' }
    },
    diabetes: {
      hba1c: { min: 4.0, max: 5.6, unit: '%' },
      fasting_glucose: { min: 70, max: 99, unit: 'mg/dL' },
      ppbs: { min: 0, max: 140, unit: 'mg/dL' },
      rbs: { min: 70, max: 140, unit: 'mg/dL' }
    },
    urine: {
      microalbumin: { min: 0, max: 30, unit: 'mg/g' },
      microalbumin_litre: { min: 0, max: 20, unit: 'mg/L' }
    },
    thyroid: {
      tsh: { min: 0.4, max: 4.0, unit: 'µIU/mL' },
      ft4: { min: 0.8, max: 1.8, unit: 'ng/dL' },
      ft3: { min: 2.3, max: 4.2, unit: 'pg/mL' }
    },
    pro_bnp: { min: 0, max: 125, unit: 'pg/mL' },
    vitamin_d: { min: 30, max: 100, unit: 'ng/mL' },
    vitamin_b12: { min: 200, max: 900, unit: 'pg/mL' }
  };

  const stopSignal = () => TOOL.stopRequested;

  function normText(v) {
    return String(v ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[()\[\]{}:,]/g, ' ')
      .replace(/\u00b5/g, 'u')
      .replace(/\+/g, ' plus ')
      .trim();
  }

  function compact(v) {
    return normText(v).replace(/[^a-z0-9.%/ -]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseNumber(text) {
    if (text == null) return null;
    const t = String(text).replace(/,/g, '').trim();
    const m = t.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function isNegativeLike(rawText, num) {
    const t = normText(rawText);
    if (num != null && num < 0) return true;
    return /\b(negative|neg|nil|not detected|undetected|trace)\b/.test(t) || t === '-' || t === '--' || t === 'nd';
  }

  function isPlaceholder999(rawText, num) {
    const t = compact(rawText);
    if (num != null && num >= 999) return true;
    return /(^|\s)999(\s|$)/.test(t) || /\b9{3,}\b/.test(t);
  }

  function has24HourUrine(text) {
    const t = normText(text);
    return /24\s*(hour|hr|h)\s*urine|24h urine|24 hrs? urine|24 hour urine/.test(t);
  }

  function setRowHighlight(el, color, thick = false) {
    if (!el) return;
    el.style.backgroundColor = color;
    el.style.outline = thick ? `2px solid ${COLORS.outline}` : 'none';
    el.style.outlineOffset = '0';
  }

  function clearRowHighlight(el) {
    if (!el) return;
    el.style.backgroundColor = '';
    el.style.outline = '';
    el.style.outlineOffset = '';
  }

  function clickCheckbox(cb, checked) {
    if (!cb) return;
    cb.checked = checked;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function rowCheckbox(row) {
    if (!row) return null;
    const cbs = [...row.querySelectorAll('input[type="checkbox"]')];
    if (!cbs.length) return null;
    return cbs[0];
  }

  function getCrNumber(row) {
    const text = row?.innerText || '';
    const m = text.match(/\b\d{15}\b/);
    return m ? m[0] : '';
  }

  function getPatientGender(row) {
    const text = row?.innerText || '';
    const m = text.match(/\b\d+\s*(?:yr|y|years?)\s*\|\s*([mf])\b/i);
    return m ? m[1].toUpperCase() : '';
  }

  function normalizeTestName(name) {
    const t = normText(name);
    const map = [
      [/\bhba1c\b|glycated hemoglobin|hemoglobin a1c/, 'hba1c'],
      [/\b(\bfasting\b.*\bsugar\b|\bfbs\b|\bfasting glucose\b|\bfasting blood sugar\b)/, 'fasting_glucose'],
      [/\b(ppbs|post prandial|post-prandial|after meal sugar)/, 'ppbs'],
      [/\b(rbs|random sugar|random blood sugar)/, 'rbs'],
      [/\b(sodium|na\b)/, 'sodium'],
      [/\b(potassium|k\b)/, 'potassium'],
      [/\b(chloride|cl\b)/, 'chloride'],
      [/\b(bicarbonate|hco3|tco2|co2 total)/, 'bicarbonate'],
      [/\b(calcium|ca\b)/, 'calcium'],
      [/\b(phosphate|phosphorus|po4|p\b)/, 'phosphate'],
      [/\b(magnesium|mg\b)/, 'magnesium'],
      [/\b(total cholesterol|cholesterol total|tc\b)/, 'total_cholesterol'],
      [/\b(triglyceride|tg\b)/, 'triglycerides'],
      [/\b(hdl\b|high density lipoprotein)/, 'hdl'],
      [/\b(ldl\b|low density lipoprotein)/, 'ldl'],
      [/\b(vldl\b)/, 'vldl'],
      [/\b(ast|sgot)\b/, 'ast'],
      [/\b(alt|sgpt)\b/, 'alt'],
      [/\b(alp|alkaline phosphatase)\b/, 'alp'],
      [/\b(ggt|gamma gt|ggtp)\b/, 'ggt'],
      [/\b(total protein)\b/, 'total_protein'],
      [/\b(albumin)\b/, 'albumin'],
      [/\b(globulin)\b/, 'globulin'],
      [/\b(a\/?g ratio|ag ratio)\b/, 'ag_ratio'],
      [/\b(total bilirubin|tbil)\b/, 'total_bilirubin'],
      [/\b(direct bilirubin|dbil|d bilirubin|conjugated bilirubin)\b/, 'direct_bilirubin'],
      [/\b(indirect bilirubin|ibil|i bilirubin|unconjugated bilirubin)\b/, 'indirect_bilirubin'],
      [/\b(urea)\b/, 'urea'],
      [/\b(bun)\b/, 'bun'],
      [/\b(creatinine)\b/, 'creatinine'],
      [/\b(uric acid)\b/, 'uric_acid'],
      [/\b(serum iron|iron)\b/, 'serum_iron'],
      [/\b(tibc)\b/, 'tibc'],
      [/\b(uibc)\b/, 'uibc'],
      [/\b(transferrin saturation|iron saturation|sat\b)\b/, 'saturation'],
      [/\b(ferritin)\b/, 'ferritin'],
      [/\b(tsh)\b/, 'tsh'],
      [/\b(ft4|free t4|free thyroxine)\b/, 'ft4'],
      [/\b(ft3|free t3|free triiodothyronine)\b/, 'ft3'],
      [/\b(pro bnp|pro-bnp|nt pro bnp|nt-pro bnp|bnp)\b/, 'pro_bnp'],
      [/\b(vitamin d|25 oh vitamin d|25-hydroxy vitamin d)\b/, 'vitamin_d'],
      [/\b(vitamin b12|b12|cobalamin)\b/, 'vitamin_b12'],
      [/\b(microalbumin|urine albumin|urine microalbumin|acr)\b/, 'microalbumin'],
      [/\b(24 hour urine|24 hr urine|24h urine)\b/, '24hoururine']
    ];

    for (const [re, key] of map) {
      if (re.test(t)) return key;
    }
    return '';
  }

  function findRangeFor(name, rawName, gender = '') {
    const g = gender || '';
    if (name === 'hdl') {
      return g === 'F' ? RANGE.lipid.hdl_female : RANGE.lipid.hdl_male;
    }
    if (name === 'ferritin') {
      return g === 'F' ? RANGE.iron_profile.ferritin_female : RANGE.iron_profile.ferritin_male;
    }
    if (name === 'microalbumin') {
      return RANGE.urine.microalbumin;
    }

    const matchers = {
      sodium: RANGE.electrolytes.sodium,
      potassium: RANGE.electrolytes.potassium,
      chloride: RANGE.electrolytes.chloride,
      bicarbonate: RANGE.electrolytes.bicarbonate,
      calcium: RANGE.calcium.total,
      phosphate: RANGE.phosphate,
      magnesium: RANGE.magnesium,
      total_cholesterol: RANGE.lipid.total_cholesterol,
      triglycerides: RANGE.lipid.triglycerides,
      ldl: RANGE.lipid.ldl,
      vldl: RANGE.lipid.vldl,
      ast: RANGE.lft.ast,
      alt: RANGE.lft.alt,
      alp: RANGE.lft.alp,
      ggt: RANGE.lft.ggt,
      total_protein: RANGE.lft.total_protein,
      albumin: RANGE.lft.albumin,
      globulin: RANGE.lft.globulin,
      ag_ratio: RANGE.lft.ag_ratio,
      total_bilirubin: RANGE.lft.total_bilirubin,
      direct_bilirubin: RANGE.lft.direct_bilirubin,
      indirect_bilirubin: RANGE.lft.indirect_bilirubin,
      urea: RANGE.rft.urea,
      bun: RANGE.rft.bun,
      creatinine: RANGE.rft.creatinine,
      uric_acid: RANGE.rft.uric_acid,
      serum_iron: RANGE.iron_profile.serum_iron,
      tibc: RANGE.iron_profile.tibc,
      uibc: RANGE.iron_profile.uibc,
      saturation: RANGE.iron_profile.saturation,
      hba1c: RANGE.diabetes.hba1c,
      fasting_glucose: RANGE.diabetes.fasting_glucose,
      ppbs: RANGE.diabetes.ppbs,
      rbs: RANGE.diabetes.rbs,
      tsh: RANGE.thyroid.tsh,
      ft4: RANGE.thyroid.ft4,
      ft3: RANGE.thyroid.ft3,
      pro_bnp: RANGE.pro_bnp,
      vitamin_d: RANGE.vitamin_d,
      vitamin_b12: RANGE.vitamin_b12
    };

    return matchers[name] || null;
  }

  function classifyValue(value, range) {
    const num = parseNumber(value);
    if (num == null || !range) {
      return { status: 'unknown', reason: '' };
    }

    if (num < 0) {
      return { status: 'negative', reason: 'negative' };
    }

    const min = range.min;
    const max = range.max;
    const within = num >= min && num <= max;
    if (within) return { status: 'normal', reason: '' };

    const bound = num < min ? min : max;
    const diff = Math.abs(num - bound);
    const scale = Math.max(Math.abs(bound), Math.abs(max - min), 1);
    const relative = diff / scale;

    if (relative <= TOOL.slightTolerance) {
      return { status: 'slight', reason: 'slight abnormal' };
    }

    return { status: num > max ? 'high' : 'low', reason: num > max ? 'high' : 'low' };
  }

  function highlightByStatus(target, status) {
    if (!target) return;
    if (status === 'negative') setRowHighlight(target, COLORS.violet, true);
    else if (status === 'high' || status === 'low') setRowHighlight(target, COLORS.red, true);
    else if (status === 'slight') setRowHighlight(target, COLORS.green, false);
  }

  function getResultTableRows() {
    const all = [...document.querySelectorAll('tr')];
    return all.filter((tr) => {
      const txt = tr.innerText || '';
      if (!/\b\d{15}\b/.test(txt)) return false;
      if (!tr.querySelector('input[type="checkbox"]')) return false;
      return true;
    });
  }

  function getDetailRows(mainRow) {
    const rows = [];
    let cursor = mainRow.nextElementSibling;
    while (cursor) {
      const text = cursor.innerText || '';
      if (/\b\d{15}\b/.test(text) && cursor.querySelector('input[type="checkbox"]')) break;
      if (text.trim()) rows.push(cursor);
      cursor = cursor.nextElementSibling;
    }
    return rows;
  }

  function parseDetailParamRows(mainRow) {
    const detailRows = getDetailRows(mainRow);
    const items = [];

    for (const row of detailRows) {
      const cells = [...row.querySelectorAll('td, th')];
      if (cells.length < 2) continue;

      const nameCell = cells[0];
      const valueCell = cells[1];
      const refCell = cells[2] || null;

      const testName = (nameCell?.innerText || row.innerText || '').trim();
      const valueText = (valueCell?.innerText || '').trim();
      const refText = (refCell?.innerText || '').trim();

      if (!testName && !valueText) continue;
      items.push({ row, testName, valueText, refText });
    }

    return items;
  }

  function shouldDeselectForItem(item, gender = '') {
    const tname = normalizeTestName(item.testName);
    const rawFull = `${item.testName} ${item.valueText} ${item.refText}`;
    const num = parseNumber(item.valueText);

    if (/24hoururine/.test(tname) || has24HourUrine(rawFull)) {
      return { deselect: true, status: 'low', reason: '24 hour urine' };
    }

    if (isNegativeLike(item.valueText, num) || isNegativeLike(rawFull, num)) {
      return { deselect: true, status: 'negative', reason: 'negative value' };
    }

    if (isPlaceholder999(item.valueText, num) || isPlaceholder999(rawFull, num)) {
      return { deselect: true, status: 'high', reason: 'placeholder 999' };
    }

    const range = findRangeFor(tname, item.testName, gender);
    if (!range) {
      return { deselect: false, status: 'unknown', reason: '' };
    }

    const result = classifyValue(item.valueText, range);
    if (result.status === 'normal') return { deselect: false, ...result };

    if (result.status === 'unknown') return { deselect: false, ...result };

    return { deselect: true, ...result };
  }

  function applyBilirubinLogic(items) {
    const vals = { total: null, direct: null, indirect: null };
    const refs = { total: null, direct: null, indirect: null };

    for (const item of items) {
      const key = normalizeTestName(item.testName);
      if (key === 'total_bilirubin') {
        vals.total = parseNumber(item.valueText);
        refs.total = item;
      }
      if (key === 'direct_bilirubin') {
        vals.direct = parseNumber(item.valueText);
        refs.direct = item;
      }
      if (key === 'indirect_bilirubin') {
        vals.indirect = parseNumber(item.valueText);
        refs.indirect = item;
      }
    }

    const problems = [];
    const total = vals.total;
    const direct = vals.direct;
    const indirect = vals.indirect;

    if ([total, direct, indirect].some((v) => v == null)) return problems;

    const relationIssue = (direct > total) || (indirect > total) || ((direct + indirect) > (total * 1.2));
    if (relationIssue) {
      for (const key of ['total', 'direct', 'indirect']) {
        if (refs[key]) {
          problems.push({ item: refs[key], status: 'high', reason: 'bilirubin mismatch' });
        }
      }
    }

    return problems;
  }

  function setStatusBadge(text) {
    const badge = document.getElementById('__auto_validation_status__');
    if (badge) badge.textContent = text;
  }

  function updateCounters() {
    const c1 = document.getElementById('__av_count_processed__');
    const c2 = document.getElementById('__av_count_deselected__');
    const c3 = document.getElementById('__av_count_abnormal__');
    if (c1) c1.textContent = String(TOOL.processedRows);
    if (c2) c2.textContent = String(TOOL.deselectedRows);
    if (c3) c3.textContent = String(TOOL.abnormalItems);
  }

  function inspectMainRow(mainRow) {
    const gender = getPatientGender(mainRow);
    const items = parseDetailParamRows(mainRow);
    const bilirubinIssues = applyBilirubinLogic(items);

    const allIssues = [];
    for (const item of items) {
      const verdict = shouldDeselectForItem(item, gender);
      if (verdict.status === 'normal' || verdict.status === 'unknown') continue;
      if (verdict.deselect) {
        allIssues.push({ item, ...verdict });
      }
    }
    for (const issue of bilirubinIssues) allIssues.push(issue);

    const rowCb = rowCheckbox(mainRow);
    const anyAbnormal = allIssues.length > 0;

    if (anyAbnormal && rowCb) clickCheckbox(rowCb, false);
    if (anyAbnormal) TOOL.deselectedRows += 1;

    const mainHighlightTarget = mainRow;
    if (anyAbnormal) {
      let hasNegative = false;
      let hasHigh = false;
      let hasSlight = false;
      for (const issue of allIssues) {
        if (issue.status === 'negative') hasNegative = true;
        if (issue.status === 'high' || issue.status === 'low') hasHigh = true;
        if (issue.status === 'slight') hasSlight = true;
      }
      if (hasNegative) setRowHighlight(mainHighlightTarget, COLORS.violet, true);
      else if (hasHigh) setRowHighlight(mainHighlightTarget, COLORS.red, true);
      else if (hasSlight) setRowHighlight(mainHighlightTarget, COLORS.green, false);
      else setRowHighlight(mainHighlightTarget, COLORS.yellow, false);
    }

    for (const issue of allIssues) {
      const { item, status } = issue;
      const target = item.row || mainRow;
      highlightByStatus(target, status);
      TOOL.abnormalItems += 1;
    }

    if (anyAbnormal) {
      const cr = getCrNumber(mainRow);
      TOOL.log.push({ cr, items: allIssues.map((i) => i.item?.testName || 'Bilirubin logic') });
    }

    TOOL.processedRows += 1;
    updateCounters();

    return { anyAbnormal, issues: allIssues };
  }

  async function scanCurrentPage(limit = TOOL.maxRowsToScan) {
    TOOL.running = true;
    TOOL.stopRequested = false;
    setStatusBadge('Scanning current page...');

    const rows = getResultTableRows();
    let scanned = 0;
    for (const row of rows) {
      if (stopSignal()) break;
      if (scanned >= limit) break;
      inspectMainRow(row);
      scanned += 1;
      await new Promise((r) => setTimeout(r, 30));
    }

    setStatusBadge(stopSignal() ? 'Stopped' : `Scanned ${scanned} row(s)`);
    TOOL.running = false;
  }

  function getNextPageButton() {
    const buttons = [...document.querySelectorAll('button, a, li')];
    return buttons.find((el) => {
      const t = (el.innerText || '').trim().toLowerCase();
      return /^(next|>|»)$/.test(t) || t === 'next';
    }) || null;
  }

  async function scanAcrossPages(maxRows = 100) {
    TOOL.running = true;
    TOOL.stopRequested = false;
    TOOL.maxRowsToScan = maxRows;
    TOOL.processedRows = 0;
    TOOL.deselectedRows = 0;
    TOOL.abnormalItems = 0;
    TOOL.log = [];
    updateCounters();
    setStatusBadge('Scanning 100 rows...');

    while (!stopSignal() && TOOL.processedRows < maxRows) {
      const rows = getResultTableRows();
      if (!rows.length) break;

      for (const row of rows) {
        if (stopSignal() || TOOL.processedRows >= maxRows) break;
        inspectMainRow(row);
        await new Promise((r) => setTimeout(r, 25));
      }

      if (stopSignal() || TOOL.processedRows >= maxRows) break;

      const next = getNextPageButton();
      if (!next) break;
      next.click();
      await new Promise((r) => setTimeout(r, TOOL.pageDelayMs));
    }

    TOOL.running = false;
    setStatusBadge(stopSignal() ? 'Stopped' : 'Finished scanning');
  }

  function stopScan() {
    TOOL.stopRequested = true;
    setStatusBadge('Stop requested...');
  }

  function resetHighlights() {
    [...document.querySelectorAll('tr')].forEach((tr) => clearRowHighlight(tr));
  }

  function exportLog() {
    const lines = TOOL.log.map((x) => `CR ${x.cr || 'N/A'} :: ${Array.isArray(x.items) ? x.items.join(', ') : ''}`);
    const txt = lines.join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auto_validation_log.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = '__auto_validation_panel__';
    panel.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:999999',
      'width:340px',
      'background:#ffffff',
      'border:1px solid #cbd5e1',
      'border-radius:14px',
      'box-shadow:0 10px 30px rgba(15,23,42,.18)',
      'font-family:Arial,Helvetica,sans-serif',
      'overflow:hidden'
    ].join(';');

    panel.innerHTML = `
      <div style="padding:10px 12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="font-weight:700;font-size:14px;">Auto Validation Tool</div>
        <button id="__av_min__" style="border:0;background:#334155;color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer;">Min</button>
      </div>
      <div id="__av_body__" style="padding:12px;display:block;">
        <div id="__auto_validation_status__" style="font-size:12px;color:#334155;margin-bottom:10px;">Ready</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <button id="__av_scan100__" style="padding:8px;border:0;border-radius:10px;background:#2563eb;color:#fff;cursor:pointer;">Scan 100</button>
          <button id="__av_scanpage__" style="padding:8px;border:0;border-radius:10px;background:#0f766e;color:#fff;cursor:pointer;">Scan Page</button>
          <button id="__av_stop__" style="padding:8px;border:0;border-radius:10px;background:#dc2626;color:#fff;cursor:pointer;">Stop</button>
          <button id="__av_reset__" style="padding:8px;border:0;border-radius:10px;background:#6b7280;color:#fff;cursor:pointer;">Reset</button>
          <button id="__av_log__" style="padding:8px;border:0;border-radius:10px;background:#7c3aed;color:#fff;cursor:pointer;grid-column:1 / span 2;">Download Log</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;">
            <div style="color:#64748b;">Processed</div>
            <div id="__av_count_processed__" style="font-size:18px;font-weight:700;">0</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;">
            <div style="color:#64748b;">Deselected</div>
            <div id="__av_count_deselected__" style="font-size:18px;font-weight:700;">0</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;">
            <div style="color:#64748b;">Abnormal</div>
            <div id="__av_count_abnormal__" style="font-size:18px;font-weight:700;">0</div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:11px;line-height:1.4;color:#475569;">
          Violet = negative. Red = high or low. Green = slight abnormal. It will uncheck the row checkbox near the CR number.
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#__av_min__').onclick = () => {
      const body = panel.querySelector('#__av_body__');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
      panel.querySelector('#__av_min__').textContent = body.style.display === 'none' ? 'Max' : 'Min';
    };
    panel.querySelector('#__av_scan100__').onclick = () => scanAcrossPages(100);
    panel.querySelector('#__av_scanpage__').onclick = () => scanCurrentPage(100);
    panel.querySelector('#__av_stop__').onclick = () => stopScan();
    panel.querySelector('#__av_reset__').onclick = () => resetHighlights();
    panel.querySelector('#__av_log__').onclick = () => exportLog();

    return panel;
  }

  function destroyPanel() {
    const panel = document.getElementById('__auto_validation_panel__');
    if (panel) panel.remove();
  }

  function init() {
    createPanel();
    window.__AUTO_VALIDATION_TOOL__ = {
      scanCurrentPage,
      scanAcrossPages,
      stopScan,
      resetHighlights,
      destroy() {
        stopScan();
        destroyPanel();
        delete window.__AUTO_VALIDATION_TOOL__;
      }
    };
    console.log('Auto Validation Tool loaded. Use the panel at the bottom-right.');
  }

  init();
})();
