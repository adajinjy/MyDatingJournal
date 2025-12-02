
import { supabase } from './supabaseClient';
import { AnalysisResult, PersonProfile } from '../types';

// NOTE: The API Key is no longer used here. It is stored securely in the Supabase Edge Function.

export const analyzeNotes = async (notes: string): Promise<AnalysisResult> => {
  if (!supabase) throw new Error("Database not connected");

  const { data, error } = await supabase.functions.invoke('gemini-api', {
    body: { action: 'analyze_notes', payload: { notes } }
  });

  if (error) {
    console.error("Edge Function Error:", error);
    throw new Error("Failed to analyze notes via backend. Make sure the 'gemini-api' function is deployed.");
  }

  return data;
};

export const analyzeRelationship = async (person: PersonProfile): Promise<string> => {
    if (!supabase) return "Database not connected.";

    // Simplify the payload to send only text data
    const historySummary = person.entries.map(e => ({
        date: e.date,
        rating: e.rating,
        notes: e.notes,
        flags: [...e.redFlags, ...e.greenFlags]
    }));

    const { data, error } = await supabase.functions.invoke('gemini-api', {
        body: { 
            action: 'analyze_relationship', 
            payload: { 
                name: person.name,
                history: historySummary 
            } 
        }
    });

    if (error) {
        console.error(error);
        return "Error connecting to AI backend.";
    }
    return data.summary;
}

export const getChatResponse = async (history: {role: string, text: string}[], newMessage: string) => {
  if (!supabase) return "Please connect to Supabase to chat.";

  const { data, error } = await supabase.functions.invoke('gemini-api', {
    body: { 
        action: 'chat', 
        payload: { history, newMessage } 
    }
  });

  if (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the backend. Please check your internet or database connection.";
  }

  return data.text;
};
