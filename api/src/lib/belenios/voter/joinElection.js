import fs from 'fs';
import path from 'path';
import { ELECTIONS_DIR, PRIVATE_CREDS_FILE_NAME } from '../global';

function joinElection(electionId, userId, socket, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }

    const privCredFilePath = path.join(electionDir, PRIVATE_CREDS_FILE_NAME);

    if(!fs.existsSync(privCredFilePath)) {
      callback({ status: 'FAILED', error: `Private credentials file does not exist.` });
      return;
    }

    const data = fs.readFileSync(privCredFilePath, 'utf8');
    const users = data.split('\n');
    const user = users.filter((user) => user && user.startsWith(`${userId},`));
    const userCred = user.length === 1 ? user[0].split(' ')[1] : undefined;

    if(!userCred) {
      callback({ status: 'FAILED', error: `Voters` });
      return;
    }

    socket.join(electionId);
    socket.privCred = userCred;
    
    callback({ status: 'OK' });
  }
  catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default joinElection;
