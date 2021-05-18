import fs from 'fs';
import path from 'path';
import { ELECTIONS_DIR } from '../global';

function joinElection(electionId, socket, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }

    socket.join(electionId);
    callback({ status: 'OK' });
  }
  catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default joinElection;
