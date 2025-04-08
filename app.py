from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
from pathlib import Path
from openai import OpenAI
import whisper
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
if not load_dotenv(".env"):
    load_dotenv("Deepseek_api_key.env")

api_key = os.getenv('DEEPSEEK_API_KEY')
if not api_key:
    raise ValueError(
        "DEEPSEEK_API_KEY Not Work!\n"
    )

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize models
whisper_model = whisper.load_model("base")
deepseek_client = OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com/v1"
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file"}), 400
            
        audio_file = request.files['audio']
        filename = f"recording_{int(time.time())}.wav"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        audio_file.save(filepath)
        
        # Transcribe using Whisper
        result = whisper_model.transcribe(filepath)
        transcription = result["text"]
        logger.info(f"Transcription: {transcription}")
        
        # Get AI response
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": transcription}
            ],
            temperature=0.7
        )
        ai_response = response.choices[0].message.content
        logger.info(f"AI Response: {ai_response}")
        
        return jsonify({
            "transcription": transcription,
            "ai_response": ai_response
        })
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)