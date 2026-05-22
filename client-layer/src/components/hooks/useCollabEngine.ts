import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef, useState } from 'react';

export function useCollabEngine(currentRoom: string | null) {
  const [status, setStatus] = useState<string>('Disconnected');
  const [localDoc, setLocalDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  
  const [isSynced, setIsSynced] = useState<boolean>(false); 

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentRoom) return;

    let isMounted = true;

    const newLocalDoc = new Y.Doc();
    const networkDoc = new Y.Doc();

    const socketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost';

    const newProvider = new WebsocketProvider(
      socketUrl,
      `yjs/${currentRoom}`,
      networkDoc
    );

    newProvider.on('status', (event: { status: string }) => {
      if (isMounted) {
        setStatus(event.status.charAt(0).toUpperCase() + event.status.slice(1));
      }
    });

    newProvider.on('sync', (synced: boolean) => {
      if (isMounted) {
        setIsSynced(synced);
      }
    });

    const outboundBuffer = { current: [] as Uint8Array[] };

    newLocalDoc.on('update', (update: Uint8Array, origin: string) => {
      if (origin !== 'network') {
        outboundBuffer.current.push(update);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (outboundBuffer.current.length > 0) {
            const mergedUpdate = Y.mergeUpdates(outboundBuffer.current);
            outboundBuffer.current = [];
            Y.applyUpdate(networkDoc, mergedUpdate, 'local');
          }
        }, 200);
      }
    });

    networkDoc.on('update', (update: Uint8Array, origin: string) => {
      if (origin !== 'local') {
        Y.applyUpdate(newLocalDoc, update, 'network');
      }
    });

    Promise.resolve().then(() => {
      if (isMounted) {
        setLocalDoc(newLocalDoc);
        setProvider(newProvider);
      }
    });

    return () => {
      isMounted = false;
      newProvider.disconnect();
      newProvider.destroy();
      newLocalDoc.destroy();
      networkDoc.destroy();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setLocalDoc(null);
      setProvider(null);
      setIsSynced(false);
    };
  }, [currentRoom]);

  const displayStatus = currentRoom ? status : 'Disconnected';

  return { status: displayStatus, localDoc, provider, isSynced }; 
}
