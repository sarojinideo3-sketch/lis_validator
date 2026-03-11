(function(){

console.log("LIS Validator Pro Running");

/* =========================
REFERENCE RANGE LIBRARY
========================= */

const REF_RANGES={

"SODIUM":{low:135,high:145},
"POTASSIUM":{low:3.5,high:5.1},
"CHLORIDE":{low:98,high:107},
"UREA":{low:15,high:40},
"CREATININE":{low:0.6,high:1.3},
"URIC ACID":{low:3.4,high:7},

"CALCIUM":{low:8.6,high:10.2},
"TOTAL CALCIUM":{low:8.6,high:10.2},
"PHOSPHATE":{low:2.5,high:4.5},
"MAGNESIUM":{low:1.7,high:2.2},

"TOTAL PROTEIN":{low:6.4,high:8.3},
"ALBUMIN":{low:3.5,high:5},

"TOTAL BILIRUBIN":{low:0.3,high:1.2},
"DIRECT BILIRUBIN":{low:0.1,high:0.3},
"INDIRECT BILIRUBIN":{low:0.2,high:0.9},

"AST":{low:10,high:40},
"ALT":{low:7,high:56},
"ALP":{low:44,high:147},
"GGT":{low:9,high:48},
"LDH":{low:140,high:280},

"GLUCOSE":{low:70,high:100},

"CHOLESTEROL":{low:125,high:200},
"TRIGLYCERIDES":{low:0,high:150},
"HDL":{low:40,high:80},
"LDL":{low:0,high:130},
"VLDL":{low:5,high:40},

"TSH":{low:0.4,high:4},
"T3":{low:80,high:200},
"T4":{low:5,high:12},
"FREE T3":{low:2,high:4.4},
"FREE T4":{low:0.8,high:1.8},

"PROLACTIN":{low:4,high:23},
"PROCALCITONIN":{low:0,high:0.5},

"VITAMIN B12":{low:200,high:900},
"VITAMIN D":{low:30,high:100},

"FERRITIN":{low:30,high:400}

};

/* =========================
UTILITY FUNCTIONS
========================= */

function getNumber(text){
let m=text.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

/* =========================
PARAMETER NORMALIZATION
========================= */

function normalizeParameter(name){

name=name.toUpperCase();

if(name.includes("FASTING")) return "GLUCOSE";
if(name.includes("RANDOM")) return "GLUCOSE";
if(name.includes("PP")) return "GLUCOSE";
if(name.includes("ADA")) return "GLUCOSE";

if(name.includes("MAGNESIUM")) return "MAGNESIUM";

if(name.includes("CHOLESTEROL")) return "CHOLESTEROL";
if(name.includes("TRIGLYCERIDE")) return "TRIGLYCERIDES";

return name;

}

/* =========================
SCAN LIS PAGE
========================= */

let repeatList=[];
let abnormalCount=0;
let deselectedPatients=0;
let totalRows=0;

let rows=document.querySelectorAll("tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<2) return;

totalRows++;

let parameter=cells[0].innerText.trim().toUpperCase();
parameter=parameter.replace(/\(.*?\)/g,"").trim();
parameter=normalizeParameter(parameter);

let value=getNumber(cells[1].innerText);

if(!REF_RANGES[parameter]) return;

let ref=REF_RANGES[parameter];

let abnormal=false;

/* NEGATIVE */

if(value<0){

row.style.background="#8a2be2";
row.style.color="white";
abnormal=true;

}

/* LOW */

else if(value<ref.low){

row.style.background="#d8b4fe";
abnormal=true;

}

/* SLIGHTLY HIGH */

else if(value>ref.high && value<=ref.high*1.2){

row.style.background="#fff176";
abnormal=true;

}

/* VERY HIGH */

else if(value>ref.high*1.2){

row.style.background="#ff8fab";
abnormal=true;

}

/* =========================
HANDLE ABNORMAL
========================= */

if(abnormal){

abnormalCount++;

let node=row;
let cr="";

/* FIND CR NUMBER */

while(node && !/\d{15}/.test(node.innerText)){
node=node.previousElementSibling || node.parentElement;
}

if(node){

let match=node.innerText.match(/\d{15}/);

if(match) cr=match[0];

let checkbox=node.querySelector("input[type='checkbox']");

if(checkbox && checkbox.checked){
checkbox.click();
deselectedPatients++;
}

}

/* STORE PATIENT-WISE REPEAT */

repeatList.push({
cr:cr,
parameter:parameter,
value:value
});

}

});

/* =========================
REPEAT PANEL
========================= */

createRepeatPanel(repeatList);

/* =========================
VALIDATION ASSISTANT
========================= */

createValidationAssistant(totalRows,abnormalCount,deselectedPatients);

/* =========================
REPEAT PANEL FUNCTION
========================= */

function createRepeatPanel(list){

let panel=document.createElement("div");

panel.style.position="fixed";
panel.style.right="20px";
panel.style.top="120px";
panel.style.width="420px";
panel.style.background="white";
panel.style.border="2px solid black";
panel.style.zIndex="9999";
panel.style.fontFamily="Arial";

/* HEADER */

let header=document.createElement("div");

header.style.background="#1e3a5f";
header.style.color="white";
header.style.padding="6px";
header.style.display="flex";
header.style.justifyContent="space-between";

header.innerHTML="<b>Repeat Parameters</b>";

panel.appendChild(header);

/* BUTTONS */

let buttons=document.createElement("div");

buttons.innerHTML=`
<button id="minBtn">–</button>
<button id="maxBtn">□</button>
<button id="printBtn">🖨</button>
<button id="closeBtn">✖</button>
`;

header.appendChild(buttons);

/* BODY */

let body=document.createElement("div");

body.style.padding="8px";
body.style.maxHeight="350px";
body.style.overflow="auto";

let table="<table border='1' width='100%' style='border-collapse:collapse'>";

table+="<tr><th>CR No</th><th>Parameter</th><th>Value</th></tr>";

list.forEach(r=>{
table+=`<tr>
<td>${r.cr}</td>
<td>${r.parameter}</td>
<td>${r.value}</td>
</tr>`;
});

table+="</table>";

body.innerHTML=table;

panel.appendChild(body);

document.body.appendChild(panel);

/* PANEL BUTTONS */

document.getElementById("minBtn").onclick=()=>body.style.display="none";
document.getElementById("maxBtn").onclick=()=>body.style.display="block";
document.getElementById("closeBtn").onclick=()=>panel.remove();

document.getElementById("printBtn").onclick=function(){

let w=window.open("","","width=600,height=600");

w.document.write("<h3>Repeat Parameters</h3>");
w.document.write(body.innerHTML);

w.print();

};

}

/* =========================
VALIDATION DASHBOARD
========================= */

function createValidationAssistant(totalRows,abnormalCount,deselectedPatients){

let panel=document.createElement("div");

panel.style.position="fixed";
panel.style.bottom="20px";
panel.style.right="20px";
panel.style.width="260px";
panel.style.background="white";
panel.style.border="2px solid #1e3a5f";
panel.style.zIndex="9999";
panel.style.fontFamily="Arial";

/* HEADER */

let header=document.createElement("div");

header.style.background="#1e3a5f";
header.style.color="white";
header.style.padding="6px";
header.innerText="Validation Assistant";

panel.appendChild(header);

/* BODY */

let body=document.createElement("div");

body.style.padding="8px";

body.innerHTML=`
<b>Rows Scanned:</b> ${totalRows}<br>
<b>Abnormal Results:</b> ${abnormalCount}<br>
<b>Patients Deselected:</b> ${deselectedPatients}<br>
<b>Repeat Tests:</b> ${repeatList.length}
`;

panel.appendChild(body);

document.body.appendChild(panel);

}

})();