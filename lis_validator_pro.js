(function(){

console.log("🚀 LIS Validator FINAL PRO");

/* =========================
REMOVE OLD PANEL
========================= */
let old=document.getElementById("lis-panel");
if(old) old.remove();

/* =========================
REFERENCE
========================= */

const REF={
"SODIUM":[135,145],
"POTASSIUM":[3.5,5.1],
"CHLORIDE":[98,107],
"UREA":[15,40],
"CREATININE":[0.6,1.3],
"CALCIUM":[8.6,10.2],
"PHOSPHATE":[2.5,4.5],
"MAGNESIUM":[1.7,2.4],
"TOTAL PROTEIN":[6,8.3],
"ALBUMIN":[3.5,5.2],
"TOTAL BILIRUBIN":[0.2,1.2],
"DIRECT BILIRUBIN":[0,0.3],
"INDIRECT BILIRUBIN":[0.2,0.9],
"AST":[10,40],
"ALT":[7,56],
"ALP":[40,130],
"GLUCOSE":[70,100],
"CHOLESTEROL":[125,200],
"TRIGLYCERIDES":[0,150],
"HDL":[40,80],
"LDL":[0,130],
"IRON":[60,170],
"TIBC":[250,450],
"CRP":[0,5],
"HSCRP":[0,3]
};

/* =========================
UTILS
========================= */

function getVal(t){
let m=t.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

function normalize(n){
n=n.toUpperCase();

if(n.includes("BILIRUBIN")){
if(n.includes("TOTAL")) return "TOTAL BILIRUBIN";
if(n.includes("DIRECT")) return "DIRECT BILIRUBIN";
if(n.includes("INDIRECT")) return "INDIRECT BILIRUBIN";
}

if(n.includes("TRIGLYCERIDE")) return "TRIGLYCERIDES";
if(n.includes("FASTING")||n.includes("PP")||n.includes("RANDOM")) return "GLUCOSE";

return n;
}

/* =========================
DESELECT PARAM ROW
========================= */

function deselectRow(row){
let cb=row.querySelector("input[type='checkbox']");
if(cb){
cb.checked=false;
cb.dispatchEvent(new Event("change",{bubbles:true}));
}
}

/* =========================
DESELECT PATIENT (CR)
========================= */

function deselectPatient(row){

let container=row.closest("table") || document;

let checkbox=container.querySelector("tr input[type='checkbox']");

if(checkbox){
checkbox.checked=false;
checkbox.dispatchEvent(new Event("change",{bubbles:true}));
}

}

/* =========================
SCAN
========================= */

let rows=document.querySelectorAll("tr");
let abnormal=[];

let tbil=null,dbil=null,ibil=null;
let bilirubinRows=[];

rows.forEach(r=>{

let td=r.querySelectorAll("td");
if(td.length<2) return;

let param=normalize(td[0].innerText.trim());
let val=getVal(td[1].innerText);

if(val==null) return;

let ref=REF[param];
if(!ref) return;

/* 🚫 24H URINE */
if(
param.includes("URINE") &&
(param.includes("24H")||param.includes("24 HR")||param.includes("24HOUR"))
){
deselectRow(r);
}

/* COLOR */

let abnormalFlag=false;

if(val<0){
r.style.background="#8A2BE2";
r.style.color="white";
abnormalFlag=true;
}

else if(val<ref[0]){
r.style.background="#d8b4fe";
abnormalFlag=true;
}

else if(val>ref[1] && val<=ref[1]*1.2){
r.style.background="#fff176";
abnormalFlag=true;
}

else if(val>ref[1]*1.2){
r.style.background="#ff8fab";
abnormalFlag=true;
}

/* BILIRUBIN TRACK */

if(param.includes("BILIRUBIN")){
bilirubinRows.push(r);

if(param==="TOTAL BILIRUBIN") tbil=val;
if(param==="DIRECT BILIRUBIN") dbil=val;
if(param==="INDIRECT BILIRUBIN") ibil=val;
}

/* STORE */

if(abnormalFlag){
abnormal.push({param,val,ref});
deselectRow(r);
}

});

/* =========================
🔴 BILIRUBIN RULE
========================= */

if(tbil!=null && dbil!=null){

if(
tbil<0 ||
dbil<0 ||
(ibil!=null && ibil<0) ||
dbil>tbil ||
(ibil!=null && ibil>tbil)
){
bilirubinRows.forEach(r=>deselectPatient(r));
}

}

/* =========================
PANEL
========================= */

let panel=document.createElement("div");
panel.id="lis-panel";

panel.style.position="fixed";
panel.style.right="20px";
panel.style.top="100px";
panel.style.width="350px";
panel.style.maxHeight="400px";
panel.style.background="white";
panel.style.border="2px solid black";
panel.style.zIndex="9999";
panel.style.fontFamily="Arial";
panel.style.display="flex";
panel.style.flexDirection="column";

/* HEADER */
let header=document.createElement("div");
header.style.background="#222";
header.style.color="white";
header.style.padding="5px";
header.innerHTML="Repeat Parameters";

/* BUTTONS */
let btnClose=document.createElement("button");
btnClose.innerText="❌";
btnClose.onclick=()=>panel.remove();

let btnMin=document.createElement("button");
btnMin.innerText="➖";

let body=document.createElement("div");
body.style.overflow="auto";
body.style.maxHeight="300px";

btnMin.onclick=()=>{
body.style.display=body.style.display==="none"?"block":"none";
};

let btnPrint=document.createElement("button");
btnPrint.innerText="🖨";
btnPrint.onclick=()=>window.print();

header.appendChild(btnMin);
header.appendChild(btnPrint);
header.appendChild(btnClose);

/* TABLE */
let table="<table border='1' style='width:100%;border-collapse:collapse'>";
table+="<tr><th>Test</th><th>Value</th><th>Ref</th></tr>";

abnormal.forEach(x=>{
table+=`<tr>
<td>${x.param}</td>
<td>${x.val}</td>
<td>${x.ref[0]}-${x.ref[1]}</td>
</tr>`;
});

table+="</table>";

body.innerHTML=table;

panel.appendChild(header);
panel.appendChild(body);

document.body.appendChild(panel);

console.log("✅ DONE");

})();
