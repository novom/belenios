
import fs from 'fs';
import path from 'path';
import { VOTERS_FILE_NAME, ELECTIONS_DIR } from '../global';

function verifyVoters(electionId, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }

    const votersFilePath = path.join(electionDir, VOTERS_FILE_NAME);

    if (!fs.existsSync(votersFilePath)) {
      callback({ status: 'FAILED', error: 'The voters list does not exist.' });
      return;
    }

    const data = fs.readFileSync(votersFilePath, 'utf8');
    const lines = data.split('\n');
    const voters = lines.map((line) => {
      if(line.trim()) {
        const voter = line.split(',');
        return { 
          id: voter[0],
          weight: Number(voter[1])
        };
      }
      return undefined;
    }).filter((voter) => voter);

    callback({ status: 'OK', payload: voters });
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error });
  }
}

export default verifyVoters;
