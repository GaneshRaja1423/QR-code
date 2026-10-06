import os
import qrcode
from flask import Flask, request, jsonify, send_file, send_from_directory, url_for
from flask_cors import CORS
from io import BytesIO
import base64
from werkzeug.utils import secure_filename
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication

# Create directory for storing QR codes and uploaded files
BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
QR_DIR = os.path.join(BASE_DIR, 'qr_codes')
UPLOAD_DIR = os.path.join(BASE_DIR, 'multimedia')

os.makedirs(QR_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_qr_code(url, filename=None, fill_color="black", back_color="white"):
    """Generate QR code and return file path"""
    try:
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Add data
        qr.add_data(url)
        qr.make(fit=True)
        
        # Generate filename if not provided
        if not filename:
            filename = f"qr_{abs(hash(url)) % 10000}.png"
        elif not filename.endswith('.png'):
            filename = f"{filename}.png"
        
        # Create and save image
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        filepath = os.path.join(QR_DIR, filename)
        img.save(filepath)
        
        return filepath, None
    except Exception as e:
        return None, str(e)

@app.route('/api/generate-qr', methods=['POST'])
def generate_qr():
    """API endpoint to generate QR code"""
    try:
        data = request.json
        url = data.get('url')
        filename = data.get('filename')
        fill_color = data.get('fill_color', 'black')
        back_color = data.get('back_color', 'white')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        filepath, error = generate_qr_code(url, filename, fill_color, back_color)
        
        if error:
            return jsonify({'error': error}), 500
        
        # Read the generated file
        with open(filepath, 'rb') as f:
            qr_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Return both file path and base64 data
        return jsonify({
            'success': True,
            'filename': os.path.basename(filepath),
            'filepath': filepath,
            'qr_data': f"data:image/png;base64,{qr_data}",
            'url': url
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Endpoint to upload multimedia files"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        filename = secure_filename(file.filename)
        # Add timestamp to avoid filename collisions
        import time
        filename = f"{int(time.time())}_{filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        file.save(filepath)
        
        # Generate static URL for the file
        file_url = f"{request.host_url}api/files/{filename}"
        
        return jsonify({
            'success': True,
            'url': file_url,
            'filename': filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<filename>')
def serve_file(filename):
    """Serve uploaded multimedia files"""
    try:
        filepath = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        return send_file(filepath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/decode-qr', methods=['POST'])
def decode_qr():
    """Endpoint to decode uploaded QR code image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        
        img_bytes = file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image file'}), 400
            
        detector = cv2.QRCodeDetector()
        data, bbox, straight_qrcode = detector.detectAndDecode(img)
        
        if data:
            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({'error': 'Could not decode QR code. Please ensure the QR code is clear and well-lit.'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/qr-codes', methods=['GET'])
def list_qr_codes():
    """List all generated QR codes"""
    try:
        qr_files = []
        for file in os.listdir(QR_DIR):
            if file.endswith('.png'):
                filepath = os.path.join(QR_DIR, file)
                qr_files.append({
                    'filename': file,
                    'filepath': filepath,
                    'url': f"/api/qr-codes/{file}"
                })
        return jsonify({'qr_codes': qr_files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/qr-codes/<filename>', methods=['GET'])
def get_qr_code(filename):
    """Serve QR code file"""
    try:
        filepath = os.path.join(QR_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        return send_file(filepath, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

@app.route('/')
def serve_index():
    """Serve frontend index.html"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve frontend static assets"""
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
