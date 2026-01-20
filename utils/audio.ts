// Simple volume calculation for visualizer
export function getAudioVolume(data: Uint8Array): number {
  let sum = 0;
  // Calculate RMS
  for(let i = 0; i < data.length; i++) {
    const float = (data[i] - 128) / 128.0;
    sum += float * float;
  }
  return Math.sqrt(sum / data.length);
}

// Helper to check browser speech support
export const supportsSpeech = () => {
  return 'speechSynthesis' in window && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};