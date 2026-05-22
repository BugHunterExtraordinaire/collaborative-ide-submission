import http from 'http';
import WebSocket from 'ws';
import * as Y from 'yjs';

import { createClient } from 'redis';
import { applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';

import { config } from '../config/env';

import Session from '../models/Session';
import OperationLog from '../models/OperationLog';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupWSConnection, getYDoc } = require('y-websocket/bin/utils');

export const setupYjsWebSocket = async (server: http.Server) => {
  const pubClient = createClient({ url: config.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url;
    if (pathname && pathname.startsWith('/yjs/')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wss.handleUpgrade(request, socket as any, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  subClient.subscribe('yjs-updates', (message) => {
    try {
      const { sessionId, updateArray } = JSON.parse(message);
      const ydoc = getYDoc(sessionId, false);
      const updateBuffer = new Uint8Array(updateArray);
      Y.applyUpdate(ydoc, updateBuffer, 'redis');
    } catch (err) {
      console.error('Error applying Redis Yjs update:', err);
    }
  });

  subClient.subscribe('yjs-awareness', (message) => {
    try {
      const { sessionId, awarenessArray } = JSON.parse(message);
      const ydoc = getYDoc(sessionId, false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const awareness = (ydoc as any).awareness;

      if (awareness) {
        const updateBuffer = new Uint8Array(awarenessArray);
        applyAwarenessUpdate(awareness, updateBuffer, 'redis');
      }
    } catch (err) {
      console.error('Error applying Redis Awareness update:', err);
    }
  });

  const saveTimers = new Map<string, NodeJS.Timeout>();
  const operationBatches = new Map<string, Uint8Array[]>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wss.on('connection', (ws: WebSocket, req: any) => {
    const docName = req.url.slice(5).split('?')[0];
    console.log(`CRDT connection established for session: ${docName}`);

    const ydoc = getYDoc(docName, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(ydoc as any).hasDatabaseWired) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ydoc as any).hasDatabaseWired = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ydoc.on('update', async (update: Uint8Array, origin: any) => {
        if (origin !== 'redis' && origin !== 'db-load') {
          const payload = JSON.stringify({
            sessionId: docName,
            updateArray: Array.from(update)
          });
          pubClient.publish('yjs-updates', payload);

          if (!operationBatches.has(docName)) {
            operationBatches.set(docName, []);
          }
          operationBatches.get(docName)!.push(update);

          if (saveTimers.has(docName)) {
            clearTimeout(saveTimers.get(docName)!);
          }

          saveTimers.set(docName, setTimeout(async () => {
            try {
              const fullStateBuffer = Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
              await Session.findOneAndUpdate(
                { sessionId: docName },
                { state: fullStateBuffer },
                { upsert: true }
              );

              const batchToSave = operationBatches.get(docName) || [];
              if (batchToSave.length > 0) {
                operationBatches.set(docName, []);
                const mergedUpdate = Y.mergeUpdates(batchToSave);

                await OperationLog.create({
                  sessionId: docName,
                  operationData: Buffer.from(mergedUpdate)
                });
              }

            } catch (saveErr) {
              console.error('Error saving state/logs to MongoDB:', saveErr);
            }
          }, 200)); 
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const awareness = (ydoc as any).awareness;
      if (awareness) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
          if (origin !== 'redis') {
            const changedClients = added.concat(updated).concat(removed);
            const awarenessUpdate = encodeAwarenessUpdate(awareness, changedClients);

            const payload = JSON.stringify({
              sessionId: docName,
              awarenessArray: Array.from(awarenessUpdate)
            });
            pubClient.publish('yjs-awareness', payload);
          }
        });
      }

      Session.findOne({ sessionId: docName }).then(session => {
        if (session && session.state) {
          Y.applyUpdateV2(ydoc, new Uint8Array(session.state), 'db-load');
          console.log(`Loaded historical state for session: ${docName}`);
        }
      }).catch(err => console.error('Error loading from MongoDB:', err));
    }

    setupWSConnection(ws, req, { docName });
  });
};