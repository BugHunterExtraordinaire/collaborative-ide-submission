import { useContext, useState } from 'react';

import File from './File';

import { WorkspaceContext } from '../../contexts/WorkspaceContext';

import type { WorkspaceProps } from '../../types/interfaces';

export default function FileTabs() {

  const { localDoc, files, safeActiveFile, isPlaybackMode, setActiveFile } = useContext(WorkspaceContext) as WorkspaceProps;

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleAdd: React.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (newFileName.trim() && !files.includes(newFileName.trim())) {
      localDoc?.getArray<string>('file-list').push([newFileName.trim()]);
      setActiveFile(newFileName.trim())
      setNewFileName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto text-sm scrollbar-hide" role='tablist' aria-controls='editor-selected-file'>
      {files.map(file => <File 
                            key={file} 
                            file={file} 
                            safeActiveFile={safeActiveFile} 
                            setActiveFile={setActiveFile} 
                          />)}
      {!isPlaybackMode && (
        isAdding ? (
          <form onSubmit={handleAdd} className="flex items-center px-2">
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => setIsAdding(false)}
              className="bg-zinc-800 text-white px-2 py-1 rounded outline-none text-xs w-28 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. utils.cpp"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-2 text-zinc-500 hover:text-zinc-300 transition-colors font-bold"
            title="New File"
          >
            <span className='sr-only'>Add a new code file</span>
            <span aria-hidden='true'>+</span>
          </button>
        )
      )}
    </div>
  );
}