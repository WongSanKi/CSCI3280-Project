class VoiceAssistant {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.conversation = [];
        
        this.initElements();
        this.initEventListeners();
        this.updateUI();
    }

    initElements() {
        this.recordBtn = document.getElementById('record-btn');
        this.statusEl = document.getElementById('status');
        this.conversationEl = document.getElementById('conversation');
    }

    initEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r') {
                this.toggleRecording();
            }
        });
    }

    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            this.statusEl.textContent = "Recording... (Press R to stop)";
            this.recordBtn.textContent = "Stop Recording (Press R)";
            this.isRecording = true;
            this.audioChunks = [];
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.processRecording(audioBlob);
            };
            
            this.mediaRecorder.start();
        } catch (error) {
            console.error("Recording error:", error);
            this.addMessage('system', `Error: ${error.message}`);
            this.resetRecording();
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.statusEl.textContent = "Processing...";
            this.recordBtn.disabled = true;
        }
    }

    async processRecording(audioBlob) {
        try {
            // Convert Blob to File
            const audioFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
            
            // Create FormData and send to server
            const formData = new FormData();
            formData.append('audio', audioFile);
            
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Server error');
            
            const data = await response.json();
            
            // Add messages to conversation
            this.addMessage('user', data.transcription);
            this.addMessage('assistant', data.ai_response);
            
        } catch (error) {
            console.error("Processing error:", error);
            this.addMessage('system', `Error: ${error.message}`);
        } finally {
            this.resetRecording();
        }
    }

    resetRecording() {
        this.isRecording = false;
        this.recordBtn.textContent = "Start Recording (Press R)";
        this.recordBtn.disabled = false;
        this.statusEl.textContent = "Ready";
    }

    addMessage(role, content) {
        const timestamp = new Date().toLocaleTimeString();
        this.conversation.push({ role, content, timestamp });
        this.updateUI();
    }

    updateUI() {
        this.conversationEl.innerHTML = '';
        this.conversation.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role}-message`;
            
            const timestamp = document.createElement('div');
            timestamp.className = 'timestamp';
            timestamp.textContent = msg.timestamp;
            
            const content = document.createElement('div');
            content.innerHTML = `<strong>${msg.role === 'user' ? 'You' : 'AI'}:</strong> ${msg.content}`;
            
            messageDiv.appendChild(timestamp);
            messageDiv.appendChild(content);
            this.conversationEl.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        this.conversationEl.scrollTop = this.conversationEl.scrollHeight;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistant();
});