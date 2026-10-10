const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const startBtn = document.getElementById("startCamera");
const initialStartBtn = document.getElementById("initialStartBtn");
const captureBtn = document.getElementById("capture");
const downloadBtn = document.getElementById("download");
const overlay = document.getElementById("camera-overlay");
const gpsStatus = document.getElementById("gps-status");
const switchBtn = document.getElementById("switchCamera");
const cameraPlaceholder = document.getElementById("camera-placeholder");

const locationNameDisplay = document.getElementById("location-name-display");
const coordinatesDisplay = document.getElementById("coordinates-display");
const permissionBanner = document.getElementById("permission-banner");
const requestPermissionBtn = document.getElementById("requestPermissionBtn");
const permissionTitle = document.getElementById("permission-title");
const permissionDesc = document.getElementById("permission-desc");

let currentFacingMode = 'environment';
let latitude = null;
let longitude = null;
let locationName = "Fetching location...";

// Reverse Geocode to convert Lat & Lon to human-readable Location Name
async function reverseGeocode(lat, lon) {
    try {
        // Free BigDataCloud client reverse geocoding
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(bdcUrl);
        if (res.ok) {
            const data = await res.json();
            const city = data.city || data.locality || data.principalSubdivision || "";
            const country = data.countryName || "";
            if (city || country) {
                locationName = [city, country].filter(Boolean).join(", ");
                updateLocationHeader();
                return;
            }
        }
    } catch (err) {
        console.warn("Primary reverse geocode failed, trying backup API...", err);
    }

    try {
        // Backup OpenStreetMap Nominatim API
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
        const res = await fetch(osmUrl);
        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || "";
            const country = addr.country || "";
            locationName = [city, country].filter(Boolean).join(", ") || data.display_name.split(',').slice(0, 2).join(',');
            updateLocationHeader();
            return;
        }
    } catch (err) {
        console.warn("Secondary reverse geocode failed:", err);
    }

    // Fallback if reverse geocoding API is unreachable
    locationName = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    updateLocationHeader();
}

function updateLocationHeader() {
    if (locationNameDisplay) {
        locationNameDisplay.textContent = locationName;
    }
    if (coordinatesDisplay && latitude !== null && longitude !== null) {
        coordinatesDisplay.textContent = `Lat: ${latitude.toFixed(5)} | Lon: ${longitude.toFixed(5)}`;
    }
    if (gpsStatus) {
        gpsStatus.textContent = locationName !== "Fetching location..." ? locationName : `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
}

function requestLocationPermission() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                updateLocationHeader();
                reverseGeocode(latitude, longitude);
            },
            function(error) {
                console.warn("Geolocation Permission Error:", error.message);
                locationName = "Location Access Denied";
                if (locationNameDisplay) locationNameDisplay.textContent = "Location Permission Denied";
                if (gpsStatus) gpsStatus.textContent = "GPS Unavailable";
                showPermissionBanner(
                    "Location Access Denied", 
                    "Please allow location access in your browser settings so the location name can be displayed at the top."
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        locationName = "Geolocation Unsupported";
        if (locationNameDisplay) locationNameDisplay.textContent = "GPS Not Supported";
    }
}

function showPermissionBanner(title, desc) {
    if (permissionBanner) {
        permissionBanner.classList.remove("hidden");
        if (permissionTitle) permissionTitle.textContent = title;
        if (permissionDesc) permissionDesc.textContent = desc;
    }
}

function hidePermissionBanner() {
    if (permissionBanner) {
        permissionBanner.classList.add("hidden");
    }
}

function getDeviceName() {
    let ua = navigator.userAgent;
    if (ua.includes("Android")) return "Android Device";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("iPad")) return "iPad";
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("Mac")) return "Mac Device";
    if (ua.includes("Linux")) return "Linux Device";
    return "Camera Device";
}

async function startVideoStream() {
    hidePermissionBanner();
    try {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: currentFacingMode } }
            });
        } catch(e) {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode }
            });
        }
        
        video.srcObject = stream;
        
        if (currentFacingMode === 'user') {
            video.style.transform = 'scaleX(-1)';
        } else {
            video.style.transform = 'scaleX(1)';
        }
        
        await video.play();

        // Reveal Camera Preview (~80% height) & update controls
        if (cameraPlaceholder) cameraPlaceholder.classList.add("hidden");
        if (startBtn) startBtn.classList.add("hidden");
        if (initialStartBtn) initialStartBtn.classList.add("hidden");
        if (captureBtn) captureBtn.classList.remove("hidden");
        if (switchBtn) switchBtn.classList.remove("hidden");
        if (overlay) overlay.classList.remove("hidden");
        if (canvas) canvas.classList.add("hidden");
        if (video) video.classList.remove("hidden");
        if (downloadBtn) downloadBtn.classList.add("hidden");

        requestLocationPermission();
    } catch(err) {
        console.error("Camera Access Denied/Error:", err);
        showPermissionBanner(
            "Camera Permission Required", 
            "Camera access was denied by your browser. Please click the lock/camera icon in your address bar to grant permission."
        );
        alert("Camera permission denied. Please allow camera access in browser settings.");
    }
}

async function handleStartCamera() {
    requestLocationPermission();
    await startVideoStream();
}

if (initialStartBtn) initialStartBtn.onclick = handleStartCamera;
if (startBtn) startBtn.onclick = handleStartCamera;
if (requestPermissionBtn) requestPermissionBtn.onclick = handleStartCamera;

if (switchBtn) {
    switchBtn.onclick = async function() {
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        await startVideoStream();
    };
}

captureBtn.onclick = function() {
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    
    // Mirror snapshot if front camera
    if (currentFacingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let device = getDeviceName();
    let now = new Date();
    let dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    let timeStr = now.toLocaleTimeString();

    // Draw Location & Geo Tag overlay box on captured image
    let pad = 20;
    let boxWidth = canvas.width - (pad * 2);
    let boxHeight = 150;
    let startY = canvas.height - boxHeight - pad;
    
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(pad, startY, boxWidth, boxHeight, 14);
        ctx.fill();
    } else {
        ctx.fillRect(pad, startY, boxWidth, boxHeight);
    }

    // Top Header text in snapshot overlay
    ctx.fillStyle = "#6366f1";
    ctx.font = "bold 22px 'Inter', Arial, sans-serif";
    ctx.fillText(`📍 ${locationName !== 'Fetching location...' ? locationName : 'Geo Tagged Photo'}`, pad + 20, startY + 35);
    
    // Subtext details
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px 'Inter', Arial, sans-serif";
    ctx.fillText(`Device: ${device}`, pad + 20, startY + 68);
    ctx.fillText(`Date: ${dateStr}  |  Time: ${timeStr}`, pad + 20, startY + 95);
    
    let latTxt = latitude !== null ? latitude.toFixed(6) : "N/A";
    let lonTxt = longitude !== null ? longitude.toFixed(6) : "N/A";
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 16px 'Inter', Arial, sans-serif";
    ctx.fillText(`Coordinates: ${latTxt}, ${lonTxt}`, pad + 20, startY + 122);

    // Switch view to snapshot
    video.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
    canvas.classList.remove("hidden");
    captureBtn.classList.add("hidden");
    if (switchBtn) switchBtn.classList.add("hidden");
    downloadBtn.classList.remove("hidden");
    startBtn.classList.remove("hidden");
    startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retake Photo';
};

downloadBtn.onclick = function() {
    try {
        let link = document.createElement("a");
        link.download = `GeoCam_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch(err) {
        console.error("Save photo failed:", err);
        alert("Failed to save photo automatically. You can right-click or long-press the canvas to save.");
    }
};

// Request location on load to populate top location bar immediately
window.addEventListener("DOMContentLoaded", () => {
    requestLocationPermission();
});
