
import React from 'react';
import { PersonProfile } from '../types';
import { Calendar, MapPin, Star, AlertTriangle, CheckCircle } from 'lucide-react';

interface DateListProps {
  entries: PersonProfile[];
  onSelectEntry: (entry: PersonProfile) => void;
}

const DateList: React.FC<DateListProps> = ({ entries, onSelectEntry }) => {
  // Sort entries so highest latestRating comes first
  const sortedEntries = [...entries].sort((a, b) => b.latestRating - a.latestRating);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No people tracked yet. Add your first match!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedEntries.map((person) => (
        <div 
          key={person.id} 
          onClick={() => onSelectEntry(person)}
          className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col group"
        >
          <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
            <img 
              src={person.imageUrl} 
              alt={person.name} 
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm uppercase text-slate-700">
              {person.status}
            </div>
          </div>
          
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-slate-800">{person.name}</h3>
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                <span className="text-xs font-semibold text-slate-700">{person.latestRating}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(person.lastInteractionDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {person.platform}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                 <AlertTriangle className="w-3 h-3" />
                 <span className="font-semibold">{person.allRedFlags.length}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                 <CheckCircle className="w-3 h-3" />
                 <span className="font-semibold">{person.allGreenFlags.length}</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mt-auto">
              <span className="font-medium text-slate-800">{person.entries.length}</span> journal entries
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DateList;
