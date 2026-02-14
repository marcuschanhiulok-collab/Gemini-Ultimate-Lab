
export enum LabType {
  LIVE = 'Live API',
  CHAT = 'Chatbot',
  SEARCH = 'Search Lab',
  MAPS = 'Maps Lab',
  IMAGE = 'Creative Studio',
  VIDEO = 'Video Generation',
  ANALYSIS = 'Analysis Lab',
  TRANSCRIPTION = 'Transcription',
  SETTINGS = 'Settings'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        text: string;
      }[];
    }[];
  };
}
