import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { audioTranscriptionService } from '../services/audio-transcription-service';
import { insertIncidentSchema, User as SelectUser } from '@shared/schema';

const router = Router();

// Configure multer for audio file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `voice-incident-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (OpenAI Whisper limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = audioTranscriptionService.getSupportedFormats();
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio format. Supported formats: ${allowedFormats.join(', ')}`));
    }
  }
});

/**
 * POST /api/incidents/voice
 * Upload voice recording and create incident with transcription
 */
router.post('/voice', upload.single('audio'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const user = req.user as SelectUser;
    const { location, region, state, lga, severity, category } = req.body;

    // Validate required fields
    if (!location || !region || !severity || !category) {
      // Clean up uploaded file
      fs.unlinkSync(audioFile.path);
      return res.status(400).json({ 
        error: 'Missing required fields: location, region, severity, category' 
      });
    }

    console.log(`Processing voice incident from user ${user.id}, file: ${audioFile.filename}`);

    // Transcribe the audio
    const transcriptionResult = await audioTranscriptionService.transcribeAudio(audioFile.path);

    // Generate audio URL (relative path for storage)
    const audioUrl = `/uploads/audio/${audioFile.filename}`;

    // Extract title from transcription (first sentence or first 50 chars)
    const transcriptionText = transcriptionResult.text;
    const titleMatch = transcriptionText.match(/^[^.!?]+[.!?]/);
    const title = titleMatch 
      ? titleMatch[0].trim() 
      : transcriptionText.substring(0, 50) + (transcriptionText.length > 50 ? '...' : '');

    // Create incident with transcription
    const incidentData = {
      title: title || 'Voice Reported Incident',
      description: transcriptionText || '[No transcription available]',
      location,
      region,
      state: state || null,
      lga: lga || null,
      severity,
      category,
      status: 'pending',
      reportedBy: user.id,
      verificationStatus: 'unverified',
      reportingMethod: 'voice',
      audioRecordingUrl: audioUrl,
      audioTranscription: transcriptionText,
      transcriptionConfidence: transcriptionResult.confidence,
      coordinates: req.body.coordinates ? JSON.parse(req.body.coordinates) : null,
      impactedPopulation: req.body.impactedPopulation ? parseInt(req.body.impactedPopulation) : null,
    };

    // Validate and create incident
    const validatedData = insertIncidentSchema.parse(incidentData);
    const newIncident = await storage.createIncident(validatedData);

    console.log(`Voice incident created successfully: ID ${newIncident.id}`);

    res.status(201).json({
      success: true,
      incident: newIncident,
      transcription: {
        text: transcriptionText,
        confidence: transcriptionResult.confidence,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
      },
      audioUrl,
    });

  } catch (error) {
    console.error('Voice incident creation failed:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up audio file:', cleanupError);
      }
    }

    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to process voice incident',
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Failed to process voice incident' });
    }
  }
});

/**
 * GET /api/incidents/voice
 * Get all voice-reported incidents
 */
router.get('/voice', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const allIncidents = await storage.getIncidents();
    const voiceIncidents = allIncidents.filter(
      (incident: any) => incident.reportingMethod === 'voice'
    );

    res.json(voiceIncidents);
  } catch (error) {
    console.error('Failed to fetch voice incidents:', error);
    res.status(500).json({ error: 'Failed to fetch voice incidents' });
  }
});

/**
 * GET /api/incidents/:id/audio
 * Get audio file for a specific incident
 */
router.get('/:id/audio', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const incidentId = parseInt(req.params.id);
    const incident = await storage.getIncident(incidentId);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (!incident.audioRecordingUrl) {
      return res.status(404).json({ error: 'No audio recording for this incident' });
    }

    // Construct full file path
    const audioPath = path.join(process.cwd(), incident.audioRecordingUrl);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Send audio file
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Failed to retrieve audio:', error);
    res.status(500).json({ error: 'Failed to retrieve audio file' });
  }
});

/**
 * POST /api/incidents/:id/retranscribe
 * Re-transcribe audio for an existing incident
 */
router.post('/:id/retranscribe', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const incidentId = parseInt(req.params.id);
    const incident = await storage.getIncident(incidentId);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (!incident.audioRecordingUrl) {
      return res.status(400).json({ error: 'No audio recording for this incident' });
    }

    const audioPath = path.join(process.cwd(), incident.audioRecordingUrl);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Re-transcribe
    const transcriptionResult = await audioTranscriptionService.transcribeAudio(audioPath);

    // Update incident with new transcription
    const updatedIncident = await storage.updateIncident(incidentId, {
      audioTranscription: transcriptionResult.text,
      transcriptionConfidence: transcriptionResult.confidence,
    });

    res.json({
      success: true,
      incident: updatedIncident,
      transcription: {
        text: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
      },
    });

  } catch (error) {
    console.error('Re-transcription failed:', error);
    res.status(500).json({ error: 'Failed to re-transcribe audio' });
  }
});

export function setupVoiceIncidentRoutes(app: any) {
  app.use('/api/incidents', router);
}
