# Multimedia QR Code Generator

A full-stack web application to generate QR codes for multimedia URLs.

## Features
- Generate QR codes for any URL (videos, audio, images, documents)
- Customize QR code colors and filenames
- Download generated QR codes as PNG
- Responsive design for mobile and desktop
- Real-time backend status monitoring

## Project Structure
```
QR-code/
├── backend/
│   ├── app.py             # Flask application & API routes
│   ├── requirements.txt   # Python dependencies
│   ├── qr_codes/          # Stored generated QR codes
│   └── multimedia/        # Stored uploaded files
├── frontend/
│   ├── index.html         # Main user interface
│   ├── style.css          # UI styles & responsive layout
│   └── script.js          # Client-side API interactions
└── readme.md
```

## How to Run

1. **Install Dependencies** (if needed):
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Start the Application**:
   ```bash
   cd backend
   python app.py
   ```

3. **Open in Browser**:
   Navigate to [http://localhost:5000](http://localhost:5000) to access the complete application (both Generator and Scanner).