import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ELECTIONS_DIR } from '../global'

function createElection(callback) {
  try {
    exec('api/src/scripts/createElection.sh', (error, stdout) => {
      if (error) {
        callback({ status: 'FAILED', error });
        return;
      }
  
      const electionDir = path.join(ELECTIONS_DIR, stdout);
      fs.mkdirSync(electionDir);
  
      callback({ status: 'OK', payload: stdout });
    });
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default createElection;
