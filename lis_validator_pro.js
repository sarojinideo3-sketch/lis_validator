(function(){

console.log("AIIMS LIS Validator Started");

/* ---------------- PARAMETER LIST ---------------- */

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
"FREE T3":{low:2,high:4.4},
"FREE T4":{low:0.8,high:1.8},

"PROLACTIN":{low:4,high:23},
"PROCALCITONIN":{low:0,high:0.5}

};

/* ---------------- CRITICAL VALUES ---------------- */

const CRITICAL_VALUES={
"POTASSIUM":{low:2.5,high:6.5},
"SODIUM":{low:120,high:160},
"CALCIUM":{low:6,high:13}
};

/* ---------------- UTILITIES ---------------- */

function getNumber(text){

let m=text.match(/-?\d+(\.\d+)?/);

return m?parseFloat(m[0]):null;

}

/* ---------------- DATA ---------------- */

let repeatList=[];

/* ---------------- SCAN RESULTS ---------------- */

let rows=document.querySelectorAll("table tbody tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<3) return;

let parameter=cells[0].innerText.trim().toUpperCase();

let value=getNumber(cells[1].innerText);

if(value==null) return;

let ref=REF_RANGES[parameter];

if(!ref) return;

let abnormal=false;

/* NEGATIVE VALUES */

if(value<0){

row.style.background="#7b1fa2";
row.style.color="white";

abnormal=true;

}

/* LOW */

else if(value<ref.low){

row.style.background="#b39ddb";

abnormal=true;

}

/* SLIGHTLY HIGH */

else if(value>ref.high && value<=ref.high*1.2){

row.style.background="#ffb347";

abnormal=true;

}

/* VERY HIGH */

else if(value>ref.high*1.2){

row.style.background="#ff8fab";

abnormal=true;

}

/* CRITICAL */

if(CRITICAL_VALUES[parameter]){

let crit=CRITICAL_VALUES[parameter];

if(value<crit.low || value>crit.high){

row.style.background="#ff0000";

}

}

/* ADD TO REPEAT LIST */

if(abnormal){

repeatList.push(parameter+" : "+value+" (Ref "+ref.low+"-"+ref.high+")");

/* FIND PATIENT ROW AND DESELECT */

let patientRow=row.previousElementSibling;

while(patientRow){

let checkbox=patientRow.querySelector("input[type='checkbox']");

if(checkbox){

if(checkbox.checked){
checkbox.click();
}

break;

}

patientRow=patientRow.previousElementSibling;

}

}

});

/* ---------------- PANEL ---------------- */

createPanel(repeatList);

function createPanel(list){

let panel=document.createElement("div");

panel.style.position="fixed";
panel.style.right="20px";
panel.style.top="120px";
panel.style.width="360px";
panel.style.background="white";
panel.style.border="2px solid black";
panel.style.padding="10px";
panel.style.zIndex="9999";
panel.style.maxHeight="420px";
panel.style.overflow="auto";
panel.style.fontSize="13px";

/* HEADER */

let header=document.createElement("div");

header.innerHTML="<b>Repeat Parameters</b>";

panel.appendChild(header);

/* CONTROLS */

let controls=document.createElement("div");

controls.innerHTML=
'<button id="minBtn">–</button>'+
'<button id="maxBtn">□</button>'+
'<button id="printBtn">🖨</button>'+
'<button id="closeBtn">✖</button>';

panel.appendChild(controls);

/* BODY */

let body=document.createElement("div");

panel.appendChild(body);

if(list.length===0){

body.innerHTML="No abnormal results";

}else{

list.forEach(r=>{

body.innerHTML+=r+"<br>";

});

}

document.body.appendChild(panel);

/* BUTTON ACTIONS */

document.getElementById("minBtn").onclick=()=>{
body.style.display="none";
};

document.getElementById("maxBtn").onclick=()=>{
body.style.display="block";
};

document.getElementById("closeBtn").onclick=()=>{
panel.remove();
};

document.getElementById("printBtn").onclick=()=>{

let w=window.open("","","width=600,height=600");

w.document.write("<h3>Repeat Parameters</h3>");

list.forEach(i=>{
w.document.write("<p>"+i+"</p>");
});

w.print();

};

}

})();
