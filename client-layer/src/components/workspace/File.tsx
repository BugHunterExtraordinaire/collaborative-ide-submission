import type { FileProps } from '../../types/interfaces'

export default function File({ file, safeActiveFile, setActiveFile }: FileProps) {
  return (
    <button
      role='tab'
      onClick={() => setActiveFile(file)}
      className={`px-4 py-2 border-r border-zinc-800 transition-colors shrink-0 ${safeActiveFile === file
        ? 'bg-zinc-900 text-blue-400 border-t-2 border-t-blue-500'
        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300'
        }`}
      aria-selected={safeActiveFile === file}
      aria-label={`Open File: ${file}`}
    >
      {file}
    </button>
  );
}