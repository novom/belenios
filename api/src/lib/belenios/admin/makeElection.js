import fs from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { TEMPLATE_FILE_NAME, ELECTIONS_DIR, GROUP_FILE_PATH } from '../global'

function executeMakeElection(electionId, templateFilePath, groupFilePath, electionDir, callback) {
  execFile('api/src/scripts/makeElection.sh', [electionId, templateFilePath, groupFilePath, electionDir], (error) => {
    if (error) {
      callback({ status: 'FAILED', error });
      return;
    }
    callback({ status: 'OK' });
  });
}

function makeElection(electionId, template, callback) {
  try {
    const electionDir = path.join(ELECTIONS_DIR, electionId);

    if(!fs.existsSync(electionDir)) {
      callback({ status: 'FAILED', error: `Election ${electionId} does not exist.` });
      return;
    }
  
    const templateFilePath = path.join(electionDir, TEMPLATE_FILE_NAME);
    fs.writeFile(templateFilePath, template, (error) => {
      if (error) {
        callback({ status: 'FAILED', error: error });
        return;
      }
      executeMakeElection(electionId, templateFilePath, GROUP_FILE_PATH, electionDir, callback);
    });
  } catch (error) {
    console.log(error);
    callback({ status: 'FAILED', error: error.message });
  }
}

export default makeElection;
