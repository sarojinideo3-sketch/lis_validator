(function(){

console.log("AIIMS LIS Validator Started");

function getNumber(text){
let m=text.match(/-?\d+(\.\d+)?/);
return m?parseFloat(m[0]):null;
}

function getRange(text){
let nums=text.match(/-?\d+(\.\d+)?/g);
if(!nums||nums.length<2)return null;
return{
low:parseFloat(nums[0]),
high:parseFloat(nums[1])
};
}

let repeat=[];
let rows=document.querySelectorAll("table tbody tr");

rows.forEach(row=>{

let cells=row.querySelectorAll("td");

if(cells.length<3)return;

let parameter=cells[0].innerText.trim();
let value=getNumber(cells[1].innerText);
let range=getRange(cells[2].innerText);

if(value===null||!range)return;

let abnormal=false;

if(value<range.low){

row.style.background="#ffd6d6";
abnormal=true;

}

if(value>range.high){

row.style.background="#ffb347";
abnormal=true;

}

if(value<0){

row.style.background="#001f4d";
row.style.color="white";
abnormal=true;

}

if(abnormal){

repeat.push(parameter+" : "+value+" (Ref "+range.low+"-"+range.high+")");

let node=row;

while(node&&!/\d{15}/.test(node.innerText)){
node=node.parentElement;
}

if(node){

let patientRow=node.closest("tr");

if(patientRow){

let checkbox=patientRow.querySelector("input[type='checkbox']");

if(checkbox&&checkbox.checked){

checkbox.dispatchEvent(new MouseEvent("click",{bubbles:true}));

}

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
panel.style.fontSize="13px";
panel.style.maxHeight="420px";
panel.style.overflow="auto";

panel.innerHTML="<b>Repeat Parameters</b><hr>";

if(list.length===0){

panel.innerHTML+="No abnormal values";

}else{

list.forEach(i=>{

panel.innerHTML+=i+"<br>";

});

}

document.body.appendChild(panel);

}

})();
