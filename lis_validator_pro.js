function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== "Results") return;

  const row = e.range.getRow();
  if (row === 1) return;

  validateRow_(row);

  // 🔥 Scan last 100 rows for consistency
  scanRecentRows_(100);
}

// ================= MAIN =================
function validateRow_(row) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Results");
  const hist = ss.getSheetByName("History");

  const data = sheet.getRange(row, 1, 1, 12).getValues()[0];

  const analyte = (data[3] || "").toLowerCase();
  const value = Number(data[4]);
  const patientId = data[1];

  // 🚫 24-hour urine detection (fixed)
  if (
    analyte.includes("urine") &&
    (analyte.includes("24h") || analyte.includes("24 hr") || analyte.includes("24hour"))
  ) {
    setDecision_(sheet, row, "HOLD", "24-hour urine not allowed");
    return;
  }

  if (isNaN(value)) {
    setDecision_(sheet, row, "HOLD", "Invalid value");
    return;
  }

  const ref = getReferenceRange_(analyte);

  applyColor_(sheet, row, value, ref);

  if (ref && (value < ref.low || value > ref.high)) {
    setDecision_(sheet, row, "REVIEW", "Outside reference");
  } else {
    setDecision_(sheet, row, "AUTO", "Normal");
  }

  checkBilirubin_(sheet, row);
  checkLFT_(sheet, row);
  checkRenal_(sheet, row);
  checkElectrolyte_(sheet, row);
  checkLipidProfile_(sheet, row);
  checkIronProfile_(sheet, row);

  updateHistory_(hist, patientId, analyte, value);
}

// ================= 🔥 BULK SCAN =================
function scanRecentRows_(limit) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Results");
  const lastRow = sheet.getLastRow();

  const start = Math.max(2, lastRow - limit + 1);

  for (let r = start; r <= lastRow; r++) {
    checkBilirubin_(sheet, r);
    checkLipidProfile_(sheet, r);
    checkIronProfile_(sheet, r);
  }
}

// ================= REFERENCE =================
function getReferenceRange_(a) {
  a = a.toLowerCase();

  const ref = {

    // LIPID
    "cholesterol":[125,200],
    "triglycerides":[0,150],
    "hdl":[40,80],
    "ldl":[0,130],
    "vldl":[5,40],

    // IRON PROFILE
    "iron":[60,170],
    "tibc":[250,450],
    "transferrin":[200,360],
    "saturation":[20,50],

    // CRP
    "crp":[0,5],
    "hscrp":[0,3],

    // LFT
    "tbil":[0.2,1.2],
    "dbil":[0,0.3],
    "ibil":[0.2,0.9],
    "ast":[10,40],
    "alt":[7,56],
    "alp":[40,130],
    "albumin":[3.5,5.2],
    "total protein":[6,8.3],

    // RFT
    "urea":[15,40],
    "creatinine":[0.6,1.3],

    // ELECTROLYTES
    "sodium":[135,145],
    "potassium":[3.5,5.1],
    "chloride":[98,107],

    // MINERALS
    "calcium":[8.6,10.2],
    "phosphate":[2.5,4.5],
    "magnesium":[1.7,2.4],

    // THYROID
    "tsh":[0.4,4.5],

    // VITAMINS
    "vitamin b12":[200,900],
    "vitamin d":[30,100],
    "folate":[3,17]
  };

  for (let key in ref) {
    if (a.includes(key)) {
      return {low:ref[key][0], high:ref[key][1]};
    }
  }

  return null;
}

// ================= 🎨 COLOR =================
function applyColor_(sheet, row, value, ref) {
  const cell = sheet.getRange(row, 5);

  if (value < 0) {
    cell.setBackground("#8A2BE2");
    return;
  }

  if (!ref) return;

  if (value > ref.high * 1.5) {
    cell.setBackground("#FF69B4");
  } else if (value > ref.high) {
    cell.setBackground("#FFFF66");
  } else {
    cell.setBackground(null);
  }
}

// ================= 🔴 BILIRUBIN =================
function checkBilirubin_(sheet, row) {
  const g = getGroup_(sheet, row);

  let t = g["tbil"];
  let d = g["dbil"];
  let i = g["ibil"];

  if (t == null || d == null) return;

  if ((t < 0) || (d < 0) || (i != null && i < 0) || d > t || (i != null && i > t)) {
    applyGroup_(sheet, g.rows, "HOLD", "Invalid bilirubin");
  }
}

// ================= 🧠 LIPID =================
function checkLipidProfile_(sheet, row) {
  const g = getGroup_(sheet, row);

  if (g.cholesterol > 300) {
    applyGroup_(sheet, g.rows, "HOLD", "Very high cholesterol");
  }

  if (g.triglycerides > 400) {
    applyGroup_(sheet, g.rows, "REVIEW", "TG high");
  }

  if (g.ldl > 190) {
    applyGroup_(sheet, g.rows, "HOLD", "LDL very high");
  }

  if (g.hdl < 40) {
    applyGroup_(sheet, g.rows, "REVIEW", "Low HDL");
  }
}

// ================= 🩸 IRON =================
function checkIronProfile_(sheet, row) {
  const g = getGroup_(sheet, row);

  if (g["iron"] && g["tibc"]) {
    let sat = (g["iron"] / g["tibc"]) * 100;

    if (sat < 15) {
      applyGroup_(sheet, g.rows, "REVIEW", "Low iron saturation");
    }

    if (sat > 60) {
      applyGroup_(sheet, g.rows, "REVIEW", "High iron saturation");
    }
  }
}

// ================= 🔬 OTHERS =================
function checkLFT_(sheet,row){}
function checkRenal_(sheet,row){}
function checkElectrolyte_(sheet,row){}

// ================= GROUP =================
function getGroup_(sheet, row) {
  const data = sheet.getDataRange().getValues();
  const current = data[row-1];

  let g = {};
  g.rows = [];

  for (let i=1;i<data.length;i++) {
    if (data[i][0]==current[0] && data[i][1]==current[1]) {
      const name = (data[i][3] || "").toLowerCase();
      g[name] = Number(data[i][4]);
      g.rows.push(i+1);
    }
  }
  return g;
}

function applyGroup_(sheet, rows, status, reason) {
  rows.forEach(r=>{
    sheet.getRange(r,9).setValue(status);
    sheet.getRange(r,10).setValue(reason);
  });
}

// ================= HISTORY =================
function updateHistory_(hist, pid, analyte, value) {
  hist.appendRow([pid, analyte, value, new Date()]);
}

// ================= OUTPUT =================
function setDecision_(sheet, row, status, reason) {
  sheet.getRange(row,9).setValue(status);
  sheet.getRange(row,10).setValue(reason);
}
