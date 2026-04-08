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
    pageDelayMs: 500,
    slightTolerance: 0.1
  };

  const COLORS = {
    violet: '#ead7ff',
    red: '#ffd9d9',
    green: '#ddf7dd'
  };

  const RANGES = {
    sodium: { min: 135, max: 145 },
    potassium: { min: 3.5, max: 5.1 },
    chloride: { min: 98, max: 107 },
    bicarbonate: { min: 22, max: 29 },
    calcium: { min: 8.6, max: 10.2 },
    ionized_calcium: { min: 1.12, max: 1.32 },
    phosphate: { min: 2.5, max: 4.5 },
    magnesium: { min: 1.7, max: 2.2 },
    total_cholesterol: { min: 0, max: 200 },
    triglycerides: { min: 0, max: 150 },
    hdl_male: { min: 40, max: Infinity },
    hdl_female: { min: 50, max: Infinity },
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
    direct_bilirubin: { min: 0.0, max: 0.3 },
    indirect_bilirubin: { min: 0.2, max: 0.9 },
    urea: { min: 15, max: 40 },
    bun: { min: 7, max: 20 },
    creatinine: { min: 0.6, max: 1.2 },
    uric_acid: { min: 3.5, max: 7.2 },
    serum_iron: { min: 60, max: 170 },
    tibc: { min: 240, max: 450 },
    uibc: { min: 150, max: 375 },
    saturation: { min: 20, max: 50 },
    ferritin_male: { min: 30, max: 400 },
    ferritin_female: { min: 13, max: 150 },
    ferritin_generic: { min: 15, max: 300 },
    hba1c: { min: 4.0, max: 5.6 },
    fasting_glucose: { min: 70, max: 99 },
    ppbs: { min: 0, max: 140 },
    rbs: { min: 70, max: 140 },
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

  function is24HourUrineLine(t) {
    return /24\s*(hour|hr|h)\s*urine|24h urine|24 hour urine/.test(norm(t));
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
    const cr = crFromBlock(block);
    if (!cr) return null;

    const candidates = [...block.querySelectorAll('input[type="checkbox"]')];
    if (!candidates.length) return null;

    const withCr = candidates.map(cb => {
      const r = cb.getBoundingClientRect();
      const box = cb.closest('tr, td, div, li, section');
      return { cb, box, x: r.left, y: r.top };
    });

    withCr.sort((a, b) => a.y - b.y || a.x - b.x);
    return withCr[0]?.cb || candidates[0];
  }

  function setRowColor(el, color) {
    return;
  }

  function clearMarks(root = document) {
    return;
  }

  function mark(el, color) {
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
      [/\bmicroalbumin\b|acr|urine albumin/, 'microalbumin']
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

    // NEGATIVE
    if (isNegativeLike(t)) return { abnormal: true, status: 'negative', reason: 'negative' };

    // 999 / 99999
    if (isPlaceholder999(t)) return { abnormal: true, status: 'high', reason: '999' };

    // DOUBLE / TRIPLE DIGIT RULE (APPLY ONLY TO SPECIFIC TESTS)
    if (n !== null && Math.abs(n) >= 10 && !['sodium','potassium','creatinine','urea','calcium','magnesium','phosphate'].includes(key)) {
      return { abnormal: true, status: 'high', reason: 'double/triple digit' };
    };
    }

    // URINE MICROALBUMIN SPECIAL RULE
    if (key === 'microalbumin') {
      if (isNegativeLike(t) || isPlaceholder999(t)) {
        return { abnormal: true, status: 'high', reason: 'microalbumin invalid' };
      }
      return { abnormal: false, status: 'normal', reason: '' };
    }

    const range = rangeFor(key, gender);
    if (!range || n == null) return { abnormal: false, status: 'unknown', reason: '' };

    if (n >= range.min && n <= range.max) return { abnormal: false, status: 'normal', reason: '' };

    return { abnormal: true, status: n > range.max ? 'high' : 'low', reason: 'range' };
  }

  function findMainBlocks() {
    const all = [...document.querySelectorAll('tr, div, td, li, section')];
    return all.filter(el => {
      const t = text(el);
      return /\b\d{15}\b/.test(t) && el.querySelector('input[type="checkbox"]');
    });
  }

  function findParamRows(block) {
    const rows = [...block.querySelectorAll('tr')];
    if (rows.length) {
      return rows.filter(r => /test param name|reference range|hba1c|bilirubin|creatinine|sodium|potassium|calcium|magnesium|phosphate|microalbumin|vitamin|ferritin|ppbs|rbs|fbs/i.test(text(r)));
    }

    const blocks = [...block.querySelectorAll('div, td, li, section')];
    return blocks.filter(el => {
      const t = text(el);
      return /\b(negative|--|\d+(?:\.\d+)?)/.test(t) && !/\b\d{15}\b/.test(t);
    });
  }

  function highlightItem(itemEl, status) {
    return;
  }

  function applyBilirubinRule(rows, gender) {
    let tbil = null, dbil = null, ibil = null;
    let tRow = null, dRow = null, iRow = null;

    for (const row of rows) {
      const key = normalizeTestName(text(row));
      const cells = [...row.querySelectorAll('td, th')];
      const valueText = (cells[1]?.innerText || '').trim();
      const value = num(valueText);

      if (key === 'total_bilirubin') { tbil = value; tRow = row; }
      if (key === 'direct_bilirubin') { dbil = value; dRow = row; }
      if (key === 'indirect_bilirubin') { ibil = value; iRow = row; }
    }

    if (tbil == null || dbil == null || ibil == null) return [];

    // YOUR RULE: TBIL < DBIL or IBIL
    if (tbil < dbil || tbil < ibil) {
      return [tRow, dRow, iRow].filter(Boolean).map(r => ({ row: r, status: 'high', reason: 'bilirubin mismatch' }));
    }

    return [];
  }

  function inspectBlock(block) {
    const gender = genderFromBlock(block);
    const blockCheckbox = findByCheckboxNearCr(block);
    const rows = findParamRows(block);
    const issues = [];

    for (const row of rows) {
      const t = text(row);
      const key = normalizeTestName(t);
      if (!key) continue;

      const cells = [...row.querySelectorAll('td, th')];
      const valueText = (cells[1]?.innerText || '').trim() || t;
      const refText = (cells[2]?.innerText || '').trim();
      const combined = `${t} ${valueText} ${refText}`;

      const v = verdict(combined, key, gender);
      if (v.abnormal) {
        issues.push({ row, status: v.status, reason: v.reason, key, valueText });
      }
    }

    issues.push(...applyBilirubinRule(rows, gender));

    if (issues.length) {
      if (blockCheckbox) clickCheckbox(blockCheckbox, false);

      let hasNeg = false;
      let hasHigh = false;
      let hasSlight = false;

      for (const issue of issues) {
        if (issue.status === 'negative') hasNeg = true;
        if (issue.status === 'high' || issue.status === 'low') hasHigh = true;
        if (issue.status === 'slight') hasSlight = true;

        highlightItem(issue.row, issue.status);

        const rowCheckbox = issue.row?.querySelector('input[type="checkbox"]')
          || issue.row?.closest('tr, td, div, li, section')?.querySelector('input[type="checkbox"]');
        if (rowCheckbox) {
          clickCheckbox(rowCheckbox, false);
        }
      }

      const blockRow = block.closest('tr') || block;
      // no page-level highlighting

      STATE.deselected += issues.length;
      STATE.abnormal += issues.length;
      const cr = crFromBlock(block);
      STATE.log.push({ cr, issues: issues.map(i => `${i.key}:${i.reason}`) });
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

    const blocks = findMainBlocks().slice(0, limit);
    for (const block of blocks) {
      if (STATE.stopRequested) break;
      inspectBlock(block);
      await new Promise(r => setTimeout(r, 20));
    }

    STATE.running = false;
    setStatus(STATE.stopRequested ? 'Stopped' : `Scanned ${blocks.length} block(s)`);
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
      const blocks = findMainBlocks();
      if (!blocks.length) break;

      for (const block of blocks) {
        if (STATE.stopRequested || STATE.processed >= CFG.maxRows) break;
        inspectBlock(block);
        await new Promise(r => setTimeout(r, 25));
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
    clearMarks(document);
  }

  function downloadLog() {
    const out = STATE.log.map(x => `${x.cr || 'N/A'} | ${x.issues.join(', ')}`).join('\n');
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

    // MINI FLOATING BUTTON STYLE
    root.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#0f172a;color:#fff;border-radius:20px;padding:8px 14px;font-family:Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,0.2);font-size:13px;';

    root.innerHTML = `⚡ AV`;

    document.body.appendChild(root);

    // CLICK TO EXPAND PANEL
    root.onclick = () => {
      if (document.getElementById('__av_fullpanel__')) return;

      const panel = document.createElement('div');
      panel.id = '__av_fullpanel__';
      panel.style.cssText = 'position:fixed;right:14px;bottom:60px;width:300px;background:#fff;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.2);font-family:Arial;padding:12px;z-index:2147483647;';

      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <b>Auto Validation</b>
          <button id="__av_close__" style="border:none;background:#e11d48;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;">X</button>
        </div>
        <button id="__av_scan100_btn__" style="width:100%;margin-bottom:6px;padding:6px;border:none;border-radius:8px;background:#2563eb;color:#fff;">Scan 100</button>
        <button id="__av_stop_btn__" style="width:100%;padding:6px;border:none;border-radius:8px;background:#dc2626;color:#fff;">Stop</button>
      `;

      document.body.appendChild(panel);

      document.getElementById('__av_scan100_btn__').onclick = scan100Rows;
      document.getElementById('__av_stop_btn__').onclick = stopScan;
      document.getElementById('__av_close__').onclick = () => panel.remove();
    };
  }
    root.querySelector('#__av_toggle__').onclick = () => {
      const body = root.querySelector('#__av_body__');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
      root.querySelector('#__av_toggle__').textContent = body.style.display === 'none' ? 'Max' : 'Min';
    };
    root.querySelector('#__av_scan100_btn__').onclick = scan100Rows;
    root.querySelector('#__av_scanpage_btn__').onclick = () => scanCurrentPage(100);
    root.querySelector('#__av_stop_btn__').onclick = stopScan;
    root.querySelector('#__av_reset_btn__').onclick = resetMarks;
    root.querySelector('#__av_log_btn__').onclick = downloadLog;
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
        clearMarks(document);
        delete window.__AUTO_VALIDATION_TOOL__;
      }
    };
    console.log('Auto Validation Tool ready');
  }

  init();
})();
