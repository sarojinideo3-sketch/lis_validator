(function(){

console.log("LIS Validator Pro Running");

function getNumber(text){
let m=text.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

function scanRows(){

let rows=document.querySelectorAll("tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<3) return;

let param=cells[0].innerText.trim().toUpperCase();

let value=getNumber(cells[1].innerText);

let rangeText=cells[2].innerText;

if(!rangeText.includes("-")) return;

let range=rangeText.match(/-?\d+(\.\d+)?/g);

if(!range || range.length<2) return;

let low=parseFloat(range[0]);
let high=parseFloat(range[1]);

if(value===null) return;

if(value<low || value>high){

row.style.background="#ffb347";

let node=row;

while(node && !/\d{15}/.test(node.innerText)){
node=node.previousElementSibling || node.parentElement;
}

if(node){

let checkbox=node.querySelector("input[type='checkbox']");

if(checkbox && checkbox.checked){

checkbox.click();

console.log("Deselected CR:",node.innerText.match(/\d{15}/)[0]);

}

}

}

});

}

scanRows();

})();
