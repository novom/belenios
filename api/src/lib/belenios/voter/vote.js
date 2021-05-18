import fs from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { ELECTIONS_DIR, BALLOTS_FILE_NAME, PRIVATE_CREDS_FILE_NAME } from '../global'

function executeVote(privCred, ballot, ballotFilePath, privCredFilePath, electionDir, callback) {
  const paremeters = [
    privCred,
    ballot,
    ballotFilePath,
    privCredFilePath,
    electionDir
  ];

  execFile('api/src/scripts/vote.sh', paremeters, (error) => {
    if (error) {
      callback({ status: 'FAILED', error });
      return;
    }
    callback({ status: 'OK' });
  });
}

function vote(electionId, privCred, ballot, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }
  
    const ballotFilePath = path.join(electionDir, BALLOTS_FILE_NAME);
    const privCredFilePath = path.join(electionDir, PRIVATE_CREDS_FILE_NAME);

    executeVote(privCred, ballot, ballotFilePath, privCredFilePath, electionDir, callback);
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default vote;
