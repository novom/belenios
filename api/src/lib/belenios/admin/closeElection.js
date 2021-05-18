import fs from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { 
  ELECTIONS_DIR,
  PARTIAL_DECRYPTIONS_FILE_NAME, 
  PRIV_KEYS_FILE_NAME,
  RESULT_FILE_NAME
} from '../global'

function executeCloseElection(privateKeysFileName, partialDecryptionsFilePath, resultFilePath, electionDir, callback) {
  const parameters = [
    privateKeysFileName, 
    partialDecryptionsFilePath, 
    resultFilePath,
    electionDir
  ];

  execFile('api/src/scripts/closeElection.sh', parameters, (error, stdout) => {
    if (error) {
      callback({ status: 'FAILED', error });
      return;
    }
    const result = JSON.parse(stdout);
    if(result && result.result) {
      callback({ status: 'OK', payload: result.result });
    } else {
      callback({ status: 'FAILED', payload: 'Invalid result' });
    }
  });
}

function closeElection(electionId, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }
  
    const privateKeysFileName = path.join(electionDir, PRIV_KEYS_FILE_NAME);
    const partialDecryptionsFilePath = path.join(electionDir, PARTIAL_DECRYPTIONS_FILE_NAME);
    const resultFilePath = path.join(electionDir, RESULT_FILE_NAME);

    executeCloseElection(privateKeysFileName, partialDecryptionsFilePath, resultFilePath, electionDir, callback);

  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default closeElection;
