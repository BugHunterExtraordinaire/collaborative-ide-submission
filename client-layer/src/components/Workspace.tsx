import * as Y from 'yjs';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Editor } from "@monaco-editor/react";
import EditorToolbar from "./workspace/EditorToolbar";
import FileTabs from "./workspace/FileTabs";
import PlaybackScrubber from "./workspace/PlaybackScrubber";
import CollaborativeEditor from "./workspace/CollaborativeEditor";
import TerminalPanel from "./workspace/TerminalPanel";
import Chat from "./workspace/Chat";

import { useCollabEngine } from './hooks/useCollabEngine';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import type { WorkspaceComponentProps } from "../types/interfaces";
import type { HistoryLogArray } from '../types/arrays';

export default function Workspace({ currentRoom, user, setCurrentRoom }: WorkspaceComponentProps) {
  const [files, setFiles] = useState<Array<string>>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [isPlaybackMode, setIsPlaybackMode] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  const { status: yjsStatus, localDoc, provider, isSynced } = useCollabEngine(currentRoom);

  const playbackDocRef = useRef<Y.Doc>(new Y.Doc());
  const currentPlaybackIndex = useRef<number>(-1);

  useEffect(() => {
    if (currentRoom && user) {
      const socketUrl = import.meta.env.VITE_WS_URL || "ws://localhost";
      const newSocket = io(socketUrl, { forceNew: true });
      newSocket.on('connect', () => setSocket(newSocket));

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [currentRoom, user]);

  const { data: historyLogs = [] } = useQuery<HistoryLogArray>({
    queryKey: ['session-history', currentRoom],
    queryFn: async () => {
      const res = await axios.get(`/sessions/${currentRoom}/history`);
      setPlaybackIndex(Math.max(0, res.data.length - 1));
      return res.data;
    },
    enabled: isPlaybackMode && !!currentRoom,
    refetchOnWindowFocus: false,
  });

  const { data: sessionDetails, isSuccess: isSessionLoaded } = useQuery({
    queryKey: ['session-details', currentRoom],
    queryFn: async () => {
      const res = await axios.get(`/sessions/${currentRoom}`);
      return res.data;
    },
    enabled: !!currentRoom,
  });

  const language: string = (sessionDetails?.session?.language || 'JavaScript').toLowerCase();
  const sessionName: string = sessionDetails?.session.name || "Unknown";

  useEffect(() => {
    if (!localDoc) return;
    
    const yFilesMap = localDoc.getMap<boolean>('file-system');

    const updateFiles = () => {
      const uniqueFiles = Array.from(yFilesMap.keys());
      if (uniqueFiles.length > 0) {
        setFiles(uniqueFiles);
        setActiveFile(prevActive => (!prevActive || !uniqueFiles.includes(prevActive)) ? uniqueFiles[0] : prevActive);
      }
    };

    yFilesMap.observe(updateFiles);
    updateFiles();

    if (isSynced && isSessionLoaded && Array.from(yFilesMap.keys()).length === 0) {
      const defaultFile = language === 'python' ? 'main.py' : language === 'javascript' ? 'main.js' : 'main.cpp';
      yFilesMap.set(defaultFile, true); 
    }

    return () => yFilesMap.unobserve(updateFiles);
  }, [localDoc, language, isSynced, isSessionLoaded]);

  const safeActiveFile = activeFile || files[0] || '';

  const playbackCode = useMemo(() => {
    if (!isPlaybackMode || historyLogs.length === 0) return 'Loading history...';
    
    const tempDoc = playbackDocRef.current;

    if (playbackIndex > currentPlaybackIndex.current) {
      for (let i = currentPlaybackIndex.current + 1; i <= playbackIndex; i++) {
        const log = historyLogs[i];
        if (log && log.operationData && log.operationData.data) {
          const updateBuffer = new Uint8Array(log.operationData.data);
          Y.applyUpdate(tempDoc, updateBuffer);
        }
      }
    } 
    else if (playbackIndex < currentPlaybackIndex.current) {
      playbackDocRef.current = new Y.Doc();
      const newTempDoc = playbackDocRef.current;
      for (let i = 0; i <= playbackIndex; i++) {
        const log = historyLogs[i];
        if (log && log.operationData && log.operationData.data) {
          const updateBuffer = new Uint8Array(log.operationData.data);
          Y.applyUpdate(newTempDoc, updateBuffer);
        }
      }
    }

    currentPlaybackIndex.current = playbackIndex;
    return playbackDocRef.current.getText(safeActiveFile).toString();
  }, [playbackIndex, historyLogs, isPlaybackMode, safeActiveFile]);

  return (
    <>
      <title>{sessionName}</title>
      <WorkspaceContext.Provider value={{
        yjsStatus, currentRoom, language, isPlaybackMode, playbackIndex,
        playbackCode, localDoc, provider, socket, historyLogs, user, files,
        safeActiveFile, sessionName, setActiveFile, setIsPlaybackMode, setPlaybackIndex,
        setCurrentRoom, setFiles
      }}>
        <main className="flex h-screen bg-black text-white font-sans overflow-hidden">
          <section className="w-3/5 border-r border-zinc-800 flex flex-col bg-zinc-900"
            aria-label="Code Editor and File Management">
            <div className="absolute top-10 right-[41%] z-10 text-xs font-mono px-2 py-1 bg-black/50 rounded border border-zinc-700 flex items-center gap-2"
              role="status"
              aria-live="polite">
              <span className={`w-2 h-2 rounded-full ${yjsStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} aria-hidden='true'></span>
              <span className="sr-only">Connection Status: </span>{yjsStatus}
            </div>

            <EditorToolbar />
            <FileTabs />
            {isPlaybackMode && <PlaybackScrubber />}

            <div className="grow relative">
              {isPlaybackMode ? (
                <Editor
                  height="100%" theme="vs-dark" language={language.toLowerCase()}
                  path={safeActiveFile} value={playbackCode}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
                />
              ) : (<CollaborativeEditor />)}
            </div>
          </section>

          <aside className="w-2/5 flex flex-col bg-zinc-900">
            <TerminalPanel />
            <div className="h-1/2 flex flex-col border-t border-zinc-800">
              <Chat />
            </div>
          </aside>
        </main>
      </WorkspaceContext.Provider>
    </>
  );
}