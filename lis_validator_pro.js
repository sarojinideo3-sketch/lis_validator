function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== "Results") return;

  const row = e.range.getRow();
  if (row === 1) return;

  validateRow_(row);
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

  if (analyte.includes("24")) {
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
    setDecision_(sheet, row, "REVIEW", "Outside reference range");
  } else {
    setDecision_(sheet, row, "AUTO", "Normal");
  }

  // 🔴 GROUP LOGIC
  checkBilirubin_(sheet, row);
  checkLFT_(sheet, row);
  checkRenal_(sheet, row);
  checkElectrolyte_(sheet, row);
  checkLipidProfile_(sheet, row);

  updateHistory_(hist, patientId, analyte, value);
}

// ================= REFERENCE =================
function getReferenceRange_(a) {
  a = a.toLowerCase();

  const ref = {

    // LIPID PROFILE
    "cholesterol":[125,200],
    "total cholesterol":[125,200],
    "triglycerides":[0,150],
    "hdl":[40,80],
    "ldl":[0,130],
    "vldl":[5,40],

    // GLUCOSE
    "fasting glucose":[70,99],
    "fbs":[70,99],
    "pp glucose":[0,140],
    "random glucose":[0,200],
    "glucose":[70,100],

    // LFT
    "tbil":[0.2,1.2],
    "dbil":[0,0.3],
    "ibil":[0.2,0.9],
    "ast":[10,40],
    "alt":[7,56],
    "alp":[40,130],
    "albumin":[3.5,5.2],
    "total protein":[6.0,8.3],

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
    "t3":[80,200],
    "t4":[5,12],

    // OTHERS
    "probnp":[0,125],
    "ferritin":[15,150],
    "vitamin b12":[200,900],
    "folate":[3,17],
    "vitamin d":[30,100]
  };

  for (let key in ref) {
    if (a.includes(key)) {
      return {low: ref[key][0], high: ref[key][1]};
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

// ================= 🔬 LFT =================
function checkLFT_(sheet, row) {
  const g = getGroup_(sheet, row);

  if (g.ast && g.alt && g.ast/g.alt > 2) {
    applyGroup_(sheet, g.rows, "REVIEW", "AST/ALT >2");
  }

  if (g.albumin && g["total protein"] && g.albumin > g["total protein"]) {
    applyGroup_(sheet, g.rows, "HOLD", "Albumin > TP");
  }
}

// ================= ⚡ RFT =================
function checkRenal_(sheet, row) {
  const g = getGroup_(sheet, row);

  if (g.urea && g.creatinine && g.urea > 100 && g.creatinine < 1.2) {
    applyGroup_(sheet, g.rows, "REVIEW", "Urea mismatch");
  }
}

// ================= 🧂 ELECTROLYTES =================
function checkElectrolyte_(sheet, row) {
  const g = getGroup_(sheet, row);

  if (g.sodium && (g.sodium < 100 || g.sodium > 170)) {
    applyGroup_(sheet, g.rows, "HOLD", "Critical sodium");
  }
}

// ================= 🧠 LIPID PROFILE =================
function checkLipidProfile_(sheet, row) {
  const g = getGroup_(sheet, row);

  let chol = g["cholesterol"];
  let tg = g["triglycerides"];
  let hdl = g["hdl"];
  let ldl = g["ldl"];

  if (chol != null && chol > 300) {
    applyGroup_(sheet, g.rows, "HOLD", "Very high cholesterol");
  }

  if (tg != null && tg > 400) {
    applyGroup_(sheet, g.rows, "REVIEW", "TG high - LDL unreliable");
  }

  if (ldl != null && ldl > 190) {
    applyGroup_(sheet, g.rows, "HOLD", "LDL very high");
  }

  if (hdl != null && hdl < 40) {
    applyGroup_(sheet, g.rows, "REVIEW", "Low HDL");
  }
}

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
