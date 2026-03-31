import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

type TranscriberPluginId = 'openai_compatible' | 'deepgram' | 'assemblyai';

const deepseekKey = process.env.DEEPSEEK_API_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';
const deepgramKey = process.env.DEEPGRAM_API_KEY || '';
const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY || '';
const configuredPlugin = (process.env.AUDIO_TRANSCRIBER_PLUGIN || '').toLowerCase() as TranscriberPluginId | '';
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const openaiCompatibleModel = process.env.AUDIO_TRANSCRIPTION_MODEL || 'whisper-1';

const defaultPlugin: TranscriberPluginId | null =
  configuredPlugin ||
  (deepgramKey ? 'deepgram' : assemblyAiKey ? 'assemblyai' : deepseekKey || openaiKey ? 'openai_compatible' : null);

const openaiClient =
  deepseekKey || openaiKey
    ? new OpenAI({
        apiKey: deepseekKey || openaiKey,
        ...(deepseekKey ? { baseURL: deepseekBaseUrl } : {}),
      })
    : null;

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

export class AudioTranscriptionService {
  private static instance: AudioTranscriptionService;
  private isEnabled: boolean;
  private pluginId: TranscriberPluginId | null;

  private constructor() {
    this.pluginId = defaultPlugin;
    this.isEnabled = !!this.pluginId;
    if (!this.isEnabled) {
      logger.warn('Audio transcription service disabled: no transcriber plugin configured');
    } else {
      logger.info(`Audio transcription service initialized with plugin: ${this.pluginId}`);
    }
  }

  public static getInstance(): AudioTranscriptionService {
    if (!AudioTranscriptionService.instance) {
      AudioTranscriptionService.instance = new AudioTranscriptionService();
    }
    return AudioTranscriptionService.instance;
  }

  /**
   * Internal transcribing agent with pluggable providers.
   * @param audioFilePath Path to the audio file
   * @returns Transcription result with text and confidence
   */
  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    if (!this.isEnabled) {
      logger.warn('Transcription attempted but service is disabled');
      return {
        text: '[Transcription unavailable]',
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

      if (this.pluginId === 'deepgram') {
        return this.transcribeWithDeepgram(audioFilePath);
      }
      if (this.pluginId === 'assemblyai') {
        return this.transcribeWithAssemblyAI(audioFilePath);
      }
      return this.transcribeWithOpenAiCompatible(audioFilePath);
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      
      // Return fallback result
      return {
        text: '[Transcription failed]',
        confidence: 0,
      };
    }
  }

  private async transcribeWithOpenAiCompatible(audioFilePath: string): Promise<TranscriptionResult> {
    if (!openaiClient) throw new Error('OpenAI-compatible plugin not configured');
    const audioStream = fs.createReadStream(audioFilePath);
    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioStream,
      model: openaiCompatibleModel,
      language: 'en',
      response_format: 'verbose_json',
    });
    const wordCount = transcription.text.split(/\s+/).length;
    const confidence = Math.min(95, 70 + Math.min(wordCount * 2, 25));
    return {
      text: transcription.text,
      confidence,
      language: transcription.language,
      duration: transcription.duration,
    };
  }

  private async transcribeWithDeepgram(audioFilePath: string): Promise<TranscriptionResult> {
    if (!deepgramKey) throw new Error('Deepgram plugin not configured');
    const buffer = fs.readFileSync(audioFilePath);
    const mimeType = this.getMimeType(audioFilePath);
    const model = process.env.DEEPGRAM_MODEL || 'nova-3';
    const response = await fetch(`https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&smart_format=true&punctuate=true`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': mimeType,
      },
      body: buffer,
    });
    if (!response.ok) throw new Error(`Deepgram request failed (${response.status})`);
    const payload = await response.json() as any;
    const alt = payload?.results?.channels?.[0]?.alternatives?.[0];
    const text = (alt?.transcript || '').trim();
    return {
      text: text || '[Transcription failed]',
      confidence: alt?.confidence ? Math.round(Number(alt.confidence) * 100) : 0,
      language: payload?.results?.channels?.[0]?.detected_language,
      duration: payload?.metadata?.duration,
    };
  }

  private async transcribeWithAssemblyAI(audioFilePath: string): Promise<TranscriptionResult> {
    if (!assemblyAiKey) throw new Error('AssemblyAI plugin not configured');
    const buffer = fs.readFileSync(audioFilePath);
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { authorization: assemblyAiKey },
      body: buffer,
    });
    if (!uploadRes.ok) throw new Error(`AssemblyAI upload failed (${uploadRes.status})`);
    const upload = await uploadRes.json() as { upload_url?: string };
    if (!upload.upload_url) throw new Error('AssemblyAI upload URL missing');

    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: assemblyAiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload.upload_url,
        speech_model: process.env.ASSEMBLYAI_MODEL || 'universal',
        language_detection: true,
      }),
    });
    if (!transcriptRes.ok) throw new Error(`AssemblyAI transcribe start failed (${transcriptRes.status})`);
    const transcript = await transcriptRes.json() as { id?: string };
    if (!transcript.id) throw new Error('AssemblyAI transcript ID missing');

    const maxMs = Number(process.env.ASSEMBLYAI_TIMEOUT_MS || 120000);
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${transcript.id}`, {
        headers: { authorization: assemblyAiKey },
      });
      if (!poll.ok) throw new Error(`AssemblyAI poll failed (${poll.status})`);
      const status = await poll.json() as any;
      if (status.status === 'completed') {
        return {
          text: status.text || '[Transcription failed]',
          confidence: status.confidence ? Math.round(Number(status.confidence) * 100) : 0,
          language: status.language_code,
          duration: status.audio_duration ? Number(status.audio_duration) : undefined,
        };
      }
      if (status.status === 'error') throw new Error('AssemblyAI transcription error');
    }

    throw new Error('AssemblyAI transcription timeout');
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
        text: '[Transcription unavailable]',
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
        text: '[Transcription failed]',
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

  getActivePlugin(): TranscriberPluginId | null {
    return this.pluginId;
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
      'aac',
      'amr',
      '3gp',
      '3gpp',
    ];
  }

  /**
   * Validate audio file format
   */
  isValidAudioFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return this.getSupportedFormats().includes(ext);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const byExt: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.mpeg': 'audio/mpeg',
      '.mpga': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.amr': 'audio/amr',
      '.3gp': 'audio/3gpp',
      '.3gpp': 'audio/3gpp',
    };
    return byExt[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
export const audioTranscriptionService = AudioTranscriptionService.getInstance();
