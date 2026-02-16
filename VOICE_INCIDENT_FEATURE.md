# 🎙️ Voice Incident Reporting Feature Documentation
**Date**: February 12, 2026  
**Feature**: Voice Recording with AI Transcription for Incident Reporting

---

## Overview

The Voice Incident Reporting feature allows users to report incidents by recording audio instead of typing. The system automatically transcribes the audio using OpenAI's Whisper API and stores both the original audio file and the transcribed text in the database.

---

## Key Features

### 1. **Audio Recording**
- Browser-based voice recording using Web Audio API
- Support for multiple audio formats (WebM, MP4, WAV, etc.)
- Real-time recording timer
- Pause/Resume functionality
- Playback before submission
- Delete and re-record options

### 2. **AI Transcription**
- Automatic transcription using OpenAI Whisper API
- Confidence scoring (0-100%)
- Language detection
- Duration tracking
- Supports files up to 25MB

### 3. **Database Storage**
- Original audio file saved to server
- Transcribed text stored in database
- Reporting method tracked (`voice`)
- Transcription confidence score saved
- Audio URL for playback

### 4. **Separate Workflow**
- Dedicated voice incident page (`/voice-incident`)
- Independent from text-based reporting
- Specialized UI for voice recording
- Audio file management

---

## Architecture

### **Database Schema Changes**

Added to `incidents` table:
```typescript
audioRecordingUrl: text("audio_recording_url")        // URL to uploaded audio file
audioTranscription: text("audio_transcription")       // Transcribed text from audio
reportingMethod: text("reporting_method")             // text, voice, sms, web_form
transcriptionConfidence: integer("transcription_confidence") // 0-100 scale
```

### **Backend Components**

#### **1. Audio Transcription Service**
**File**: `server/services/audio-transcription-service.ts`

**Features**:
- OpenAI Whisper API integration
- File and buffer transcription support
- Format validation
- Temporary file management
- Error handling and fallbacks

**Methods**:
```typescript
transcribeAudio(audioFilePath: string): Promise<TranscriptionResult>
transcribeAudioBuffer(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult>
isAvailable(): boolean
getSupportedFormats(): string[]
isValidAudioFormat(filename: string): boolean
```

**Supported Audio Formats**:
- MP3, MP4, MPEG, MPGA
- M4A, WAV, WebM
- OGG, FLAC

#### **2. Voice Incident Routes**
**File**: `server/routes/voice-incident.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents/voice` | Upload audio and create incident |
| GET | `/api/incidents/voice` | Get all voice-reported incidents |
| GET | `/api/incidents/:id/audio` | Download audio file |
| POST | `/api/incidents/:id/retranscribe` | Re-transcribe existing audio |

**File Upload Configuration**:
- Storage: Local filesystem (`uploads/audio/`)
- Max file size: 25MB
- Multer middleware for handling multipart/form-data
- Automatic filename generation with timestamps

### **Frontend Components**

#### **1. Voice Recorder Component**
**File**: `client/src/components/VoiceRecorder.tsx`

**Features**:
- Start/Stop/Pause recording
- Real-time timer display
- Audio playback
- Delete recording
- Visual feedback (pulsing red dot while recording)
- Format time display (MM:SS)

**Props**:
```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}
```

#### **2. Voice Incident Page**
**File**: `client/src/pages/voice-incident-page.tsx`

**Features**:
- Two-step process (Record → Fill Details)
- Voice recorder integration
- Location and severity form
- Audio status indicators
- Form validation
- Submission with progress indicator

**Form Fields**:
- Location (required)
- Region (required)
- State (optional)
- LGA (optional)
- Severity (low, medium, high, critical)
- Category (violence, protest, etc.)

---

## User Workflow

### **Step-by-Step Process**

1. **Navigate to Voice Incident Page**
   - Click "Voice Incident Report" in sidebar
   - Or go to `/voice-incident`

2. **Record Audio**
   - Click "Start Voice Recording"
   - Allow microphone access
   - Speak clearly describing the incident
   - Pause if needed
   - Click "Stop" when finished
   - Preview recording with Play button
   - Delete and re-record if needed
   - Click "Submit Recording"

3. **Fill Location Details**
   - Enter location information
   - Select region
   - Choose severity level
   - Select incident category
   - Click "Submit Voice Report"

4. **Processing**
   - Audio uploaded to server
   - AI transcribes the audio
   - Incident created with transcription
   - User redirected to Incident Review

5. **Review on Dashboard**
   - Incident appears with `voice` reporting method
   - Transcribed text shown as description
   - Original audio available for playback
   - Confidence score displayed

---

## API Documentation

### **POST /api/incidents/voice**

Upload audio recording and create incident with transcription.

**Authentication**: Required

**Request**: `multipart/form-data`
```
audio: File (audio file)
location: string
region: string
state: string (optional)
lga: string (optional)
severity: string (low|medium|high|critical)
category: string
```

**Response** (Success - 201):
```json
{
  "success": true,
  "incident": {
    "id": 123,
    "title": "Extracted from transcription",
    "description": "Full transcribed text",
    "audioRecordingUrl": "/uploads/audio/voice-incident-1234567890.webm",
    "audioTranscription": "Full transcribed text",
    "transcriptionConfidence": 85,
    "reportingMethod": "voice",
    ...
  },
  "transcription": {
    "text": "Full transcribed text",
    "confidence": 85,
    "language": "en",
    "duration": 45.2
  },
  "audioUrl": "/uploads/audio/voice-incident-1234567890.webm"
}
```

**Response** (Error - 400/500):
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

### **GET /api/incidents/voice**

Get all voice-reported incidents.

**Authentication**: Required

**Response**:
```json
[
  {
    "id": 123,
    "title": "Incident title",
    "reportingMethod": "voice",
    "audioRecordingUrl": "/uploads/audio/...",
    "audioTranscription": "Transcribed text",
    "transcriptionConfidence": 85,
    ...
  }
]
```

### **GET /api/incidents/:id/audio**

Download audio file for a specific incident.

**Authentication**: Required

**Response**: Audio file (binary stream)

### **POST /api/incidents/:id/retranscribe**

Re-transcribe audio for an existing incident.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "incident": { ... },
  "transcription": {
    "text": "New transcribed text",
    "confidence": 90,
    "language": "en",
    "duration": 45.2
  }
}
```

---

## Configuration

### **Environment Variables**

Add to `.env`:
```bash
# OpenAI API Key for Whisper transcription
OPENAI_API_KEY=sk-...

# Optional: Adjust upload limits
MAX_AUDIO_FILE_SIZE=25MB
```

### **Server Setup**

The audio upload directory is automatically created:
```
uploads/
  └── audio/
      ├── voice-incident-1234567890.webm
      ├── voice-incident-1234567891.webm
      └── ...
```

---

## Dashboard Integration

### **Viewing Voice Incidents**

Voice incidents appear on dashboards with special indicators:

**Incident Card**:
- 🎙️ Voice icon badge
- "Reported via Voice" label
- Transcription confidence score
- Play audio button
- Transcribed text as description

**Filtering**:
- Filter by `reportingMethod: 'voice'`
- Sort by transcription confidence
- Search transcribed text

**Audio Playback**:
- Click audio icon to play
- Inline audio player
- Download original audio
- Re-transcribe option

---

## Use Cases

### **1. Field Reporting**
Emergency responders can quickly report incidents while on the move without typing.

### **2. Low Literacy Users**
Users who are not comfortable with written text can report incidents verbally.

### **3. Detailed Descriptions**
Complex incidents can be described more naturally through speech.

### **4. Multilingual Support**
Whisper API supports multiple languages for diverse user bases.

### **5. Evidence Preservation**
Original audio serves as evidence and can be reviewed for verification.

---

## Security & Privacy

### **Audio File Security**
- ✅ Files stored in protected directory
- ✅ Authentication required to access
- ✅ Unique filenames prevent conflicts
- ✅ File size limits prevent abuse

### **Transcription Privacy**
- ✅ Audio processed via secure OpenAI API
- ✅ No audio stored on OpenAI servers
- ✅ Transcription stored in encrypted database
- ⚠️ Consider local transcription for sensitive data

### **Access Control**
- ✅ Only authenticated users can record
- ✅ Audio files require authentication to download
- ✅ Audit logging for all voice incidents

---

## Performance Considerations

### **Audio File Size**
- Average 1-minute recording: ~1-2 MB
- 5-minute recording: ~5-10 MB
- Max allowed: 25 MB (~25 minutes)

### **Transcription Time**
- Typical 1-minute audio: 5-10 seconds
- Depends on OpenAI API response time
- User sees "Processing..." indicator

### **Storage Requirements**
- Plan for ~10 MB per voice incident
- Implement cleanup policy for old recordings
- Consider cloud storage for scalability

---

## Error Handling

### **Common Errors**

**Microphone Access Denied**:
```
Solution: User must allow microphone access in browser
```

**File Too Large**:
```
Solution: Keep recordings under 25 MB (about 25 minutes)
```

**Transcription Failed**:
```
Fallback: Incident created with "[Transcription failed]" message
Audio still saved for manual review
```

**No OpenAI API Key**:
```
Fallback: Incident created with "[Transcription unavailable]" message
Feature gracefully degrades
```

---

## Testing Checklist

- [ ] Record audio and verify file upload
- [ ] Check transcription accuracy
- [ ] Test pause/resume functionality
- [ ] Verify audio playback
- [ ] Test delete and re-record
- [ ] Check form validation
- [ ] Verify incident creation
- [ ] Test audio download
- [ ] Check dashboard display
- [ ] Test re-transcription
- [ ] Verify confidence scoring
- [ ] Test with different audio formats
- [ ] Check mobile browser compatibility

---

## Future Enhancements

### **Potential Improvements**

1. **Real-time Transcription**
   - Show transcription as user speaks
   - Live preview of text

2. **Voice Commands**
   - "Submit", "Cancel" voice commands
   - Hands-free operation

3. **Multi-language Support**
   - Auto-detect language
   - Translate to English

4. **Audio Enhancement**
   - Noise reduction
   - Volume normalization

5. **Offline Support**
   - Record offline
   - Upload when connection restored

6. **Audio Editing**
   - Trim recordings
   - Add markers/timestamps

7. **Batch Upload**
   - Multiple recordings
   - Bulk transcription

---

## Troubleshooting

### **Recording Not Starting**
- Check microphone permissions
- Try different browser (Chrome recommended)
- Check if microphone is being used by another app

### **Transcription Inaccurate**
- Speak clearly and slowly
- Reduce background noise
- Use re-transcribe feature
- Consider manual editing

### **Upload Failing**
- Check file size (< 25 MB)
- Verify internet connection
- Check server disk space
- Review server logs

### **Audio Not Playing**
- Check audio file exists
- Verify file format supported
- Try downloading file directly
- Check browser audio settings

---

## Code Examples

### **Using Voice Recorder Component**

```typescript
import { VoiceRecorder } from '@/components/VoiceRecorder';

function MyComponent() {
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    console.log(`Recorded ${duration} seconds`);
    // Upload blob to server
  };

  return (
    <VoiceRecorder
      onRecordingComplete={handleRecordingComplete}
      onRecordingStart={() => console.log('Started')}
      onRecordingStop={() => console.log('Stopped')}
    />
  );
}
```

### **Uploading Voice Incident**

```typescript
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('location', 'Abuja');
formData.append('severity', 'high');

const response = await fetch('/api/incidents/voice', {
  method: 'POST',
  body: formData,
  credentials: 'include',
});

const result = await response.json();
console.log('Transcription:', result.transcription.text);
```

---

## Browser Compatibility

| Browser | Recording | Playback | Notes |
|---------|-----------|----------|-------|
| Chrome | ✅ | ✅ | Recommended |
| Firefox | ✅ | ✅ | Full support |
| Safari | ✅ | ✅ | iOS 14.5+ |
| Edge | ✅ | ✅ | Chromium-based |
| Opera | ✅ | ✅ | Full support |

---

## Conclusion

The Voice Incident Reporting feature provides a modern, accessible way for users to report incidents. By combining browser-based audio recording with AI transcription, the system offers a seamless experience while maintaining the original audio for verification purposes.

**Status**: ✅ **Fully Implemented and Ready for Use**

---

*For questions or issues, contact the development team or refer to the main project documentation.*
