const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const startBtn = document.getElementById("startCamera");
const captureBtn = document.getElementById("capture");
const downloadBtn = document.getElementById("download");

let latitude = "";
let longitude = "";

navigator.geolocation.getCurrentPosition(function(position){

latitude = position.coords.latitude.toFixed(6);
longitude = position.coords.longitude.toFixed(6);

});

startBtn.onclick = async function(){

const stream = await navigator.mediaDevices.getUserMedia({
video:true
});

video.srcObject = stream;

};

captureBtn.onclick = function(){

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

const ctx = canvas.getContext("2d");

ctx.drawImage(video,0,0);

let device = navigator.userAgent;

let now = new Date();

let date = now.toISOString().split("T")[0];

let time =
String(now.getHours()).padStart(2,"0")+":"
+String(now.getMinutes()).padStart(2,"0")+":"
+String(now.getSeconds()).padStart(2,"0");

ctx.fillStyle="yellow";
ctx.font="18px Arial";

let startY = canvas.height - 120;

ctx.fillText("Device: "+device,20,startY);
ctx.fillText("Date: "+date,20,startY+25);
ctx.fillText("Time: "+time,20,startY+50);
ctx.fillText("Latitude: "+latitude,20,startY+75);
ctx.fillText("Longitude: "+longitude,20,startY+100);

canvas.style.display="block";

};

downloadBtn.onclick = function(){

let link = document.createElement("a");
link.download = "geo-photo.png";
link.href = canvas.toDataURL();
link.click();

};
