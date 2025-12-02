
import React, { useMemo } from 'react';
import { PersonProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Calendar, Users } from 'lucide-react';

interface DashboardProps {
  people: PersonProfile[];
}

const COLORS = ['#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];

const Dashboard: React.FC<DashboardProps> = ({ people }) => {
  
  const stats = useMemo(() => {
    const totalPeople = people.length;
    // Sum all entries across all people
    const totalDates = people.reduce((acc, p) => acc + p.entries.length, 0);
    const totalRedFlags = people.reduce((acc, p) => acc + p.allRedFlags.length, 0);
    const totalGreenFlags = people.reduce((acc, p) => acc + p.allGreenFlags.length, 0);
    
    // Avg rating based on latest ratings of people
    const avgRating = totalPeople > 0 
      ? (people.reduce((acc, p) => acc + p.latestRating, 0) / totalPeople).toFixed(1) 
      : '0';

    return { totalPeople, totalDates, totalRedFlags, totalGreenFlags, avgRating };
  }, [people]);

  const statusData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    people.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [people]);

  const recentRatingsData = useMemo(() => {
    return people
      .sort((a, b) => new Date(b.lastInteractionDate).getTime() - new Date(a.lastInteractionDate).getTime())
      .slice(0, 7)
      .map(p => ({
        name: p.name.split(' ')[0],
        rating: p.latestRating
      }));
  }, [people]);

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">No dating history yet</h3>
        <p className="text-slate-500 max-w-md">
          Start your journal by adding a new person you are talking to.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs uppercase font-bold tracking-wider">
            <Users className="w-4 h-4" /> Active People
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalPeople}</div>
          <div className="text-xs text-slate-400 mt-1">{stats.totalDates} dates logged</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500 mb-1 text-xs uppercase font-bold tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Total Red Flags
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalRedFlags}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-1 text-xs uppercase font-bold tracking-wider">
            <CheckCircle className="w-4 h-4" /> Total Green Flags
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalGreenFlags}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 mb-1 text-xs uppercase font-bold tracking-wider">
            <TrendingUp className="w-4 h-4" /> Avg Rating
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.avgRating}<span className="text-sm text-slate-400 font-normal">/10</span></div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rating Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Latest Vibe Checks</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentRatingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  hide 
                  domain={[0, 10]} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', radius: 4 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="rating" 
                  fill="#f43f5e" 
                  radius={[6, 6, 6, 6]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Relationship Status</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
