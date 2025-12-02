
export enum DateStatus {
  MATCHED = 'Matched',
  TALKING = 'Talking',
  DATING = 'Dating',
  SITUATIONSHIP = 'Situationship',
  GHOSTED = 'Ghosted',
  REJECTED = 'Rejected',
  FRIENDZONED = 'Friendzoned',
  PARTNER = 'Partner'
}

export enum Platform {
  TINDER = 'Tinder',
  BUMBLE = 'Bumble',
  HINGE = 'Hinge',
  CMB = 'CMB',
  LAMU = 'Lamu',
  OFFLINE = 'Offline',
  OTHER = 'Other'
}

export interface JournalEntry {
  id: string;
  date: string;
  rating: number; // 1-10
  status: DateStatus; // Status at the time of this entry
  notes: string;
  redFlags: string[];
  greenFlags: string[];
  createdAt: number;
  imageUrl?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  age?: number;
  jobTitle?: string;
  company?: string;
  phoneNumber?: string;
  platform: Platform;
  status: DateStatus;
  imageUrl?: string;
  
  // Aggregate/Latest Data for Sorting & Display
  latestRating: number;
  lastInteractionDate: string;
  
  // History
  entries: JournalEntry[];
  
  // Aggregate Flags (Unique set from all entries)
  allRedFlags: string[];
  allGreenFlags: string[];
  
  // AI Relationship Summary
  aiSummary?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AnalysisResult {
  redFlags: string[];
  greenFlags: string[];
  summary: string;
  sentimentScore: number; // 1-10
}
