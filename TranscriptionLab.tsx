
import React, { useState, useRef } from 'react';
import { getAI, encode } from '../../services/gemini';

const TranscriptionLab: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setAuthError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processTranscription(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processTranscription = async (blob: Blob) => {
    setIsLoading(true);
    setTranscription('Transcribing your audio...');

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      reader.onloadend = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64 = encode(new Uint8Array(arrayBuffer));
        
        const ai = getAI();
        // Using native audio model for better modality support
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: 'audio/webm' } },
              { text: "Transcribe this audio exactly. Just the text." }
            ]
          }
        });
        
        setTranscription(response.text || "Could not transcribe audio.");
      };
    } catch (err: any) {
      console.error("Transcription error:", err);
      if (err?.message?.includes('403')) {
        setAuthError(true);
        setTranscription("Permission Denied: Please select a paid API key.");
      } else {
        setTranscription("Transcription failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-800/50 rounded-3xl p-12 border border-slate-700 shadow-xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold mb-4">Audio Transcription</h2>
        <p className="text-slate-400 mb-8 max-w-md">Record your voice and let Gemini 2.5 Flash native audio model provide a high-accuracy transcription.</p>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all duration-300 shadow-2xl ${
            isRecording 
              ? 'bg-red-500 animate-pulse' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
        <p className="mt-6 font-medium text-slate-300">
          {isRecording ? 'Recording... click to stop' : 'Click to start recording'}
        </p>

        {authError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm max-w-md">
            <strong>403 Access Error:</strong> This model requires a premium project API key. Go to Settings or the Image Lab to select a valid key.
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800 min-h-[200px]">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Transcription Result</h3>
        <div className={`text-xl leading-relaxed ${isLoading ? 'text-slate-600 animate-pulse' : 'text-slate-200'}`}>
          {transcription || "Your text will appear here once you finish recording."}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionLab;
