(function(){

console.log("LIS Validator Pro Running");

/* =========================
REFERENCE RANGE LIBRARY
========================= */

const REF_RANGES = {

"SODIUM":{low:120,high:145},
"POTASSIUM":{low:2.5,high:5.5},
"CHLORIDE":{low:80,high:118},
"UREA":{low:15,high:100},
"CREATININE":{low:0.6,high:5},
"URIC ACID":{low:3.4,high:13},
"AMYLASE":{low:28,high:700},
"C REACTIVE PROTEIN":{low:0.001,high:200},
"TOTAL CALCIUM":{low:7,high:10.2},
"CALCIUM":{low:8.6,high:10.2},
"PHOSPHATE":{low:2.5,high:4.5},
"MG":{low:1.7,high:2.2},
"TOTAL CHOLESTEROL":{low:100,high:300},
"TRIGLYCERIDES":{low:100,high:350},
"HDL":{low:20,high:60},
"LDL":{low:90,high:130},

"TOTAL PROTEIN":{low:6.4,high:8.3},
"ALBUMIN":{low:3.5,high:5.0},

"TOTAL BILIRUBIN":{low:0.3,high:1.2},
"DIRECT BILIRUBIN":{low:0.1,high:0.3},
"INDIRECT BILIRUBIN":{low:0.2,high:0.9},

"AST":{low:10,high:40},
"ALT":{low:7,high:56},
"ALP":{low:44,high:147},
"GGT":{low:9,high:48},
"LDH":{low:140,high:280},

"RANDOM BLOOD SUGAR":{low:60,high:400},
"RANDOM PLASMA GLUCOSE ":{low:60,high:400},
"GLUCOSE PP":{low:60,high:400},
"FASTING BLOOD SUGAR":{low:70,high:400},
"HBA1C":{low:4.0,high:6},

"TSH":{low:0.4,high:4.0},
"T3":{low:80,high:200},
"T4":{low:5,high:12},
"FREE T3":{low:2.0,high:4.4},
"FREE T4":{low:0.8,high:1.8},

"PROLACTIN":{low:4,high:23},
"PROCALCITONIN":{low:0,high:0.5},

"VITAMIN B12":{low:200,high:900},
"VITAMIN D":{low:30,high:100},

"FERRITIN":{low:30,high:400}

};

/* =========================
UTILITY
========================= */

function getNumber(text){
let m=text.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

/* =========================
SCAN LIS PAGE
========================= */

let repeatList=[];
let results={};

let rows=document.querySelectorAll("tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<2) return;

let parameter=cells[0].innerText.trim().toUpperCase();

parameter=parameter.replace(/\(.*?\)/g,"").trim();

let value=getNumber(cells[1].innerText);

if(!REF_RANGES[parameter]) return;

let ref=REF_RANGES[parameter];

results[parameter]=value;

/* =========================
COLOR LOGIC
========================= */

let abnormal=false;

/* NEGATIVE VALUES */

if(value < 0){

row.style.background="#8a2be2";
row.style.color="white";
abnormal=true;

}

/* LOW VALUES */

else if(value < ref.low){

row.style.background="#d8b4fe";
abnormal=true;

}

/* SLIGHTLY HIGH */

else if(value > ref.high && value <= ref.high*1.2){

row.style.background="#fff176";
abnormal=true;

}

/* VERY HIGH */

else if(value > ref.high*1.2){

row.style.background="#ff8fab";
abnormal=true;

}

/* =========================
ADD TO REPEAT LIST
========================= */

if(abnormal){

repeatList.push(parameter+" : "+value+" (Ref "+ref.low+"-"+ref.high+")");

/* FIND CR ROW */

let node=row;

while(node && !/\d{15}/.test(node.innerText)){
node=node.previousElementSibling || node.parentElement;
}

if(node){

let checkbox=node.querySelector("input[type='checkbox']");

if(checkbox && checkbox.checked){

checkbox.click();

}

}

}

});

/* =========================
SMART VALIDATION RULES
========================= */

checkHemolysis(results);
checkClot(results);
checkDilution(results);

/* =========================
REPEAT PANEL
========================= */

createRepeatPanel(repeatList);

/* =========================
SMART RULES
========================= */

function checkHemolysis(r){

if(r["POTASSIUM"]>5.5 && r["AST"]>80 && r["LDH"]>400){

alert("Possible Hemolysis Detected");

}

}

function checkClot(r){

if(r["POTASSIUM"]>5.5 && r["CALCIUM"]<8 && r["TOTAL PROTEIN"]<6){

alert("Possible Clotted Sample");

}

}

function checkDilution(r){

if(r["SODIUM"]<130 && r["CHLORIDE"]<95 && r["CALCIUM"]<8){

alert("Possible Dilution Error");

}

}

/* =========================
REPEAT PANEL
========================= */

function createRepeatPanel(list){

let panel=document.createElement("div");

panel.style.position="fixed";
panel.style.right="20px";
panel.style.top="120px";
panel.style.width="380px";
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

body.id="repeatBody";

body.style.padding="8px";
body.style.maxHeight="350px";
body.style.overflow="auto";

panel.appendChild(body);

/* DATA */

if(list.length===0){

body.innerHTML="No abnormal parameters";

}else{

list.forEach(r=>{

let row=document.createElement("div");
row.innerText=r;
body.appendChild(row);

});

}

document.body.appendChild(panel);

/* BUTTON FUNCTIONS */

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

})();
