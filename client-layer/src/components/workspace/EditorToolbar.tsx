import { useContext, useState } from 'react';
import type { WorkspaceProps } from '../../types/interfaces';
import InstructorAnalyticsModal from './InstructorAnalyticsModal';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';

export default function EditorToolbar() {
  const { user, currentRoom, isPlaybackMode, language, historyLogs, sessionName, setCurrentRoom, setIsPlaybackMode, setPlaybackIndex } = useContext(WorkspaceContext) as WorkspaceProps;

  const [showAnalytics, setShowAnalytics] = useState(false);
  const isPrivileged = user.role === 'Instructor' || user.role === 'System Administrator';

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <>
      <header className="px-5 py-2.5 bg-zinc-950 flex justify-between items-center border-b border-zinc-800">
        <section className="flex flex-wrap items-center gap-3" aria-label='Session Information'>
          <p>{sessionName}</p>
          <p className="text-zinc-500 text-xs font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            {currentRoom}
          </p>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-900/50 bg-blue-900/20 px-2 py-1 rounded">
            <span className='sr-only'>Coding session language: </span>
            {language}
          </p>
        </section>

        <section className="flex items-center gap-3" aria-label='Session Settings'>
          {isPrivileged && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded border border-zinc-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-chart-bar text-red-400" aria-hidden='true' />Session Data
            </button>
          )}

          <button
            onClick={() => {
              setIsPlaybackMode(!isPlaybackMode);
              setPlaybackIndex(Math.max(0, historyLogs.length - 1));
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer border ${isPlaybackMode
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
              : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            {isPlaybackMode ? '⏹ Exit Playback' : '▶ Playback Mode'}
          </button>

          <div className="ml-1 pl-2 flex items-center gap-3">
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50 text-xs font-bold rounded transition-all cursor-pointer"
            >
              Leave Room
            </button>
          </div>
        </section>
      </header>

      {showAnalytics && (
        <InstructorAnalyticsModal setShowAnalytics={setShowAnalytics} />
      )}
    </>
  );
}