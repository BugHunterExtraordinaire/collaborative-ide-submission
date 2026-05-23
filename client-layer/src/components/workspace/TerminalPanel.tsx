import axios from 'axios';
import { useContext, useState } from 'react';
import type { WorkspaceProps } from '../../types/interfaces';
import { WorkspaceContext } from '../../contexts/WorkspaceContext';

export default function TerminalPanel() {
  const { localDoc, files, language, currentRoom, user, socket, isPlaybackMode } = useContext(WorkspaceContext) as WorkspaceProps;

  const [output, setOutput] = useState<string>('System Ready. Awaiting execution...');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunCode = async () => {
    if (!localDoc) return;
    setIsRunning(true);
    setOutput('Spawning isolated container...\nExecuting...');

    try {
      const filesPayload = files.map(fileName => ({
        name: fileName,
        content: localDoc.getText(fileName).toString()
      }));

      const response = await axios.post("/execute", {
        files: filesPayload,
        language,
        sessionId: currentRoom
      });

      const resultOutput = response.data.output || 'Execution successful (No output)';
      setOutput(resultOutput);

      if (socket && user?.role !== "System Administrator") {
        socket.emit('broadcast-execution', {
          sessionId: currentRoom,
          output: `[${user?.username} Broadcast]:\n${resultOutput}`
        });
      }

    } catch (error: unknown) {
      const errorMsg = axios.isAxiosError(error) ? (error.response?.data?.message || 'Error') : 'Error';
      setOutput(errorMsg);

      if (socket && user?.role !== "System Administrator") {
        socket.emit('broadcast-execution', {
          sessionId: currentRoom,
          output: `[${user?.username} Broadcast Failed]:\n${errorMsg}`
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  socket?.on("receive-execution", ({ output }) => {
    setOutput(output);
  });

  return (
    <aside className="flex flex-col h-full border-b border-zinc-800" aria-labelledby='terminal-header'>
      <header className="p-3 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center">
        <h3 className="m-0 text-sm font-bold text-zinc-100 uppercase tracking-wider" id='terminal-header'>Terminal Output</h3>
        <button
          onClick={handleRunCode}
          disabled={isRunning || isPlaybackMode}
          className={`px-4 py-1.5 text-sm font-bold rounded transition-colors ${isRunning || isPlaybackMode
              ? 'bg-zinc-600 cursor-not-allowed text-zinc-400'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer text-white'
            }`}
        >
          {isRunning ? 'Running...' : 'Run Code ▶'}
        </button>
      </header>
      <pre className="p-4 m-0 grow overflow-y-auto text-zinc-300 whitespace-pre-wrap font-mono text-sm bg-black" role='log' aria-live={output.toLowerCase().includes("error") ? "assertive" : "polite"}>
        {output}
      </pre>
    </aside>
  );
}