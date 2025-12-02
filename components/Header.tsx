import React from 'react';
import { Heart, BarChart2, Plus, List } from 'lucide-react';

interface HeaderProps {
  currentView: 'dashboard' | 'list' | 'form' | 'detail';
  setView: (view: 'dashboard' | 'list' | 'form' | 'detail') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 pb-safe">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setView('dashboard')}
        >
          <div className="bg-rose-500 p-1.5 rounded-lg">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            MyDating<span className="text-rose-500">Journal</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          <button
            onClick={() => setView('dashboard')}
            className={`p-2 rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-slate-100 text-rose-600' : 'text-slate-500 hover:bg-slate-50'}`}
            aria-label="Dashboard"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-md transition-colors ${currentView === 'list' ? 'bg-slate-100 text-rose-600' : 'text-slate-500 hover:bg-slate-50'}`}
            aria-label="List"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('form')}
            className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;