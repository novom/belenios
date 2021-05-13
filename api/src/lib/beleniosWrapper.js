import { exec, execFile } from 'child_process';

export function createElection(callback) {
  console.log(createElection);
  execFile('api/src/scripts/createElection.sh', (error, stdout) => {
    if (error) {
      callback({ status: 'FAILED', error });
      return;
    }
    callback({ status: 'OK', payload: stdout });
  });
}

export function cmdone() {

}

export function cmdtwo() {

}
