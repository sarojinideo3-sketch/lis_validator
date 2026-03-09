(function(){

console.log("LIS Validation Assistant Started");

/* -----------------------------
GLOBAL VARIABLES
----------------------------- */

let results=[];
let repeats=[];
let alerts=[];

/* -----------------------------
REFERENCE RANGES
----------------------------- */

const REF_RANGES={

"SODIUM":{low:135,high:145},
"POTASSIUM":{low:3.5,high:5},
"CHLORIDE":{low:98,high:107},
"UREA":{low:17,high:43},
"CREATININE":{low:0.6,high:1.3},

"URIC ACID":{low:4.4,high:8},

"CALCIUM":{low:9,high:11},
"MAGNESIUM":{low:1.7,high:2.2},

"TOTAL PROTEIN":{low:6.7,high:8.6},
"ALBUMIN":{low:3.5,high:5.2},

"AST":{low:5,high:50},
"ALT":{low:5,high:50},

"TOTAL BILIRUBIN":{low:0.3,high:1.2},

"TSH":{low:0.4,high:4},
"FREE T3":{low:2,high:4.4},
"FREE T4":{low:0.8,high:1.8},

"PROLACTIN":{low:4,high:23},

"PROCALCITONIN":{low:0,high:0.5}

};

/* -----------------------------
CRITICAL VALUES
----------------------------- */

const CRITICAL_VALUES={

"POTASSIUM":{low:2.5,high:6.5},
"SODIUM":{low:120,high:160},
"CALCIUM":{low:6,high:13}

};

/* -----------------------------
UTILITY
----------------------------- */

function getNumber(text){

let m=text.match(/-?\d+(\.\d+)?/);

return m?parseFloat(m[0]):null;

}

/* -----------------------------
SCAN RESULTS
----------------------------- */

function scanResults(){

results=[];
repeats=[];
alerts=[];

let rows=document.querySelectorAll("table tbody tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<6) return;

let param=cells[1].innerText.trim().toUpperCase();

let result=getNumber(cells[2].innerText);

let prev=getNumber(cells[3].innerText);

let refRange=REF_RANGES[param];

if(!refRange) return;

let status="Normal";

/* LOW */

if(result<refRange.low){

status="Low";

row.style.background="#d9ecff";

}

/* HIGH */

if(result>refRange.high){

status="High";

row.style.background="#ffd9d9";

}

/* CRITICAL */

if(CRITICAL_VALUES[param]){

let crit=CRITICAL_VALUES[param];

if(result<crit.low || result>crit.high){

status="CRITICAL";

alerts.push("Critical Value: "+param+" "+result);

row.style.background="#ff4d4d";

}

}

/* DELTA CHECK */

if(prev){

let delta=Math.abs(result-prev)/prev*100;

if(delta>50){

alerts.push("Delta Check Alert: "+param);

}

}

/* SAVE RESULT */

results.push({

param: param,
value: result,
prev: prev,
status: status

});

if(status!=="Normal"){

repeats.push(param+" : "+result);

}

});

patternCheck();

updateAssistant();

}

/* -----------------------------
PATTERN RECOGNITION
----------------------------- */

function patternCheck(){

let albumin=getValue("ALBUMIN");

let tp=getValue("TOTAL PROTEIN");

if(albumin && tp){

if(albumin>tp){

alerts.push("Logical Error: Albumin > Total Protein");

}

}

let k=getValue("POTASSIUM");

let ast=getValue("AST");

if(k>5.5 && ast>80){

alerts.push("Possible Hemolysis");

}

}

/* -----------------------------
GET VALUE
----------------------------- */

function getValue(name){

let r=results.find(x=>x.param===name);

return r?r.value:null;

}

/* -----------------------------
VALIDATION ASSISTANT
----------------------------- */

function createAssistant(){

let panel=document.createElement("div");

panel.id="validationAssistant";

panel.style.position="fixed";
panel.style.bottom="20px";
panel.style.right="20px";
panel.style.width="320px";
panel.style.background="white";
panel.style.border="1px solid #ccc";
panel.style.zIndex="9999";
panel.style.fontFamily="Arial";

panel.innerHTML=`
<div style="background:#1e3a5f;color:white;padding:8px">
Validation Assistant
<span id="closeVA" style="float:right;cursor:pointer">✖</span>
</div>

<div style="padding:10px">

<button id="scanBtn">▶ Scan Results</button>
<button id="printBtn">Print Repeats</button>

<div id="alertsBox" style="margin-top:10px;color:red"></div>

<div style="margin-top:10px">

<b>System Status</b><br>

<span id="statusText">Ready to validate</span>

</div>

</div>
`;

document.body.appendChild(panel);

/* BUTTON EVENTS */

document.getElementById("scanBtn").onclick=scanResults;

document.getElementById("printBtn").onclick=printRepeats;

document.getElementById("closeVA").onclick=()=>panel.remove();

}

/* -----------------------------
UPDATE PANEL
----------------------------- */

function updateAssistant(){

document.getElementById("alertsBox").innerHTML=
alerts.map(a=>"• "+a).join("<br>");

}

/* -----------------------------
PRINT REPEAT LIST
----------------------------- */

function printRepeats(){

let w=window.open("","","width=600,height=600");

w.document.write("<h3>Repeat Tests</h3>");

repeats.forEach(r=>{

w.document.write("<p>"+r+"</p>");

});

w.print();

}

/* -----------------------------
START PROGRAM
----------------------------- */

createAssistant();

})();
