import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Initialize OpenAI client for Whisper API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

export class AudioTranscriptionService {
  private static instance: AudioTranscriptionService;
  private isEnabled: boolean;

  private constructor() {
    this.isEnabled = !!process.env.OPENAI_API_KEY;
    if (!this.isEnabled) {
      logger.warn('Audio transcription service disabled: OPENAI_API_KEY not configured');
    } else {
      logger.info('Audio transcription service initialized with OpenAI Whisper');
    }
  }

  public static getInstance(): AudioTranscriptionService {
    if (!AudioTranscriptionService.instance) {
      AudioTranscriptionService.instance = new AudioTranscriptionService();
    }
    return AudioTranscriptionService.instance;
  }

  /**
   * Transcribe audio file using OpenAI Whisper API
   * @param audioFilePath Path to the audio file
   * @returns Transcription result with text and confidence
   */
  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    if (!this.isEnabled) {
      logger.warn('Transcription attempted but service is disabled');
      return {
        text: '[Transcription unavailable - OpenAI API key not configured]',
        confidence: 0,
      };
    }

    try {
      logger.info(`Starting transcription for file: ${audioFilePath}`);

      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Get file stats
      const stats = fs.statSync(audioFilePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      logger.info(`Audio file size: ${fileSizeMB.toFixed(2)} MB`);

      // OpenAI Whisper supports files up to 25MB
      if (fileSizeMB > 25) {
        throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)} MB (max 25 MB)`);
      }

      // Create a read stream for the audio file
      const audioStream = fs.createReadStream(audioFilePath);

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        language: 'en', // Can be auto-detected or set to specific language
        response_format: 'verbose_json', // Get detailed response with timestamps
      });

      // Calculate confidence based on response (Whisper doesn't provide direct confidence)
      // We'll use a heuristic: longer transcriptions with proper structure get higher confidence
      const wordCount = transcription.text.split(/\s+/).length;
      const confidence = Math.min(95, 70 + Math.min(wordCount * 2, 25));

      logger.info(`Transcription completed successfully. Word count: ${wordCount}`);

      return {
        text: transcription.text,
        confidence,
        language: transcription.language,
        duration: transcription.duration,
      };
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      
      // Return fallback result
      return {
        text: `[Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        confidence: 0,
      };
    }
  }

  /**
   * Transcribe audio from buffer (for in-memory processing)
   * @param audioBuffer Audio data buffer
   * @param filename Original filename for context
   * @returns Transcription result
   */
  async transcribeAudioBuffer(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult> {
    if (!this.isEnabled) {
      return {
        text: '[Transcription unavailable - OpenAI API key not configured]',
        confidence: 0,
      };
    }

    try {
      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${filename}`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      // Transcribe the temporary file
      const result = await this.transcribeAudio(tempFilePath);

      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to delete temporary audio file:', cleanupError);
      }

      return result;
    } catch (error) {
      logger.error('Audio buffer transcription failed:', error);
      return {
        text: `[Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        confidence: 0,
      };
    }
  }

  /**
   * Check if transcription service is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'mp3',
      'mp4',
      'mpeg',
      'mpga',
      'm4a',
      'wav',
      'webm',
      'ogg',
      'flac',
    ];
  }

  /**
   * Validate audio file format
   */
  isValidAudioFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return this.getSupportedFormats().includes(ext);
  }
}

// Export singleton instance
export const audioTranscriptionService = AudioTranscriptionService.getInstance();
