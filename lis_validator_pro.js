(function(){

console.log("LIS Validator Pro Started");

const REF={

"SODIUM":{low:135,high:145},
"POTASSIUM":{low:3.5,high:5},
"CHLORIDE":{low:98,high:107},
"URIC ACID":{low:3.4,high:7},
"CREATININE":{low:0.6,high:1.3},
"UREA":{low:15,high:40},
"TOTAL CALCIUM":{low:9,high:11},
"PHOSPHATE":{low:2.5,high:4.5},
"MAGNESIUM":{low:1.7,high:2.2},
"AST":{low:10,high:40},
"ALT":{low:7,high:56},
"TOTAL BILIRUBIN":{low:0.3,high:1.2},
"DIRECT BILIRUBIN":{low:0.1,high:0.3},
"INDIRECT BILIRUBIN":{low:0.2,high:0.9},
"TOTAL PROTEIN":{low:6.7,high:8.6},
"ALBUMIN":{low:3.5,high:5},
"HBA1C":{low:4,high:5.6},
"VITAMIN D":{low:30,high:100},
"VITAMIN B12":{low:200,high:900},
"FERRITIN":{low:20,high:300},
"PROLACTIN":{low:4,high:23},
"PROCALCITONIN":{low:0,high:0.5},
"BETA HCG":{low:0,high:5}

};

function extractNumber(text){

let m=text.match(/-?\d+(\.\d+)?/);

return m?parseFloat(m[0]):null;

}

let repeat=[];

let rows=document.querySelectorAll("table tbody tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<2) return;

let param=cells[0].innerText.trim().toUpperCase();

let value=extractNumber(cells[1].innerText);

if(!REF[param]) return;

let ref=REF[param];

if(value<ref.low||value>ref.high){

row.style.background="#ffb347";

repeat.push(param+" : "+value+" (Ref "+ref.low+"-"+ref.high+")");

let node=row;

while(node&&!/\d{15}/.test(node.innerText)){
node=node.parentElement;
}

if(node){

let patientRow=node.closest("tr");

let checkbox=patientRow.querySelector("input[type='checkbox']");

if(checkbox&&checkbox.checked){

checkbox.dispatchEvent(new MouseEvent("click",{bubbles:true}));

}

}

}

});

createPanel(repeat);

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

panel.innerHTML="<b>Repeat Parameters</b><hr>";

list.forEach(i=>{

panel.innerHTML+=i+"<br>";

});

document.body.appendChild(panel);

}

})();
