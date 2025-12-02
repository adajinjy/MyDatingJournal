
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DateList from './components/DateList';
import DateForm from './components/DateForm';
import DateDetail from './components/DateDetail';
import Auth from './components/Auth';
import { PersonProfile } from './types';
import { getPeople, savePerson, deletePerson } from './services/storageService';
import { supabase } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState<'dashboard' | 'list' | 'form' | 'detail'>('dashboard');
  const [entries, setEntries] = useState<PersonProfile[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PersonProfile | null>(null);
  const [editingEntry, setEditingEntry] = useState<PersonProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    checkUser();
    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
       setIsAuthenticated(!!session);
    }) || { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, []);

  const checkUser = async () => {
    setAuthLoading(true);
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          await loadData();
        }
      } catch (e) {
        console.error("Auth check failed", e);
      }
    }
    setAuthLoading(false);
  };

  const loadData = async () => {
    setDataLoading(true);
    const people = await getPeople();
    setEntries(people);
    setDataLoading(false);
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    await loadData();
  };

  const handleSaveEntry = async (person: PersonProfile) => {
    setDataLoading(true);
    const updatedEntries = await savePerson(person);
    setEntries(updatedEntries);
    setEditingEntry(null);
    setDataLoading(false);
    
    // Navigation Logic
    if (selectedEntry && selectedEntry.id === person.id) {
      setSelectedEntry(person);
      setView('detail');
    } else {
      setView('list');
    }
  };

  // Called when DateDetail updates the person (adds entry/flags)
  // We need to update the main list so Dashboard counts are correct
  const handleDetailUpdate = (updatedList: PersonProfile[], updatedPerson: PersonProfile) => {
    setEntries(updatedList);
    setSelectedEntry(updatedPerson);
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this person and all their history?')) {
      setDataLoading(true);
      const updatedEntries = await deletePerson(id);
      setEntries(updatedEntries);
      setSelectedEntry(null);
      setView('list');
      setDataLoading(false);
    }
  };

  const handleSelectEntry = (entry: PersonProfile) => {
    setSelectedEntry(entry);
    setView('detail');
  };

  const handleEdit = (entry: PersonProfile) => {
    setEditingEntry(entry);
    setView('form');
  };

  const handleCancelForm = () => {
    setEditingEntry(null);
    if (selectedEntry && view === 'form') {
        setView('detail');
    } else {
        setView('dashboard');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header currentView={view} setView={(v) => {
          if (v === 'form') setEditingEntry(null); 
          setView(v);
      }} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {dataLoading && view !== 'detail' ? (
           <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
           </div>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard people={entries} />}
            
            {view === 'list' && (
              <DateList 
                entries={entries} 
                onSelectEntry={handleSelectEntry} 
              />
            )}
            
            {view === 'form' && (
              <div className="max-w-2xl mx-auto">
                <DateForm 
                  existingPerson={editingEntry} 
                  onSave={handleSaveEntry}
                  onCancel={handleCancelForm}
                />
              </div>
            )}

            {view === 'detail' && selectedEntry && (
              <DateDetail 
                entry={selectedEntry}
                onBack={() => setView('list')}
                onDelete={handleDeleteEntry}
                onEdit={handleEdit}
                onDataUpdate={handleDetailUpdate}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
