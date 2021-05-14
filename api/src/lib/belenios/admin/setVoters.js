
import fs from 'fs';
import path from 'path';
import { VOTERS_FILE_NAME, ELECTIONS_DIR, TRUSTEES_FILE_NAME } from '../global';

function setVoters(electionId, voters, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }
  
    const trusteesFilePath = path.join(electionDir, TRUSTEES_FILE_NAME);  
  
    if (fs.existsSync(trusteesFilePath)) {
      callback({ status: 'FAILED', error: 'The voters list for this election has been locked.' });
      return;
    }
  
    const votersFilePath = path.join(electionDir, VOTERS_FILE_NAME);
    const votersList = voters.reduce((acc, curr) => acc.concat(curr.id, ',', curr.weight, '\n'), '');
    fs.writeFile(votersFilePath, votersList, (error) => {
      if (error) {
        callback({ status: 'FAILED', error: error });
        return;
      }
      callback({ status: 'OK' });
    });
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default setVoters;
