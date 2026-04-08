(function () {
  'use strict';

  const STATE = {
    running: false,
    stopRequested: false,
    processed: 0,
    deselected: 0,
    abnormal: 0,
    log: []
  };

  const CFG = {
    maxRows: 100,
    pageDelayMs: 450,
    slightTolerance: 0.1
  };

  const COLORS = {
    violet: '#ead7ff',
    red: '#ffd9d9',
    green: '#ddf7dd'
  };

  const RANGES = {
    sodium: { min: 120, max: 150 },
    potassium: { min: 2.5, max: 5.5 },
    chloride: { min: 75, max: 118 },
    bicarbonate: { min: 22, max: 29 },
    calcium: { min: 7, max: 11.2 },
    ionized_calcium: { min: 1.12, max: 1.32 },
    phosphate: { min: 2.5, max: 4.5 },
    magnesium: { min: 1.7, max: 2.2 },
    total_cholesterol: { min: 100, max: 400 },
    triglycerides: { min: 100, max: 150 },
    hdl_male: { min: 40, max: 60 },
    hdl_female: { min: 50, max: 60 },
    ldl: { min: 0, max: 100 },
    vldl: { min: 5, max: 40 },
    ast: { min: 10, max: 40 },
    alt: { min: 7, max: 56 },
    alp: { min: 44, max: 147 },
    ggt: { min: 9, max: 48 },
    total_protein: { min: 6.0, max: 8.3 },
    albumin: { min: 3.5, max: 5.0 },
    globulin: { min: 2.0, max: 3.5 },
    ag_ratio: { min: 1.0, max: 2.2 },
    total_bilirubin: { min: 0.2, max: 1.2 },
    direct_bilirubin: { min: 0.2, max: 0.3 },
    indirect_bilirubin: { min: 0.2, max: 0.9 },
    urea: { min: 17, max: 43 },
    bun: { min: 7, max: 20 },
    creatinine: { min: 0.6, max: 1.2 },
    uric_acid: { min: 3.5, max: 7.2 },
    serum_iron: { min: 60, max: 170 },
    tibc: { min: 240, max: 450 },
    uibc: { min: 150, max: 375 },
    saturation: { min: 20, max: 50 },
    ferritin_male: { min: 30, max: 400 },
    ferritin_female: { min: 13, max: 150 },
    hba1c: { min: 4.0, max: 5.6 },
    fasting_glucose: { min: 60, max: 140 },
    ppbs: { min: 60, max: 140 },
    rbs: { min: 60, max: 140 },
    microalbumin: { min: 0, max: 30 },
    tsh: { min: 0.4, max: 4.0 },
    ft4: { min: 0.8, max: 1.8 },
    ft3: { min: 2.3, max: 4.2 },
    pro_bnp: { min: 0, max: 125 },
    vitamin_d: { min: 30, max: 100 },
    vitamin_b12: { min: 200, max: 900 }
  };

  function norm(s) {
    return String(s ?? '')
      .toLowerCase()
      .replace(/\u00b5/g, 'u')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function text(el) {
    return norm(el?.innerText || el?.textContent || '');
  }

  function num(v) {
    const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  function isNegativeLike(v) {
    const t = text({ innerText: v });
    return /\b(negative|neg|nil|not detected|undetected)\b/.test(t) || t === '-' || t === '--';
  }

  function isPlaceholder999(v) {
    const t = String(v ?? '').replace(/\s+/g, '');
    const n = num(v);
    return (n != null && n >= 999) || /^9{3,}$/.test(t);
  }

  function is24HourUrine(v) {
    return /24\s*(hour|hr|h)\s*urine|24h urine|24 hour urine/.test(norm(v));
  }

  function genderFromBlock(block) {
    const t = text(block);
    const m = t.match(/\b\d+\s*(?:yr|y|years?)\s*\|\s*([mf])\b/i);
    return m ? m[1].toUpperCase() : '';
  }

  function crFromBlock(block) {
    const t = text(block);
    const m = t.match(/\b\d{15}\b/);
    return m ? m[0] : '';
  }

  function findByCheckboxNearCr(block) {
    const candidates = [...block.querySelectorAll('input[type="checkbox"]')];
    if (!candidates.length) return null;

    const withPos = candidates.map(cb => {
      const r = cb.getBoundingClientRect();
      return { cb, x: r.left, y: r.top };
    }).sort((a, b) => a.y - b.y || a.x - b.x);

    return withPos[0]?.cb || candidates[0] || null;
  }

  function clearMarks() {
    // Intentionally no page-wide color reset, to avoid touching the site styling.
  }

  function mark(el, color) {
    // Intentionally disabled. The tool should only deselect abnormal rows.
    return;
  }

  function clickCheckbox(cb, checked) {
    if (!cb) return;
    cb.checked = checked;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function normalizeTestName(name) {
    const t = norm(name);
    const rules = [
      [/\bhba1c\b|glycated hemoglobin|hemoglobin a1c/, 'hba1c'],
      [/\bfasting\b.*\bsugar\b|\bfbs\b|fasting glucose|fasting blood sugar/, 'fasting_glucose'],
      [/\bppbs\b|post prandial|post-prandial|after meal sugar/, 'ppbs'],
      [/\brbs\b|random sugar|random blood sugar/, 'rbs'],
      [/\bsodium\b|\bna\b/, 'sodium'],
      [/\bpotassium\b|\bk\b/, 'potassium'],
      [/\bchloride\b|\bcl\b/, 'chloride'],
      [/\bbicarbonate\b|\bhco3\b|tco2|total co2/, 'bicarbonate'],
      [/\bionized calcium\b/, 'ionized_calcium'],
      [/\bcalcium\b/, 'calcium'],
      [/\bphosphate\b|\bphosphorus\b|po4/, 'phosphate'],
      [/\bmagnesium\b/, 'magnesium'],
      [/\btotal cholesterol\b|cholesterol total|\btc\b/, 'total_cholesterol'],
      [/\btriglyceride\b|\btg\b/, 'triglycerides'],
      [/\bhdl\b/, 'hdl'],
      [/\bldl\b/, 'ldl'],
      [/\bvldl\b/, 'vldl'],
      [/\bast\b|sgot/, 'ast'],
      [/\balt\b|sgpt/, 'alt'],
      [/\balp\b|alkaline phosphatase/, 'alp'],
      [/\bggt\b|gamma gt/, 'ggt'],
      [/\btotal protein\b/, 'total_protein'],
      [/\balbumin\b/, 'albumin'],
      [/\bglobulin\b/, 'globulin'],
      [/\ba\/?g ratio\b|ag ratio/, 'ag_ratio'],
      [/\btotal bilirubin\b|\btbil\b/, 'total_bilirubin'],
      [/\bdirect bilirubin\b|\bdbil\b/, 'direct_bilirubin'],
      [/\bindirect bilirubin\b|\bibil\b/, 'indirect_bilirubin'],
      [/\burea\b/, 'urea'],
      [/\bbun\b/, 'bun'],
      [/\bcreatinine\b/, 'creatinine'],
      [/\buric acid\b/, 'uric_acid'],
      [/\bserum iron\b|\biron\b/, 'serum_iron'],
      [/\btibc\b/, 'tibc'],
      [/\buibc\b/, 'uibc'],
      [/\bsaturation\b/, 'saturation'],
      [/\bferritin\b/, 'ferritin'],
      [/\btsh\b/, 'tsh'],
      [/\bft4\b|free t4|free thyroxine/, 'ft4'],
      [/\bft3\b|free t3|free triiodothyronine/, 'ft3'],
      [/\bpro bnp\b|nt pro bnp|nt-pro bnp|bnp\b/, 'pro_bnp'],
      [/\bvitamin d\b|25 oh vitamin d|25-hydroxy vitamin d/, 'vitamin_d'],
      [/\bvitamin b12\b|\bb12\b|cobalamin/, 'vitamin_b12'],
      [/microalbumin|acr|urine albumin/, 'microalbumin'],
      [new RegExp('24\s*(hr|hrs|hour|hours)\s*urine|24\s*(hr|hrs|hour|hours)\s*urinary\s*protein|24\s*h\s*urine', 'i'), 'urine_24h_protein']
    ];
    for (const [re, key] of rules) if (re.test(t)) return key;
    return '';
  }

  function rangeFor(key, gender) {
    if (key === 'hdl') return gender === 'F' ? RANGES.hdl_female : RANGES.hdl_male;
    if (key === 'ferritin') return gender === 'F' ? RANGES.ferritin_female : RANGES.ferritin_male;
    return RANGES[key] || null;
  }

  function verdict(valueText, key, gender) {
    const t = norm(valueText);
    const n = num(t);

    if (key === 'urine_24h_protein' || is24HourUrine(t)) {
      return { abnormal: true, status: 'high', reason: '24 hour urine' };
    }

    if (key === 'microalbumin') {
      if (isNegativeLike(t) || isPlaceholder999(t)) {
        return { abnormal: true, status: 'high', reason: 'microalbumin invalid' };
      }
      return { abnormal: false, status: 'normal', reason: '' };
    }

    if (['sodium', 'potassium', 'creatinine', 'urea', 'calcium', 'magnesium', 'phosphate'].includes(key)) {
      const range = rangeFor(key, gender);
      if (!range || n == null) return { abnormal: false, status: 'unknown', reason: '' };
      if (n >= range.min && n <= range.max) return { abnormal: false, status: 'normal', reason: '' };
      return { abnormal: true, status: n > range.max ? 'high' : 'low', reason: 'range' };
    }

    if (isNegativeLike(t)) return { abnormal: true, status: 'negative', reason: 'negative' };
    if (isPlaceholder999(t)) return { abnormal: true, status: 'high', reason: '999' };

    const range = rangeFor(key, gender);
    if (!range || n == null) return { abnormal: false, status: 'unknown', reason: '' };

    if (n >= range.min && n <= range.max) return { abnormal: false, status: 'normal', reason: '' };

    const edge = n < range.min ? range.min : range.max;
    const diff = Math.abs(n - edge);
    const span = Math.max(Math.abs(range.max - range.min), 1);
    const status = (diff / span <= CFG.slightTolerance) ? 'slight' : (n > range.max ? 'high' : 'low');
    return { abnormal: true, status, reason: status };
  }

  function getAllRows() {
    return [...document.querySelectorAll('tr')].filter(tr => tr.offsetParent !== null);
  }

  function isMainRow(tr) {
    const t = text(tr);
    return /\b\d{15}\b/.test(t) && tr.querySelector('input[type="checkbox"]');
  }

  function extractParamRowsFromBlock(mainRow, rows) {
    const start = rows.indexOf(mainRow);
    if (start < 0) return [];

    const out = [];
    for (let i = start + 1; i < rows.length; i++) {
      const row = rows[i];
      const t = text(row);
      if (isMainRow(row)) break;
      if (/result entry date|sample\/accession no|validation status|to be validated/i.test(t)) continue;
      if (/test param name/i.test(t) && /reference range/i.test(t)) continue;
      if (row.querySelector('input[type="checkbox"]') && row.querySelectorAll('td,th').length >= 2) out.push(row);
    }
    return out;
  }

  function getCells(row) {
    return [...row.querySelectorAll('td, th')];
  }

  function rowNameValue(row) {
    const cells = getCells(row);
    const name = (cells[0]?.innerText || '').trim();
    const value = (cells[1]?.innerText || '').trim();
    const ref = (cells[2]?.innerText || '').trim();
    return { name, value, ref };
  }

  function applyBilirubinRule(paramRows) {
    let tbil = null, dbil = null, ibil = null;
    const refs = { tbil: null, dbil: null, ibil: null };

    for (const row of paramRows) {
      const { name, value } = rowNameValue(row);
      const key = normalizeTestName(name);
      if (key === 'total_bilirubin') { tbil = num(value); refs.tbil = row; }
      if (key === 'direct_bilirubin') { dbil = num(value); refs.dbil = row; }
      if (key === 'indirect_bilirubin') { ibil = num(value); refs.ibil = row; }
    }

    if (tbil == null || dbil == null || ibil == null) return [];

    if (tbil < dbil || tbil < ibil || (dbil + ibil) > tbil) {
      return [refs.tbil, refs.dbil, refs.ibil].filter(Boolean);
    }

    return [];
  }

  function deselectCheckboxInRow(row) {
    const cb = row?.querySelector('input[type="checkbox"]');
    if (cb) clickCheckbox(cb, false);
  }

  function inspectMainBlock(mainRow, rows) {
    const gender = genderFromBlock(mainRow);
    const mainCb = findByCheckboxNearCr(mainRow);
    const paramRows = extractParamRowsFromBlock(mainRow, rows);

    const abnormalRows = new Set();

    for (const row of paramRows) {
      const { name, value, ref } = rowNameValue(row);
      const key = normalizeTestName(name);
      if (!key) continue;

      const combined = `${name} ${value} ${ref}`;
      const v = verdict(combined, key, gender);
      if (v.abnormal) abnormalRows.add(row);
    }

    // Bilirubin cross-check
    for (const row of applyBilirubinRule(paramRows)) abnormalRows.add(row);

    if (abnormalRows.size) {
      if (mainCb) clickCheckbox(mainCb, false);

      for (const row of abnormalRows) {
        deselectCheckboxInRow(row);
      }

      STATE.deselected += abnormalRows.size + 1;
      STATE.abnormal += abnormalRows.size;
      STATE.log.push({ cr: crFromBlock(mainRow), rows: [...abnormalRows].map(r => text(r)) });
    }

    STATE.processed += 1;
    updateCounters();
  }

  function updateCounters() {
    const p = document.getElementById('__av_processed__');
    const d = document.getElementById('__av_deselected__');
    const a = document.getElementById('__av_abnormal__');
    if (p) p.textContent = String(STATE.processed);
    if (d) d.textContent = String(STATE.deselected);
    if (a) a.textContent = String(STATE.abnormal);
  }

  function setStatus(msg) {
    const el = document.getElementById('__av_status__');
    if (el) el.textContent = msg;
  }

  function getNextPageButton() {
    const btns = [...document.querySelectorAll('button, a, li, span')];
    return btns.find(b => /^(next|>)$/i.test((b.innerText || '').trim()) || /\bnext\b/i.test(b.innerText || '')) || null;
  }

  async function scanCurrentPage(limit = CFG.maxRows) {
    STATE.running = true;
    STATE.stopRequested = false;
    setStatus('Scanning current page...');

    const rows = getAllRows();
    const mainRows = rows.filter(isMainRow).slice(0, limit);

    for (const mainRow of mainRows) {
      if (STATE.stopRequested) break;
      inspectMainBlock(mainRow, rows);
      await new Promise(r => setTimeout(r, 25));
    }

    STATE.running = false;
    setStatus(STATE.stopRequested ? 'Stopped' : `Scanned ${mainRows.length} block(s)`);
  }

  async function scan100Rows() {
    STATE.running = true;
    STATE.stopRequested = false;
    STATE.processed = 0;
    STATE.deselected = 0;
    STATE.abnormal = 0;
    STATE.log = [];
    updateCounters();
    setStatus('Scanning 100 rows...');

    while (!STATE.stopRequested && STATE.processed < CFG.maxRows) {
      const rows = getAllRows();
      const mainRows = rows.filter(isMainRow);
      if (!mainRows.length) break;

      for (const mainRow of mainRows) {
        if (STATE.stopRequested || STATE.processed >= CFG.maxRows) break;
        inspectMainBlock(mainRow, rows);
        await new Promise(r => setTimeout(r, 20));
      }

      if (STATE.stopRequested || STATE.processed >= CFG.maxRows) break;
      const next = getNextPageButton();
      if (!next) break;
      next.click();
      await new Promise(r => setTimeout(r, CFG.pageDelayMs));
    }

    STATE.running = false;
    setStatus(STATE.stopRequested ? 'Stopped' : 'Finished');
  }

  function stopScan() {
    STATE.stopRequested = true;
    setStatus('Stopping...');
  }

  function resetMarks() {
    clearMarks();
  }

  function downloadLog() {
    const out = STATE.log.map(x => `${x.cr || 'N/A'} | ${x.rows.join(' || ')}`).join('\n');
    const blob = new Blob([out], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auto_validation_log.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function panel() {
    if (document.getElementById('__av_panel__')) return;

    const root = document.createElement('div');
    root.id = '__av_panel__';
    root.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#0f172a;color:#fff;border-radius:18px;padding:8px 12px;font-family:Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,0.2);font-size:13px;';
    root.textContent = '⚡ AV';
    document.body.appendChild(root);

    root.onclick = () => {
      if (document.getElementById('__av_fullpanel__')) return;

      const panel = document.createElement('div');
      panel.id = '__av_fullpanel__';
      panel.style.cssText = 'position:fixed;right:14px;bottom:60px;width:280px;background:#fff;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.2);font-family:Arial;padding:12px;z-index:2147483647;color:#111;';

      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <b>Auto Validation</b>
          <button id="__av_close__" style="border:none;background:#e11d48;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;">X</button>
        </div>
        <div id="__av_status__" style="font-size:12px;color:#334155;margin-bottom:10px;">Ready</div>
        <button id="__av_scan100_btn__" style="width:100%;margin-bottom:6px;padding:8px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;">Scan 100</button>
        <button id="__av_scanpage_btn__" style="width:100%;margin-bottom:6px;padding:8px;border:none;border-radius:8px;background:#0f766e;color:#fff;cursor:pointer;">Scan Page</button>
        <button id="__av_stop_btn__" style="width:100%;margin-bottom:6px;padding:8px;border:none;border-radius:8px;background:#dc2626;color:#fff;cursor:pointer;">Stop</button>
        <button id="__av_reset_btn__" style="width:100%;margin-bottom:6px;padding:8px;border:none;border-radius:8px;background:#6b7280;color:#fff;cursor:pointer;">Reset</button>
        <button id="__av_log_btn__" style="width:100%;padding:8px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;">Download Log</button>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;font-size:12px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;"><div style="color:#64748b;">Processed</div><div id="__av_processed__" style="font-size:18px;font-weight:700;">0</div></div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;"><div style="color:#64748b;">Deselected</div><div id="__av_deselected__" style="font-size:18px;font-weight:700;">0</div></div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;"><div style="color:#64748b;">Abnormal</div><div id="__av_abnormal__" style="font-size:18px;font-weight:700;">0</div></div>
        </div>
      `;

      document.body.appendChild(panel);
      panel.querySelector('#__av_close__').onclick = () => panel.remove();
      panel.querySelector('#__av_scan100_btn__').onclick = scan100Rows;
      panel.querySelector('#__av_scanpage_btn__').onclick = () => scanCurrentPage(100);
      panel.querySelector('#__av_stop_btn__').onclick = stopScan;
      panel.querySelector('#__av_reset_btn__').onclick = resetMarks;
      panel.querySelector('#__av_log_btn__').onclick = downloadLog;
    };
  }

  function init() {
    panel();
    window.__AUTO_VALIDATION_TOOL__ = {
      scan100Rows,
      scanCurrentPage,
      stopScan,
      resetMarks,
      destroy() {
        STATE.stopRequested = true;
        document.getElementById('__av_panel__')?.remove();
        document.getElementById('__av_fullpanel__')?.remove();
        delete window.__AUTO_VALIDATION_TOOL__;
      }
    };
    console.log('Auto Validation Tool ready');
  }

  init();
})();
