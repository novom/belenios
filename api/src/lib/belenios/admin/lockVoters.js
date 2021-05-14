
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { VOTERS_FILE_NAME, ELECTIONS_DIR } from '../global'

function executeMakeTrustees(electionId, votersFilePath, electionDir, callback) {
  execFile('api/src/scripts/makeTrustees.sh', [electionId, votersFilePath, electionDir], (error, stdout) => {
    if (error) {
      callback({ status: 'FAILED', error });
      return;
    }
    callback({ status: 'OK', payload: stdout });
  });
}

function lockVoters(electionId, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }
  
    const votersFilePath = path.join(electionDir, VOTERS_FILE_NAME);
    
    if (!fs.existsSync(votersFilePath)) {
      callback({ status: 'FAILED', error: `Election {${electionId}} does not exist.` });
      return;
    }
  
    executeMakeTrustees(electionId, votersFilePath, electionDir, callback);
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default lockVoters;
