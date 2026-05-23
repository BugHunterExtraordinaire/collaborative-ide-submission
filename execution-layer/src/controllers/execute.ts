import Docker from 'dockerode';

import { config } from '../config/env';
import { docker, ensureImageExists } from '../services/dockerService';

import { ExecutionRequest } from '../types/interfaces';
import { DefaultController } from '../types/functions';
import { ApiError, 
         ExecutionTimeoutError, 
         MissingRequestBodyInfoError, 
         UnsupportedLanguageError 
        } from '../types/errors';

export const executeCode: DefaultController = async (req, res, next) => {
  const { files, language } = req.body as ExecutionRequest;

  if (!files || files.length === 0 || !language) throw new MissingRequestBodyInfoError("Please provide all the files and language");

  let dockerImg: string = "";
  let executionCmd: Array<string> = [];

  const fileCreationCmds = files.map(f => {
    const safeName = f.name.replace(/[^a-zA-Z0-9_.-]/g, '');
    const b64 = Buffer.from(f.content).toString('base64');
    return `echo '${b64}' | base64 -d > ${safeName}`;
  }).join(' && ');

  const rawMainFile = files.find(f => f.name.startsWith('main'))?.name || files[0].name;
  const mainFile = rawMainFile.replace(/[^a-zA-Z0-9_.-]/g, '');

  if (language === 'python') {
    dockerImg = 'python:3.9-alpine';
    executionCmd = ['sh', '-c', `${fileCreationCmds} && python ${mainFile}`];
  } else if (language === 'javascript') {
    dockerImg = 'node:18-alpine';
    executionCmd = ['sh', '-c', `${fileCreationCmds} && node ${mainFile}`];
  } else if (language === 'c++') {
    dockerImg = 'frolvlad/alpine-gxx';
    executionCmd = ['sh', '-c', `${fileCreationCmds} && g++ *.cpp -o main && ./main`];
  } else {
    throw new UnsupportedLanguageError("Unsupported language please choose one of the supported languages");
  }

  let container: Docker.Container | null = null;

  try {
    await ensureImageExists(dockerImg); // ensures that language docker image in present, if not pull it from the web

    container = await docker.createContainer({
      Image: dockerImg,
      Cmd: executionCmd,
      Env: ["FORCE_COLOR=0"],
      Tty: false,
      HostConfig: {
        Memory: config.EXEC_MEMORY_MB * 1024 * 1024, // limit memory to prevent resource exhaustion attacks
        MemorySwap: config.EXEC_MEMORY_MB * 1024 * 1024, 
        PidsLimit: 50,
        NanoCpus: config.EXEC_CPUS * 1e9, 
        NetworkMode: 'none' // creates an isolated network namespace, preventing the container from accessing the internal host network or making outbound HTTP requests to internal services (SSRF protection).
      }
    });

    await container.start();

    const waitPromise = container.wait().catch(() => null);

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(async () => {
        try {
          await container?.kill();
        } catch (e) { } 
        reject(new ExecutionTimeoutError(`Execution timed out (Limit: ${config.EXEC_TIMEOUT_MS / 1000} seconds).`));
      }, config.EXEC_TIMEOUT_MS);
    });

    await Promise.race([
      waitPromise,
      timeoutPromise
    ]);

    clearTimeout(timer!);

    let logs: Buffer | string = "";
    try {
      logs = await container.logs({ stdout: true, stderr: true });
    } catch (logErr) {
      logs = Buffer.from("Process terminated abruptly (Possible Out-Of-Memory or OS Kill).");
    }
    
    let output = "";
    if (Buffer.isBuffer(logs)) {
      let offset = 0;
      while (offset < logs.length) {
        const payloadLength = logs.readUInt32BE(offset + 4);
        output += logs.toString('utf8', offset + 8, offset + 8 + payloadLength);
        offset += 8 + payloadLength;
      }
    } else {
      output = String(logs);
    }
    
    output = output.replace(/\x1b\[[0-9;]*m/g, "").trim();
    
    res.status(200).json({ output });
  } catch (error: any) {
    if (error instanceof ApiError) {
      next!(error);
    } else {
      throw new ApiError(`Execution error: ${error.message}`, 500);
    }
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
        console.log(`Container cleaned up successfully.`);
      } catch (cleanupError) {
        console.error(`Failed to cleanup container: ${cleanupError}`);
      }
    }
  }
};