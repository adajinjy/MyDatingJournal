
import { PersonProfile } from '../types';
import { supabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'redflag_radar_people_v2';
const DB_TABLE = 'dating_people';

// Helper to determine if we are using Cloud DB
const isCloudEnabled = () => !!supabase && !!supabase.auth.getUser();

export const getPeople = async (): Promise<PersonProfile[]> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from(DB_TABLE)
        .select('data');
      
      if (error) {
        console.error("Supabase load error", error);
        // Detect missing table error
        if (error.code === '42P01') {
            alert("Database Error: Table 'dating_people' does not exist. Please run the SQL setup script in your Supabase Dashboard.");
        }
        return [];
      }
      return data ? data.map((row: any) => row.data) : [];
    }
  }

  // Fallback to Local Storage (Guest Mode)
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load local people", e);
    return [];
  }
};

export const savePerson = async (person: PersonProfile): Promise<PersonProfile[]> => {
  // Optimistically get current list to return, or fetch fresh
  let currentList = await getPeople();
  const index = currentList.findIndex(p => p.id === person.id);
  
  if (index >= 0) {
    currentList[index] = person;
  } else {
    currentList = [person, ...currentList];
  }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Upsert into Supabase
      const { error } = await supabase
        .from(DB_TABLE)
        .upsert({ 
          id: person.id,
          user_id: user.id,
          data: person,
          updated_at: new Date()
        });
      
      if (error) {
        console.error("Supabase save error", error);
        if (error.code === '42P01') {
            alert("Database Error: Table 'dating_people' missing. Please run the SQL setup.");
        }
        throw error;
      }
      // Return updated list
      return currentList;
    }
  }

  // Save Local
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentList));
  return currentList;
};

export const deletePerson = async (id: string): Promise<PersonProfile[]> => {
  let currentList = await getPeople();
  const newList = currentList.filter(p => p.id !== id);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from(DB_TABLE).delete().match({ id, user_id: user.id });
      if (error) console.error("Delete error", error);
      return newList;
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  return newList;
};
