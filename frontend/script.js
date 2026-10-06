// Backend API URL
const BACKEND_URL = 'http://localhost:5000';

// DOM Elements
const urlInput = document.getElementById('urlInput');
const filenameInput = document.getElementById('filenameInput');
const colorScheme = document.getElementById('colorScheme');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');
const qrImage = document.getElementById('qrImage');
const qrUrl = document.getElementById('qrUrl');
const downloadBtn = document.getElementById('downloadBtn');
const newQrBtn = document.getElementById('newQrBtn');
const backendStatus = document.getElementById('backendStatus');

// Multimedia Upload Elements
const mediaUpload = document.getElementById('mediaUpload');
const fileNameDisplay = document.getElementById('fileNameDisplay');

// Tabs Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Scan Elements
const qrUpload = document.getElementById('qrUpload');
const qrFileNameDisplay = document.getElementById('qrFileNameDisplay');
const scanBtn = document.getElementById('scanBtn');
const scanLoading = document.getElementById('scanLoading');
const scanResult = document.getElementById('scanResult');
const decodedData = document.getElementById('decodedData');
const decodedActions = document.getElementById('decodedActions');
const visitUrlBtn = document.getElementById('visitUrlBtn');
const copyTextBtn = document.getElementById('copyTextBtn');

// Color schemes mapping
const colorSchemes = {
    'black_white': { fill: 'black', back: 'white' },
    'blue_white': { fill: '#3498db', back: 'white' },
    'red_white': { fill: '#e74c3c', back: 'white' },
    'green_white': { fill: '#2ecc71', back: 'white' },
    'white_black': { fill: 'white', back: 'black' }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    initTabs();
    initFileUploads();
});

// --- Tab Switching ---
function initTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}Tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// --- File Upload Logic ---
function initFileUploads() {
    mediaUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = `Selected: ${e.target.files[0].name}`;
            urlInput.value = ''; // Clear URL input if file is selected
            urlInput.disabled = true;
            urlInput.placeholder = "File selected. Clear selection to use URL.";
        }
    });

    qrUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            qrFileNameDisplay.textContent = `Selected: ${e.target.files[0].name}`;
            scanResult.style.display = 'none';
        }
    });
}

// --- Backend Status ---
async function checkBackendStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) {
            backendStatus.textContent = 'Connected ✓';
            backendStatus.style.color = '#2ecc71';
            backendStatus.style.background = '#d5f4e6';
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        backendStatus.textContent = 'Disconnected ✗';
        backendStatus.style.color = '#e74c3c';
        backendStatus.style.background = '#fadbd8';
        console.error('Backend connection failed:', error);
    }
}

// --- Generate QR Code ---
async function handleGenerate() {
    const url = urlInput.value.trim();
    const file = mediaUpload.files[0];
    const filename = filenameInput.value.trim() || null;
    const colors = colorSchemes[colorScheme.value];

    if (!url && !file) {
        alert('Please enter a URL or upload a multimedia file');
        return;
    }

    loading.style.display = 'block';
    resultSection.style.display = 'none';

    try {
        let finalUrl = url;

        // If file is selected, upload it first
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
            finalUrl = uploadData.url;
        }

        // Generate QR Code for the URL (either entered or uploaded)
        const response = await fetch(`${BACKEND_URL}/api/generate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: finalUrl,
                filename: filename,
                fill_color: colors.fill,
                back_color: colors.back
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Generation failed');

        displayQRCode(data);
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

function displayQRCode(data) {
    qrImage.src = data.qr_data;
    qrUrl.textContent = data.url;
    downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = data.qr_data;
        link.download = data.filename;
        link.click();
    };
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// --- Scan QR Code ---
async function handleScan() {
    const file = qrUpload.files[0];
    if (!file) {
        alert('Please select a QR code image to scan');
        return;
    }

    scanLoading.style.display = 'block';
    scanResult.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BACKEND_URL}/api/decode-qr`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Scan failed');

        decodedData.textContent = data.data;

        // Check if decoded data is a URL
        if (isValidUrl(data.data)) {
            decodedActions.style.display = 'flex';
            visitUrlBtn.href = data.data;
        } else {
            decodedActions.style.display = 'none';
        }

        scanResult.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        scanLoading.style.display = 'none';
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// --- Event Listeners ---
generateBtn.addEventListener('click', handleGenerate);
scanBtn.addEventListener('click', handleScan);
newQrBtn.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.disabled = false;
    urlInput.placeholder = "https://example.com/your-video.mp4";
    mediaUpload.value = '';
    fileNameDisplay.textContent = '';
    filenameInput.value = '';
    resultSection.style.display = 'none';
});

copyTextBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(decodedData.textContent);
    alert('Copied to clipboard!');
});