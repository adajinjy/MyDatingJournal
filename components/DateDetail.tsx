import React, { useState, useEffect, useRef } from 'react';
import { PersonProfile, ChatMessage, JournalEntry, DateStatus } from '../types';
import { getChatResponse, analyzeRelationship, analyzeNotes } from '../services/geminiService';
import { ArrowLeft, Trash2, Edit2, Send, User, Bot, AlertTriangle, CheckCircle, MapPin, Calendar, Briefcase, Building, Phone, Plus, Sparkles, Loader2, Save, X, Image as ImageIcon, Star, ChevronRight } from 'lucide-react';
import { savePerson } from '../services/storageService';

interface DateDetailProps {
  entry: PersonProfile;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: (entry: PersonProfile) => void;
  onDataUpdate: (updatedList: PersonProfile[], updatedPerson: PersonProfile) => void;
}

const DateDetail: React.FC<DateDetailProps> = ({ entry: initialEntry, onBack, onDelete, onEdit, onDataUpdate }) => {
  const [person, setPerson] = useState<PersonProfile>(initialEntry);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Relationship Analysis State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | undefined>(person.aiSummary);

  // Entry Form State (Create & Edit)
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryRating, setEntryRating] = useState(5);
  const [entryStatus, setEntryStatus] = useState<DateStatus>(person.status);
  const [entryNotes, setEntryNotes] = useState('');
  const [entryRedFlags, setEntryRedFlags] = useState<string[]>([]);
  const [entryGreenFlags, setEntryGreenFlags] = useState<string[]>([]);
  const [entryImageUrl, setEntryImageUrl] = useState('');
  const [isAnalyzingEntry, setIsAnalyzingEntry] = useState(false);

  // Inputs for adding specific flags manually
  const [manualRedFlag, setManualRedFlag] = useState('');
  const [manualGreenFlag, setManualGreenFlag] = useState('');

  // Auto-sync Effect: Ensures Profile Status/Rating matches the Latest Journal Entry
  useEffect(() => {
    if (!person.entries || person.entries.length === 0) return;

    // Sort entries to find the absolute latest (Date DESC, then CreatedAt DESC)
    const sorted = [...person.entries].sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const latest = sorted[0];
    
    // Check for mismatch
    const shouldBeStatus = latest.status || person.status;
    const shouldBeRating = latest.rating;
    const shouldBeDate = latest.date;

    if (person.status !== shouldBeStatus || person.latestRating !== shouldBeRating || person.lastInteractionDate !== shouldBeDate) {
        console.log("Auto-correcting profile stats based on latest entry...");
        const correctedPerson = {
            ...person,
            status: shouldBeStatus,
            latestRating: shouldBeRating,
            lastInteractionDate: shouldBeDate
        };
        
        // Update local state immediately
        setPerson(correctedPerson);
        
        // Save and propagate to parent
        savePerson(correctedPerson).then((newList) => {
            onDataUpdate(newList, correctedPerson);
        });
    }
  }, [person.entries, person.status, person.latestRating, person.lastInteractionDate]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatOpen]);

  const resetEntryForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryRating(5);
    setEntryStatus(person.status); // Default to current person status
    setEntryNotes('');
    setEntryRedFlags([]);
    setEntryGreenFlags([]);
    setEntryImageUrl('');
    setEditingEntryId(null);
    setShowEntryForm(false);
    setManualRedFlag('');
    setManualGreenFlag('');
  };

  const startEditEntry = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.date);
    setEntryRating(entry.rating);
    // If existing entry has no status (legacy data), default to current person status
    setEntryStatus(entry.status || person.status);
    setEntryNotes(entry.notes);
    setEntryRedFlags([...entry.redFlags]);
    setEntryGreenFlags([...entry.greenFlags]);
    setEntryImageUrl(entry.imageUrl || '');
    setShowEntryForm(true);
    // Scroll to top of timeline to see form
    setTimeout(() => {
        const formElement = document.getElementById('entry-form-container');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; 

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setEntryImageUrl(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRelationshipAnalysis = async () => {
    setIsSummarizing(true);
    const result = await analyzeRelationship(person);
    setSummary(result);
    const updatedPerson = { ...person, aiSummary: result };
    setPerson(updatedPerson);
    const updatedList = await savePerson(updatedPerson);
    onDataUpdate(updatedList, updatedPerson);
    setIsSummarizing(false);
  };

  const handleAnalyzeEntry = async () => {
    if (!entryNotes.trim()) return;
    setIsAnalyzingEntry(true);
    try {
        const result = await analyzeNotes(entryNotes);
        setEntryRedFlags(prev => Array.from(new Set([...prev, ...result.redFlags])));
        setEntryGreenFlags(prev => Array.from(new Set([...prev, ...result.greenFlags])));
        setEntryRating(result.sentimentScore);
    } catch(e) {
        console.error(e);
    } finally {
        setIsAnalyzingEntry(false);
    }
  };

  const handleSaveEntry = async () => {
    setIsSaving(true);
    
    // Capture any pending manual input flags that haven't been "added" yet
    const finalRedFlags = [...entryRedFlags];
    if (manualRedFlag.trim()) {
        finalRedFlags.push(manualRedFlag.trim());
        setManualRedFlag('');
    }

    const finalGreenFlags = [...entryGreenFlags];
    if (manualGreenFlag.trim()) {
        finalGreenFlags.push(manualGreenFlag.trim());
        setManualGreenFlag('');
    }

    let updatedEntries: JournalEntry[];

    if (editingEntryId) {
        // Update existing entry
        updatedEntries = person.entries.map(e => 
            e.id === editingEntryId 
            ? {
                ...e,
                date: entryDate,
                rating: entryRating,
                status: entryStatus,
                notes: entryNotes,
                redFlags: finalRedFlags,
                greenFlags: finalGreenFlags,
                imageUrl: entryImageUrl
              }
            : e
        );
    } else {
        // Create new entry
        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: entryDate,
            rating: entryRating,
            status: entryStatus,
            notes: entryNotes,
            redFlags: finalRedFlags,
            greenFlags: finalGreenFlags,
            imageUrl: entryImageUrl,
            createdAt: Date.now()
        };
        updatedEntries = [newEntry, ...person.entries];
    }

    // Recalculate Aggregates (Crucial for DB Sync)
    // 1. All Flags (Unique Set form ALL entries)
    const allRed = Array.from(new Set(updatedEntries.flatMap(e => e.redFlags || [])));
    const allGreen = Array.from(new Set(updatedEntries.flatMap(e => e.greenFlags || [])));

    // 2. Sort Entries by date desc to find current status/rating
    // Deterministic sort: Date Descending -> CreatedAt Descending
    const sorted = [...updatedEntries].sort((a,b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return (b.createdAt || 0) - (a.createdAt || 0);
    });
    
    const latest = sorted[0];

    const updatedPerson: PersonProfile = {
        ...person,
        entries: updatedEntries,
        allRedFlags: allRed,
        allGreenFlags: allGreen,
        // Update person stats based on latest entry
        latestRating: latest ? latest.rating : 0,
        lastInteractionDate: latest ? latest.date : person.lastInteractionDate,
        status: latest && latest.status ? latest.status : person.status
    };

    try {
        // This persists the new flags to Supabase/Local Storage
        const updatedList = await savePerson(updatedPerson);
        setPerson(updatedPerson);
        // Important: Notify parent App component to update global state (Dashboard counts)
        onDataUpdate(updatedList, updatedPerson);
        resetEntryForm();
    } catch (e) {
        console.error("Failed to save", e);
        alert("Failed to save entry. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSendChat = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsChatLoading(true);

    const contextHistory = chatHistory.map(m => ({ role: m.role, text: m.text }));
    if (chatHistory.length === 0) {
       const historyText = person.entries.map(e => `[${e.date}] Status: ${e.status || 'N/A'}, Rating ${e.rating}/10: ${e.notes}`).join('; ');
       contextHistory.unshift({
         role: 'user',
         text: `Context for ${person.name}: Status: ${person.status}. Job: ${person.jobTitle}. Journal History: ${historyText}.`
       });
    }

    const responseText = await getChatResponse(contextHistory, userMsg.text);
    setChatHistory(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
    setIsChatLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-100px)] relative">
      
      {/* LEFT COLUMN: BIO & SUMMARY */}
      <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-1 scrollbar-hide">
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Increased height from h-40 to h-96 to show full photo */}
            <div className="h-96 relative">
                <img src={person.imageUrl} alt={person.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                    <div className="text-white w-full">
                        <h1 className="text-3xl font-bold mb-1">{person.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm opacity-90">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {person.platform}</span>
                            
                            {/* Status Pill */}
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs backdrop-blur-sm border border-white/10">
                              {person.status}
                            </span>

                            {/* Latest Rating Pill (Added per request) */}
                            <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs backdrop-blur-sm border border-white/10 text-white font-semibold">
                                <Star className={`w-3 h-3 ${person.latestRating >= 7 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 fill-slate-300'}`} />
                                <span>{person.latestRating}/10</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={onBack} className="absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white">
                    <ArrowLeft className="w-4 h-4 text-slate-700" />
                </button>
                <div className="absolute top-4 right-4 flex gap-2">
                     <button onClick={() => onEdit(person)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur transition-colors" title="Edit Profile">
                        <Edit2 className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => onDelete(person.id)} className="bg-red-500/80 hover:bg-red-600 p-2 rounded-full backdrop-blur transition-colors" title="Delete Person">
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
            
            <div className="p-4 space-y-4">
                {/* Career/Contact */}
                 <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
                    {person.jobTitle && <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400"/> {person.jobTitle}</div>}
                    {person.company && <div className="flex items-center gap-2"><Building className="w-4 h-4 text-slate-400"/> {person.company}</div>}
                    {person.phoneNumber && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> {person.phoneNumber}</div>}
                 </div>

                 <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500"/> Relationship Summary</h3>
                        <button 
                            onClick={handleRelationshipAnalysis}
                            disabled={isSummarizing}
                            className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 disabled:opacity-50 transition-colors"
                        >
                            {isSummarizing ? 'Thinking...' : 'Analyze History'}
                        </button>
                    </div>
                    {summary ? (
                        <div className="bg-purple-50/50 p-3 rounded-lg text-sm text-slate-700 leading-relaxed border border-purple-100">
                            {summary}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">Click analyze to get an AI summary of your entire relationship trajectory.</p>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                        <div className="font-bold text-rose-800 text-xs mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {person.allRedFlags.length} Red Flags</div>
                        <div className="flex flex-wrap gap-1">
                            {person.allRedFlags.slice(0, 5).map((f, i) => <span key={i} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-600">{f}</span>)}
                            {person.allRedFlags.length > 5 && <span className="text-[10px] text-rose-400">+{person.allRedFlags.length - 5} more</span>}
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <div className="font-bold text-emerald-800 text-xs mb-2 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {person.allGreenFlags.length} Green Flags</div>
                         <div className="flex flex-wrap gap-1">
                            {person.allGreenFlags.slice(0, 5).map((f, i) => <span key={i} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-600">{f}</span>)}
                             {person.allGreenFlags.length > 5 && <span className="text-[10px] text-emerald-400">+{person.allGreenFlags.length - 5} more</span>}
                        </div>
                    </div>
                 </div>
            </div>
         </div>
      </div>

      {/* MIDDLE COLUMN: JOURNAL TIMELINE */}
      <div className="lg:col-span-1 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h2 className="font-bold text-slate-800">Journal Entries</h2>
             <button 
                onClick={() => {
                    if (showEntryForm) resetEntryForm();
                    else setShowEntryForm(true);
                }}
                className={`text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${showEntryForm ? 'bg-slate-400 hover:bg-slate-500' : 'bg-rose-500 hover:bg-rose-600'}`}
             >
                 {showEntryForm ? <span className="flex items-center gap-1"><X className="w-3 h-3"/> Cancel</span> : <span className="flex items-center gap-1"><Plus className="w-3 h-3"/> Add Date</span>}
             </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
            {showEntryForm && (
                <div id="entry-form-container" className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm mb-6 animate-fade-in ring-2 ring-rose-50">
                    <h3 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2">
                        {editingEntryId ? <><Edit2 className="w-3 h-3"/> Edit Entry Details</> : <><Plus className="w-3 h-3"/> New Entry</>}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Date</label>
                                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full text-sm border rounded p-2" />
                            </div>
                            <div className="w-1/3">
                                 <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Rating</label>
                                 <input type="number" min="1" max="10" value={entryRating} onChange={e => setEntryRating(Number(e.target.value))} className="w-full text-sm border rounded p-2" />
                            </div>
                        </div>

                         <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Relationship Status</label>
                            <select 
                                value={entryStatus} 
                                onChange={e => setEntryStatus(e.target.value as DateStatus)}
                                className="w-full text-sm border rounded p-2 focus:ring-2 focus:ring-rose-500 outline-none"
                            >
                                {Object.values(DateStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Notes</label>
                            <textarea 
                                value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                                placeholder="How did it go? Any updates?" 
                                className="w-full text-sm border rounded p-2 h-20 resize-none focus:outline-none focus:border-rose-300"
                            />
                        </div>
                         
                         {/* Entry Image Upload */}
                         <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                <ImageIcon className="w-3 h-3" /> Add Photo
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                            {entryImageUrl && (
                                <div className="relative group">
                                    <img src={entryImageUrl} alt="Preview" className="w-10 h-10 object-cover rounded border border-slate-200" />
                                    <button 
                                        onClick={() => setEntryImageUrl('')}
                                        className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow border hover:text-rose-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                         </div>

                         <div className="flex justify-between items-center pt-2">
                            <button 
                                onClick={handleAnalyzeEntry} 
                                disabled={isAnalyzingEntry || !entryNotes}
                                className="text-xs text-rose-500 flex items-center gap-1 font-medium hover:underline disabled:opacity-50"
                            >
                                {isAnalyzingEntry ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} AI Analyze
                            </button>
                            <button 
                                onClick={handleSaveEntry} 
                                disabled={isSaving}
                                className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 hover:bg-rose-700 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3"/>} {editingEntryId ? 'Update Entry' : 'Save'}
                            </button>
                        </div>
                        
                        {/* Manual Flags Input if AI misses something */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                            <div>
                                <input 
                                    type="text" 
                                    value={manualRedFlag}
                                    onChange={e => setManualRedFlag(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && manualRedFlag.trim()) {
                                            setEntryRedFlags([...entryRedFlags, manualRedFlag.trim()]);
                                            setManualRedFlag('');
                                        }
                                    }}
                                    placeholder="+ Red flag" 
                                    className="w-full text-[10px] border border-rose-100 rounded px-2 py-1 bg-rose-50/50"
                                />
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    value={manualGreenFlag}
                                    onChange={e => setManualGreenFlag(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && manualGreenFlag.trim()) {
                                            setEntryGreenFlags([...entryGreenFlags, manualGreenFlag.trim()]);
                                            setManualGreenFlag('');
                                        }
                                    }}
                                    placeholder="+ Green flag" 
                                    className="w-full text-[10px] border border-emerald-100 rounded px-2 py-1 bg-emerald-50/50"
                                />
                            </div>
                        </div>

                        {/* Flags Display for Entry Form */}
                        {(entryRedFlags.length > 0 || entryGreenFlags.length > 0) && (
                            <div className="flex flex-wrap gap-1 text-[10px]">
                                {entryRedFlags.map((f, i) => (
                                    <span key={`new-r-${i}`} className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                        {f} <button onClick={() => setEntryRedFlags(entryRedFlags.filter((_, idx) => idx !== i))}>×</button>
                                    </span>
                                ))}
                                {entryGreenFlags.map((f, i) => (
                                    <span key={`new-g-${i}`} className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                        {f} <button onClick={() => setEntryGreenFlags(entryGreenFlags.filter((_, idx) => idx !== i))}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline List */}
            <div className="space-y-4">
                {person.entries.sort((a,b) => {
                     const timeA = new Date(a.date).getTime();
                     const timeB = new Date(b.date).getTime();
                     if (timeA !== timeB) return timeB - timeA;
                     return (b.createdAt || 0) - (a.createdAt || 0);
                }).map((journal) => (
                    <div key={journal.id} className="relative pl-4 border-l-2 border-slate-200 group">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${journal.rating >= 7 ? 'bg-emerald-100 border-emerald-400' : journal.rating <= 4 ? 'bg-rose-100 border-rose-400' : 'bg-white border-slate-300'}`}></div>
                        
                        <div 
                            onClick={() => startEditEntry(journal)}
                            className={`bg-white p-3 rounded-lg border shadow-sm transition-all hover:shadow-md cursor-pointer hover:bg-slate-50 ${editingEntryId === journal.id ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/30' : 'border-slate-100'}`}
                            title="Click to view full details and modify"
                        >
                            <div className="flex justify-between items-start mb-2 pointer-events-none">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{new Date(journal.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    {journal.status && <span className="text-[10px] text-slate-400 font-semibold">{journal.status}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${journal.rating >= 7 ? 'bg-emerald-50 text-emerald-600' : journal.rating <= 4 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {journal.rating}/10
                                    </div>
                                    <div className="text-slate-300">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                            
                            {journal.imageUrl && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-slate-100 pointer-events-none">
                                    {/* Removed max-h-60 to show full image */}
                                    <img src={journal.imageUrl} alt="Date memory" className="w-full h-auto object-cover" />
                                </div>
                            )}

                            <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2 leading-relaxed pointer-events-none">{journal.notes}</p>
                            
                            {(journal.redFlags.length > 0 || journal.greenFlags.length > 0) && (
                                <div className="flex flex-wrap gap-1 mt-2 border-t border-slate-50 pt-2 pointer-events-none">
                                    {journal.redFlags.map((f, i) => (
                                        <span key={`r-${i}`} className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">{f}</span>
                                    ))}
                                    {journal.greenFlags.map((f, i) => (
                                        <span key={`g-${i}`} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">{f}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {person.entries.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        No entries yet. Click "Add Date" to start your journal!
                    </div>
                )}
            </div>
         </div>
      </div>

      {/* BESTIE AI FLOATING WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
          
          {/* Expanded Chat Window */}
          <div className={`${isChatOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'} transition-all duration-300 origin-bottom-right absolute bottom-16 right-0 w-[90vw] md:w-96 h-[60vh] md:h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden`}>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex justify-between items-center text-white shadow-sm">
                  <div className="flex items-center gap-2">
                      <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                          <h3 className="font-bold text-sm">Bestie AI Consultant</h3>
                          <p className="text-[10px] opacity-90">Always here for you</p>
                      </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                      <X className="w-4 h-4" />
                  </button>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                  {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                          <Bot className="w-10 h-10 text-indigo-300 mb-2" />
                          <p className="text-xs text-slate-500">
                             Hey! I'm here to help you analyze texts, spot red flags, or just vent about {person.name}.
                          </p>
                      </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-100'}`}>
                              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600"/> : <Bot className="w-4 h-4 text-indigo-600"/>}
                          </div>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                              msg.role === 'user' 
                              ? 'bg-rose-500 text-white rounded-tr-none' 
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                          }`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  {isChatLoading && (
                      <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4 text-indigo-600"/>
                          </div>
                          <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                              <div className="flex gap-1">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div className="p-3 bg-white border-t border-slate-200">
                  <div className="flex gap-2">
                      <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          placeholder="Vent here..."
                          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                      />
                      <button 
                        onClick={handleSendChat}
                        disabled={isChatLoading || !input.trim()}
                        className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>

          {/* Toggle Button */}
          <button 
             onClick={() => setIsChatOpen(!isChatOpen)}
             className={`flex items-center gap-2 px-5 py-3.5 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                 isChatOpen 
                 ? 'bg-slate-800 text-white pr-4' 
                 : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
             }`}
          >
             {isChatOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
             <span className="font-bold text-sm tracking-wide">
                 {isChatOpen ? 'Close Chat' : 'Ask Bestie AI'}
             </span>
          </button>
      </div>
    </div>
  );
};

export default DateDetail;