import { useContext, useState } from 'react';
import type { WorkspaceProps } from '../../types/interfaces';
import InstructorAnalyticsModal from './InstructorAnalyticsModal';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';

export default function EditorToolbar() {
  const { user, currentRoom, isPlaybackMode, language, historyLogs, sessionName, yjsStatus, setCurrentRoom, setIsPlaybackMode, setPlaybackIndex } = useContext(WorkspaceContext) as WorkspaceProps;

  const [showAnalytics, setShowAnalytics] = useState(false);
  const isPrivileged = user.role === 'Instructor' || user.role === 'System Administrator';

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <>
      <header className="relative px-3 py-2 md:px-5 md:py-2.5 bg-zinc-950 flex flex-wrap lg:flex-nowrap justify-between items-center border-b border-zinc-800 gap-2 lg:gap-4">
        
        <section className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0 flex-1" aria-label='Session Information'>

          <div className="flex lg:hidden items-center gap-1.5 shrink-0" role="status" aria-live="polite" title={`Connection: ${yjsStatus}`}>
             <span className={`w-2 h-2 rounded-full ${yjsStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} aria-hidden='true'></span>
          </div>

          <p className="font-semibold text-xs md:text-base truncate max-w-[120px] md:max-w-xs">
            {sessionName}
          </p>
          
          <p className="text-zinc-500 text-[10px] md:text-xs font-mono bg-zinc-900 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-zinc-800 truncate max-w-[80px] md:max-w-[150px]">
            {currentRoom}
          </p>
          
          <p className="text-blue-400 text-[8px] md:text-[10px] font-bold uppercase tracking-wider border border-blue-900/50 bg-blue-900/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded shrink-0">
            <span className='sr-only'>Coding session language: </span>{language}
          </p>
        </section>

        <section className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0" aria-label='Session Settings'>
          {isPrivileged && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="px-2 py-1 md:px-3 md:py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] md:text-xs font-semibold rounded border border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-chart-bar text-red-400" aria-hidden='true' />
              <span className="hidden sm:inline">Session Data</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsPlaybackMode(!isPlaybackMode);
              setPlaybackIndex(Math.max(0, historyLogs.length - 1));
            }}
            className={`px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all cursor-pointer border ${isPlaybackMode
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
              : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            {isPlaybackMode ? '⏹ Exit Playback' : '▶ Playback Mode'}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="px-2 py-1 md:px-3 md:py-1.5 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50 text-[10px] md:text-xs font-bold rounded transition-all cursor-pointer"
          >
            Leave Room
          </button>
        </section>

        <div 
          className="hidden lg:flex absolute top-full -mt-2 mr-1 right-4 z-50 items-center gap-1.5 px-2 py-1 bg-black/80 backdrop-blur-sm border border-zinc-700 shadow-lg rounded font-mono text-xs" 
          role="status" 
          aria-live="polite"
        >
          <span className={`w-2 h-2 rounded-full ${yjsStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} aria-hidden='true'></span>
          <span className="text-zinc-300">{yjsStatus}</span>
        </div>

      </header>

      {showAnalytics && <InstructorAnalyticsModal setShowAnalytics={setShowAnalytics} />}
    </>
  );
}