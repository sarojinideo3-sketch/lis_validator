(function(){

console.log("🚀 LIS Validator PRO Running");

/* =========================
REFERENCE RANGES
========================= */

const REF = {

"SODIUM":{low:135,high:145},
"POTASSIUM":{low:3.5,high:5.1},
"CHLORIDE":{low:98,high:107},

"UREA":{low:15,high:40},
"CREATININE":{low:0.6,high:1.3},

"CALCIUM":{low:8.6,high:10.2},
"PHOSPHATE":{low:2.5,high:4.5},
"MAGNESIUM":{low:1.7,high:2.4},

"TOTAL PROTEIN":{low:6,high:8.3},
"ALBUMIN":{low:3.5,high:5.2},

"TOTAL BILIRUBIN":{low:0.2,high:1.2},
"DIRECT BILIRUBIN":{low:0,high:0.3},
"INDIRECT BILIRUBIN":{low:0.2,high:0.9},

"AST":{low:10,high:40},
"ALT":{low:7,high:56},
"ALP":{low:40,high:130},

"GLUCOSE":{low:70,high:100},

// LIPID
"CHOLESTEROL":{low:125,high:200},
"TRIGLYCERIDES":{low:0,high:150},
"HDL":{low:40,high:80},
"LDL":{low:0,high:130},
"VLDL":{low:5,high:40},

// IRON
"IRON":{low:60,high:170},
"TIBC":{low:250,high:450},
"TRANSFERRIN":{low:200,high:360},

// CRP
"CRP":{low:0,high:5},
"HSCRP":{low:0,high:3}

};

/* =========================
UTILITIES
========================= */

function getNumber(text){
let m=text.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

function normalize(name){
name=name.toUpperCase();

if(name.includes("FASTING")||name.includes("PP")||name.includes("RANDOM")) return "GLUCOSE";

if(name.includes("TOTAL BILIRUBIN")||name==="TBIL") return "TOTAL BILIRUBIN";
if(name.includes("DIRECT BILIRUBIN")||name==="DBIL") return "DIRECT BILIRUBIN";
if(name.includes("INDIRECT BILIRUBIN")||name==="IBIL") return "INDIRECT BILIRUBIN";

if(name.includes("CHOLESTEROL")) return "CHOLESTEROL";
if(name.includes("TRIGLYCERIDE")) return "TRIGLYCERIDES";

return name;
}

/* =========================
DESELECT FUNCTION
========================= */

function deselect(row){

let node=row;

while(node && !node.querySelector("input[type='checkbox']")){
node=node.parentElement;
}

if(node){
let cb=node.querySelector("input[type='checkbox']");
if(cb){
if(cb.checked){
cb.click();
}else{
cb.checked=false;
}
}
}

}

/* =========================
SCAN
========================= */

let rows=document.querySelectorAll("tr");

let abnormalList=[];
let bilirubinGroup=[];

rows.forEach(row=>{

let cells=row.querySelectorAll("td");
if(cells.length<2) return;

let param=normalize(cells[0].innerText.trim());
let value=getNumber(cells[1].innerText);

if(value==null) return;

let ref=REF[param];

if(!ref) return;

let abnormal=false;

/* COLOR LOGIC */

if(value<0){
row.style.background="#8A2BE2";
row.style.color="white";
abnormal=true;
}

else if(value<ref.low){
row.style.background="#d8b4fe";
abnormal=true;
}

else if(value>ref.high && value<=ref.high*1.2){
row.style.background="#fff176";
abnormal=true;
}

else if(value>ref.high*1.2){
row.style.background="#ff8fab";
abnormal=true;
}

/* STORE */

if(param.includes("BILIRUBIN")){
bilirubinGroup.push({row,param,value});
}

if(abnormal){
abnormalList.push({row,param,value});
deselect(row);
}

});

/* =========================
BILIRUBIN LOGIC
========================= */

let t=null,d=null,i=null;
let bRows=[];

bilirubinGroup.forEach(x=>{
bRows.push(x.row);

if(x.param==="TOTAL BILIRUBIN") t=x.value;
if(x.param==="DIRECT BILIRUBIN") d=x.value;
if(x.param==="INDIRECT BILIRUBIN") i=x.value;
});

if(t!=null && d!=null){

if(
t<0 || d<0 || (i!=null && i<0) ||
d>t || (i!=null && i>t)
){
bRows.forEach(r=>deselect(r));
}

}

/* =========================
LIPID LOGIC
========================= */

let chol=null,tg=null,hdl=null,ldl=null;

rows.forEach(row=>{
let cells=row.querySelectorAll("td");
if(cells.length<2) return;

let p=normalize(cells[0].innerText.trim());
let v=getNumber(cells[1].innerText);

if(p==="CHOLESTEROL") chol=v;
if(p==="TRIGLYCERIDES") tg=v;
if(p==="HDL") hdl=v;
if(p==="LDL") ldl=v;
});

if(chol>300){
rows.forEach(r=>deselect(r));
}

if(ldl>190){
rows.forEach(r=>deselect(r));
}

if(tg>400){
rows.forEach(r=>deselect(r));
}

if(hdl<40){
rows.forEach(r=>deselect(r));
}

/* =========================
IRON PROFILE
========================= */

let iron=null,tibc=null;

rows.forEach(row=>{
let cells=row.querySelectorAll("td");
if(cells.length<2) return;

let p=normalize(cells[0].innerText.trim());
let v=getNumber(cells[1].innerText);

if(p==="IRON") iron=v;
if(p==="TIBC") tibc=v;
});

if(iron && tibc){
let sat=(iron/tibc)*100;

if(sat<15 || sat>60){
rows.forEach(r=>deselect(r));
}
}

/* =========================
DONE
========================= */

console.log("✅ Validation Completed");

})();
