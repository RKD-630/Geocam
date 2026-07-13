const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const startBtn = document.getElementById("startCamera");
const captureBtn = document.getElementById("capture");
const downloadBtn = document.getElementById("download");
const overlay = document.getElementById("camera-overlay");
const gpsStatus = document.getElementById("gps-status");
const videoContainer = document.querySelector(".video-container");
const switchBtn = document.getElementById("switchCamera");

let currentFacingMode = 'environment';

let latitude = "Detecting...";
let longitude = "Detecting...";

function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position){
                latitude = position.coords.latitude.toFixed(6);
                longitude = position.coords.longitude.toFixed(6);
                if(gpsStatus) gpsStatus.innerHTML = `GPS: ${latitude}, ${longitude}`;
            }, 
            function(error) {
                latitude = "Unavailable";
                longitude = "Unavailable";
                if(gpsStatus) gpsStatus.innerHTML = `GPS Error: ${error.message}`;
            },
            { enableHighAccuracy: true }
        );
    } else {
        latitude = "Unsupported";
        longitude = "Unsupported";
        if(gpsStatus) gpsStatus.innerHTML = `GPS Unsupported`;
    }
}

// Format Device name from User-Agent
function getDeviceName() {
    let ua = navigator.userAgent;
    if(ua.includes("Android")) return "Android Device";
    if(ua.includes("iPhone")) return "iPhone";
    if(ua.includes("iPad")) return "iPad";
    if(ua.includes("Windows")) return "Windows PC";
    if(ua.includes("Mac")) return "Mac";
    if(ua.includes("Linux")) return "Linux Device";
    return "Unknown Device";
}

async function startVideoStream() {
    try {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode }
        });
        video.srcObject = stream;
        await video.play();
    } catch(err) {
        console.error("Camera Error:", err);
        alert("Camera access denied or unavailable.");
    }
}

startBtn.onclick = async function(){
    requestLocation();
    
    if (video.srcObject && video.srcObject.active) {
        // Stream already active, just switch UI back to camera mode
        startBtn.classList.add("hidden");
        captureBtn.classList.remove("hidden");
        if(switchBtn) switchBtn.classList.remove("hidden");
        overlay.classList.remove("hidden");
        canvas.classList.add("hidden");
        videoContainer.classList.remove("hidden");
        downloadBtn.classList.add("hidden");
        return;
    }

    await startVideoStream();
    
    // Update UI
    startBtn.classList.add("hidden");
    captureBtn.classList.remove("hidden");
    if(switchBtn) switchBtn.classList.remove("hidden");
    overlay.classList.remove("hidden");
    canvas.classList.add("hidden");
    videoContainer.classList.remove("hidden");
    downloadBtn.classList.add("hidden");
};

if(switchBtn) {
    switchBtn.onclick = async function() {
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        await startVideoStream();
    };
}

captureBtn.onclick = async function(){
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    
    // Draw Video Frame
    ctx.drawImage(video,0,0, canvas.width, canvas.height);

    let device = getDeviceName();
    let now = new Date();
    
    let date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    let time = now.toLocaleTimeString();

    // Draw overlay background for text
    let pad = 20;
    let boxWidth = canvas.width - (pad * 2);
    let boxHeight = 150;
    let startY = canvas.height - boxHeight - pad;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    if(ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(pad, startY, boxWidth, boxHeight, 10);
        ctx.fill();
    } else {
        ctx.fillRect(pad, startY, boxWidth, boxHeight);
    }

    // Draw text
    ctx.fillStyle = "#10b981"; // Success green for coordinates
    ctx.font = "bold 20px 'Inter', Arial";
    ctx.fillText("📍 GeoTag Info", pad + 15, startY + 30);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px 'Inter', Arial";
    
    ctx.fillText(`Device: ${device}`, pad + 15, startY + 60);
    ctx.fillText(`Date: ${date}`, pad + 15, startY + 85);
    ctx.fillText(`Time: ${time}`, pad + 15, startY + 110);
    ctx.fillText(`Lat: ${latitude} | Lon: ${longitude}`, pad + 15, startY + 135);

    // Switch UI immediately so user sees photo instantly
    videoContainer.classList.add("hidden");
    canvas.classList.remove("hidden");
    captureBtn.classList.add("hidden");
    if(switchBtn) switchBtn.classList.add("hidden");
    downloadBtn.classList.remove("hidden");
    startBtn.classList.remove("hidden");
    startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retake Photo';

    // Draw Map if coordinates are valid
    let latNum = parseFloat(latitude);
    let lonNum = parseFloat(longitude);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
        // Place the map on the right side of the overlay box
        let mapSize = 110;
        let mapX = pad + boxWidth - mapSize - 20;
        let mapY = startY + 20;
        
        let qrSize = 110;
        let qrX = mapX - qrSize - 20;
        let qrY = startY + 20;
        
        let mapPromise = (async () => {
            try {
                await drawOSMMap(ctx, latNum, lonNum, mapX, mapY, mapSize, mapSize, 14);
            } catch(e) {
                console.error("Failed to draw map", e);
            }
        })();
        
        let qrPromise = (async () => {
            try {
                let locationUrl = `https://maps.google.com/?q=${latNum},${lonNum}`;
                let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(locationUrl)}`;
                let img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = qrUrl;
                });
                
                ctx.save();
                ctx.fillStyle = "#ffffff";
                if(ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8);
                    ctx.fill();
                } else {
                    ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
                }
                ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                ctx.restore();
            } catch(e) {
                console.error("Failed to draw QR code", e);
            }
        })();

        await Promise.all([mapPromise, qrPromise]);
    }
};

async function drawOSMMap(ctx, lat, lon, destX, destY, destW, destH, zoom = 15) {
    let px = ((lon + 180) / 360) * Math.pow(2, zoom) * 256;
    let latRad = (lat * Math.PI) / 180;
    let py = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256;
    
    let viewX = px - destW / 2;
    let viewY = py - destH / 2;
    
    let minTileX = Math.floor(viewX / 256);
    let maxTileX = Math.floor((viewX + destW) / 256);
    let minTileY = Math.floor(viewY / 256);
    let maxTileY = Math.floor((viewY + destH) / 256);
    
    let promises = [];
    for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            promises.push(new Promise((resolve) => {
                let img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve({img, tx, ty});
                img.onerror = () => resolve(null);
                img.src = `https://a.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
            }));
        }
    }
    
    let tiles = await Promise.all(promises);
    
    ctx.save();
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(destX, destY, destW, destH, 8);
    else ctx.rect(destX, destY, destW, destH);
    ctx.clip();
    
    // Fill background in case tile is missing
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
    
    for (let tile of tiles) {
        if (!tile) continue;
        let drawX = destX + (tile.tx * 256 - viewX);
        let drawY = destY + (tile.ty * 256 - viewY);
        ctx.drawImage(tile.img, drawX, drawY, 256, 256);
    }
    
    // Draw center marker
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(destX + destW / 2, destY + destH / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    
    ctx.restore();
}

downloadBtn.onclick = function(){
    try {
        let link = document.createElement("a");
        link.download = "geo-photo.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch(err) {
        console.error(err);
        alert("Security Error: The browser blocked saving the image due to Cross-Origin restrictions on the map tiles. Try right-clicking or long-pressing the photo to save it instead.");
    }
};
