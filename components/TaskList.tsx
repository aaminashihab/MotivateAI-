"use client";
import { useState } from 'react';

export type Task = {
  title: string;
  duration: number; // in minutes
  details: string;
};

export default function TaskList({ tasks, activeIndex }: { tasks: Task[], activeIndex: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="glass-panel">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Your Action Plan</h2>
          <p className="text-slate-400 text-sm md:text-base">Focus on one step at a time.</p>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden min-h-[48px] px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm"
        >
          {isExpanded ? 'Hide' : 'Show'} Plan
        </button>
      </div>
      
      <ul className={`task-list ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {tasks.map((task, index) => (
          <li 
            key={index} 
            className={`task-item group p-4 md:p-6 bg-white/5 border border-white/10 rounded-xl mb-4 flex flex-col sm:flex-row justify-between sm:align-center transition-all relative overflow-hidden ${index === activeIndex ? 'bg-slate-700/80 border-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02] z-10' : 'hover:bg-white/10'} ${index < activeIndex ? 'opacity-60' : ''}`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 bg-accent transform scale-y-0 origin-top transition-transform ${index === activeIndex ? 'scale-y-100' : 'group-hover:scale-y-100'}`}></div>
            <div className="task-info flex-1 pr-4 mb-2 sm:mb-0">
              <h3 className={`text-lg md:text-xl font-semibold mb-1 ${index < activeIndex ? 'line-through text-slate-400' : ''}`}>
                {index + 1}. {task.title}
              </h3>
              <p className="text-slate-400 text-sm md:text-base">{task.details}</p>
            </div>
            <div className="task-duration bg-black/30 px-3 py-1 rounded-lg font-semibold text-sm self-start sm:self-center shrink-0">
              {task.duration} min
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
