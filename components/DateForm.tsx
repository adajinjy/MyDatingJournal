import React, { useState } from 'react';
import { PersonProfile, DateStatus, Platform, JournalEntry } from '../types';
import { analyzeNotes } from '../services/geminiService';
import { Sparkles, X, Plus, Save, Loader2, Briefcase, Building, Phone, Camera, Image as ImageIcon } from 'lucide-react';

interface DateFormProps {
  existingPerson?: PersonProfile | null;
  onSave: (person: PersonProfile) => void;
  onCancel: () => void;
}

const DateForm: React.FC<DateFormProps> = ({ existingPerson, onSave, onCancel }) => {
  // Person Bio State
  const [name, setName] = useState(existingPerson?.name || '');
  const [platform, setPlatform] = useState<Platform>(existingPerson?.platform || Platform.TINDER);
  const [status, setStatus] = useState<DateStatus>(existingPerson?.status || DateStatus.MATCHED);
  const [jobTitle, setJobTitle] = useState(existingPerson?.jobTitle || '');
  const [company, setCompany] = useState(existingPerson?.company || '');
  const [phoneNumber, setPhoneNumber] = useState(existingPerson?.phoneNumber || '');
  const [imageUrl, setImageUrl] = useState(existingPerson?.imageUrl || '');

  // First Entry State
  const isNewPerson = !existingPerson;

  const [dateOfInteraction, setDateOfInteraction] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [entryImageUrl, setEntryImageUrl] = useState('');
  
  const [newRedFlag, setNewRedFlag] = useState('');
  const [newGreenFlag, setNewGreenFlag] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setFunc: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; // slightly larger for potential detailed date pics

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
          // Compress to JPEG 0.7 quality
          setFunc(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!notes.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeNotes(notes);
      setRedFlags(prev => Array.from(new Set([...prev, ...result.redFlags])));
      setGreenFlags(prev => Array.from(new Set([...prev, ...result.greenFlags])));
      setRating(result.sentimentScore);
    } catch (error) {
      console.error(error);
      alert("Could not analyze notes. Check API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Capture any pending manual inputs that haven't been "added" yet
    let finalRedFlags = [...redFlags];
    if (newRedFlag.trim()) {
        finalRedFlags.push(newRedFlag.trim());
        setNewRedFlag('');
    }

    let finalGreenFlags = [...greenFlags];
    if (newGreenFlag.trim()) {
        finalGreenFlags.push(newGreenFlag.trim());
        setNewGreenFlag('');
    }

    let finalEntries: JournalEntry[] = existingPerson ? [...existingPerson.entries] : [];
    let allRed = existingPerson ? [...existingPerson.allRedFlags] : [];
    let allGreen = existingPerson ? [...existingPerson.allGreenFlags] : [];
    let latestRate = existingPerson ? existingPerson.latestRating : rating;
    let lastDate = existingPerson ? existingPerson.lastInteractionDate : dateOfInteraction;

    // If creating a new person, add the initial entry
    if (isNewPerson) {
        const firstEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: dateOfInteraction,
            rating,
            status: status, // Use the status selected in the form
            notes,
            redFlags: finalRedFlags,
            greenFlags: finalGreenFlags,
            createdAt: Date.now(),
            imageUrl: entryImageUrl
        };
        finalEntries = [firstEntry];
        allRed = finalRedFlags;
        allGreen = finalGreenFlags;
        latestRate = rating;
        lastDate = dateOfInteraction;
    }

    const person: PersonProfile = {
      id: existingPerson?.id || crypto.randomUUID(),
      name,
      platform,
      status, // This is the current status
      jobTitle,
      company,
      phoneNumber,
      imageUrl: imageUrl || `https://picsum.photos/seed/${name}/400/400`,
      
      latestRating: latestRate,
      lastInteractionDate: lastDate,
      entries: finalEntries,
      allRedFlags: allRed,
      allGreenFlags: allGreen,
      aiSummary: existingPerson?.aiSummary
    };
    onSave(person);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">
          {isNewPerson ? 'New Person Entry' : 'Edit Person Profile'}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Profile Picture Upload */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-2 group">
            <img 
                src={imageUrl || (name ? `https://picsum.photos/seed/${name}/400/400` : 'https://via.placeholder.com/400')} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full border-4 border-slate-100 shadow-sm"
            />
            <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full border border-slate-200 shadow-md cursor-pointer hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setImageUrl)} />
            </label>
          </div>
          <span className="text-xs text-slate-500 font-medium">Tap camera to upload</span>
        </div>

        {/* Basic Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="e.g. Alex"
            />
          </div>
           {/* Status & Platform */}
           <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
                <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Status</label>
                <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DateStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                {Object.values(DateStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
          </div>
        </div>

        {/* Career & Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                   <Briefcase className="w-3 h-3" /> Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Marketing Manager"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                   <Building className="w-3 h-3" /> Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Acme Corp"
                />
             </div>
          </div>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                   <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="555-0123"
                />
             </div>
          </div>
        </div>

        {/* First Entry Section - Only show when creating new */}
        {isNewPerson && (
            <div className="border-t border-slate-200 pt-6">
                <h3 className="text-md font-bold text-slate-800 mb-4">Initial Date Details</h3>
                
                <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input
                        type="date"
                        value={dateOfInteraction}
                        onChange={(e) => setDateOfInteraction(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vibe Check (1-10)</label>
                        <input
                        type="number"
                        min="1"
                        max="10"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">Journal Notes</label>
                        <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !notes}
                        className="text-xs flex items-center gap-1 text-rose-600 font-semibold hover:bg-rose-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        AI Analyze
                        </button>
                    </div>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="First impression notes..."
                    />
                </div>

                {/* Entry Image Upload */}
                <div className="mb-4">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Photo from date (optional)</label>
                   <div className="flex items-start gap-4">
                      <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                          <span className="text-[10px] text-slate-500 mt-1">Upload</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setEntryImageUrl)} />
                      </label>
                      {entryImageUrl && (
                          <div className="relative w-20 h-20">
                              <img src={entryImageUrl} alt="Date" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                              <button 
                                type="button"
                                onClick={() => setEntryImageUrl('')}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm border border-slate-200 hover:text-rose-600"
                              >
                                  <X className="w-3 h-3" />
                              </button>
                          </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Red Flags */}
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                        <label className="block text-xs font-bold text-rose-800 mb-2">🚩 Red Flags</label>
                        <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newRedFlag}
                            onChange={(e) => setNewRedFlag(e.target.value)}
                            className="flex-1 text-xs px-2 py-1 border border-rose-200 rounded"
                            placeholder="Add red flag..."
                            onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newRedFlag.trim()) {
                                setRedFlags([...redFlags, newRedFlag.trim()]);
                                setNewRedFlag('');
                                }
                            }
                            }}
                        />
                        <button 
                            type="button"
                            onClick={() => {
                            if (newRedFlag.trim()) {
                                setRedFlags([...redFlags, newRedFlag.trim()]);
                                setNewRedFlag('');
                            }
                            }}
                            className="bg-rose-200 text-rose-800 p-1 rounded hover:bg-rose-300"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {redFlags.map((flag, i) => (
                            <span key={i} className="bg-white text-rose-600 text-xs px-2 py-1 rounded border border-rose-200 flex items-center gap-1">
                            {flag}
                            <button 
                                type="button" 
                                onClick={() => setRedFlags(redFlags.filter((_, idx) => idx !== i))}
                                className="hover:text-rose-800"
                            >
                                ×
                            </button>
                            </span>
                        ))}
                        </div>
                    </div>

                    {/* Green Flags */}
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <label className="block text-xs font-bold text-emerald-800 mb-2">💚 Green Flags</label>
                        <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newGreenFlag}
                            onChange={(e) => setNewGreenFlag(e.target.value)}
                            className="flex-1 text-xs px-2 py-1 border border-emerald-200 rounded"
                            placeholder="Add green flag..."
                            onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newGreenFlag.trim()) {
                                setGreenFlags([...greenFlags, newGreenFlag.trim()]);
                                setNewGreenFlag('');
                                }
                            }
                            }}
                        />
                        <button 
                            type="button"
                            onClick={() => {
                            if (newGreenFlag.trim()) {
                                setGreenFlags([...greenFlags, newGreenFlag.trim()]);
                                setNewGreenFlag('');
                            }
                            }}
                            className="bg-emerald-200 text-emerald-800 p-1 rounded hover:bg-emerald-300"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {greenFlags.map((flag, i) => (
                            <span key={i} className="bg-white text-emerald-600 text-xs px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                            {flag}
                            <button 
                                type="button" 
                                onClick={() => setGreenFlags(greenFlags.filter((_, idx) => idx !== i))}
                                className="hover:text-emerald-800"
                            >
                                ×
                            </button>
                            </span>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default DateForm;