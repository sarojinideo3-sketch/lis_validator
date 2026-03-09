(function(){

console.log("LIS Validator Pro Started");

/* GLOBAL DATA */

let repeatList=[];
let results={};
let alerts=[];

/* REFERENCE RANGES */

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

"TSH":{low:0.4,high:4},
"FREE T3":{low:2.0,high:4.4},
"FREE T4":{low:0.8,high:1.8},

"PROLACTIN":{low:4,high:23},

"PROCALCITONIN":{low:0,high:0.5}

};

/* CRITICAL VALUES */

const CRITICAL_VALUES={

"POTASSIUM":{low:2.5,high:6.5},
"SODIUM":{low:120,high:160},
"CALCIUM":{low:6,high:13}

};

/* UTILITY */

function getNumber(text){

let m=text.match(/-?\d+(\.\d+)?/);

return m?parseFloat(m[0]):null;

}

function normalize(param){

return param
.toUpperCase()
.replace(/\(.*?\)/g,"")
.replace(/[^A-Z0-9 ]/g,"")
.trim();

}

/* DELTA CHECK */

function deltaCheck(parameter,current,previous){

if(previous==null) return;

let change=Math.abs(current-previous)/previous*100;

if(change>50){

alerts.push("Delta Check Alert: "+parameter);

}

}

/* PATTERN RECOGNITION */

function patternRecognition(){

if(results["ALBUMIN"] && results["TOTAL PROTEIN"]){

if(results["ALBUMIN"]>results["TOTAL PROTEIN"]){

alerts.push("Logical Error: Albumin > Total Protein");

}

}

if(results["POTASSIUM"]>5.5 && results["AST"]>80){

alerts.push("Possible Hemolysis Pattern");

}

}

/* SCAN LIS RESULTS */

function scanResults(){

repeatList=[];
alerts=[];
results={};

let old=document.getElementById("repeatPanel");

if(old) old.remove();

let rows=document.querySelectorAll("table tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<2) return;

let parameter=normalize(cells[0].innerText);

let value=getNumber(cells[1].innerText);

let prev=getNumber(cells[2]?.innerText);

if(!REF_RANGES[parameter]) return;

results[parameter]=value;

let ref=REF_RANGES[parameter];

/* LOW */

if(value < ref.low){

row.style.background="#b39ddb";

repeatList.push(parameter+" : "+value+" (LOW)");

}

/* SLIGHT HIGH */

if(value > ref.high && value <= ref.high*1.2){

row.style.background="#ffb347";

repeatList.push(parameter+" : "+value+" (HIGH)");

}

/* VERY HIGH */

if(value > ref.high*1.2){

row.style.background="#ff8fab";

repeatList.push(parameter+" : "+value+" (VERY HIGH)");

}

/* CRITICAL */

if(CRITICAL_VALUES[parameter]){

let crit=CRITICAL_VALUES[parameter];

if(value < crit.low || value > crit.high){

row.style.background="#ff0000";

alerts.push("Critical Value: "+parameter+" "+value);

}

}

deltaCheck(parameter,value,prev);

});

patternRecognition();

createRepeatPanel(repeatList);

updateAssistant();

}

/* REPEAT PANEL */

function createRepeatPanel(list){

let panel=document.createElement("div");

panel.id="repeatPanel";

panel.style.position="fixed";
panel.style.right="20px";
panel.style.top="120px";
panel.style.width="360px";
panel.style.background="white";
panel.style.border="2px solid black";
panel.style.zIndex="9999";
panel.style.fontFamily="Arial";

let header=document.createElement("div");

header.style.background="#1e3a5f";
header.style.color="white";
header.style.padding="6px";
header.innerHTML="Repeat Parameters";

panel.appendChild(header);

let buttons=document.createElement("span");

buttons.innerHTML=
' <button id="minBtn">–</button>'+
' <button id="maxBtn">□</button>'+
' <button id="printBtn">🖨</button>'+
' <button id="closeBtn">✖</button>';

header.appendChild(buttons);

let body=document.createElement("div");

body.id="repeatBody";
body.style.padding="8px";
body.style.maxHeight="300px";
body.style.overflow="auto";

panel.appendChild(body);

list.forEach(r=>{

let row=document.createElement("div");

row.innerText=r;

body.appendChild(row);

});

document.body.appendChild(panel);

document.getElementById("minBtn").onclick=()=>body.style.display="none";
document.getElementById("maxBtn").onclick=()=>body.style.display="block";
document.getElementById("closeBtn").onclick=()=>panel.remove();

document.getElementById("printBtn").onclick=function(){

let w=window.open("","","width=600,height=600");

w.document.write("<h3>Repeat Parameters</h3>");

list.forEach(r=>{

w.document.write("<p>"+r+"</p>");

});

w.print();

};

}

/* ASSISTANT PANEL */

function createAssistant(){

let panel=document.createElement("div");

panel.id="assistantPanel";

panel.style.position="fixed";
panel.style.bottom="20px";
panel.style.right="20px";
panel.style.width="300px";
panel.style.background="white";
panel.style.border="2px solid black";
panel.style.zIndex="9999";

panel.innerHTML=
'<div style="background:#1e3a5f;color:white;padding:6px">Validation Assistant'+
'<button id="closeAssist" style="float:right">✖</button></div>'+
'<div style="padding:8px">'+
'<button id="scanBtn">Scan Results</button>'+
'<div id="alertsBox" style="color:red;margin-top:10px"></div>'+
'</div>';

document.body.appendChild(panel);

document.getElementById("scanBtn").onclick=scanResults;

document.getElementById("closeAssist").onclick=()=>panel.remove();

}

/* UPDATE ASSISTANT */

function updateAssistant(){

let box=document.getElementById("alertsBox");

if(!box) return;

box.innerHTML=alerts.map(a=>"• "+a).join("<br>");

}

/* START */

createAssistant();

})();
