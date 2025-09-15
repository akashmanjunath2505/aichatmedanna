// FIX: The file was importing a type from itself, causing a circular dependency. The import has been removed.

export enum UserRole {
  DOCTOR = 'Doctor',
}

export type Sender = 'USER' | 'AI';

export interface Citation {
  uri: string;
  title: string;
}

// Types for Structured AI Responses
export interface HomeopathicRemedyItem {
  remedy: string;
  potencySuggestion: string;
  keynotes: string;
  confidence: 'Strong Match' | 'Good Match' | 'Possible Match';
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SymptomCheckResult {
  triageLevel: 'Emergency' | 'Urgent' | 'Routine' | 'Self-care';
  triageAdvice: string;
  possibleConditions: string[];
}

export type StructuredDataType = 
  | { type: 'homeopathy'; data: HomeopathicRemedyItem[]; summary: string }
  | { type: 'soap'; data: SoapNote; summary: string }
  | { type: 'symptom'; data: SymptomCheckResult; summary: string };


export interface Message {
  id: string;
  sender: Sender;
  text: string;
  citations?: Citation[];
  structuredData?: StructuredDataType;
}

export interface Chat {
  id:string;
  title: string;
  messages: Message[];
  userRole: UserRole;
  gptId?: string;
}

export interface PreCodedGpt {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  roles: UserRole[];
}