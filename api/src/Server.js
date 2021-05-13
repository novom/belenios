import express from 'express';
import socketIO from 'socket.io';
import http from 'http';
import fs from 'fs';
import readLine from 'readline';
import { once } from 'events';

import { execFile } from 'child_process';
import authHelper from './authHelper';
import { createElection } from './lib/beleniosWrapper';

const expressApp = express();
const router = express.Router();
const httpServer = http.Server(expressApp);
const io = socketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },
  cookie: {
    name: 'io',
    httpOnly: false,
    path: '/',
  },
});

expressApp.use('/', router);

httpServer.listen(3000);

const electionsDir = 'elections';

const lockedVotersList = [];

io.of('/admin').use((socket, next) => {
  authHelper(socket, 'admin', next);
});

io.of('/admin').on('connection', (socket) => {
  console.log('New admin connected');

  socket.on('create-election', (callback) => createElection(callback));

  socket.on('set-voters', (electionId, voters, callback) => {
    if (lockedVotersList.includes(electionId)) {
      callback({ status: 'FAILED', error: new Error('The voters list for this election has been locked.') });
      return;
    }
    fs.stat(`${electionsDir}/${electionId}`, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
        return;
      }
      if (stats.isDirectory()) {
        const voterList = voters.reduce((acc, curr) => acc.concat(curr.id, ',', curr.weight, '\n'), '');
        console.log(voterList);
        fs.writeFile(`${electionsDir}/${electionId}/voters.txt`, voterList, (err) => {
          if (err) {
            callback({ status: 'FAILED', error: err });
            return;
          }
          callback({ status: 'OK' });
        });
      }
    });
  });
  socket.on('verify-voters', async (electionId, callback) => {
    try {
      const readStream = fs.createReadStream(`${electionsDir}/${electionId}/voters.txt`);
      const lineReader = readLine.createInterface({ input: readStream });

      const voterArray = [];
      lineReader.on('line', (line) => {
        if (line !== '') {
          const splittedLine = line.split(',');
          voterArray.push({ id: splittedLine[0], weight: parseInt(splittedLine[1], 10) });
        }
      });

      await once(lineReader, 'close');
      callback({ status: 'OK', payload: voterArray });
    } catch (err) {
      console.log(err);
      callback({ status: 'FAILED', error: err });
    }
  });

  socket.on('lock-voters', (electionId, callback) => {
    const electionDir = `${electionsDir}/${electionId}`;
    const votersDir = `${electionDir}/voters.txt`;

    fs.stat(votersDir, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
      }
      if (stats.isFile()) {
        lockedVotersList.push(electionId);
        execFile('api/src/scripts/makeTrustees.sh', [electionId, votersDir, electionDir], (error, stdout) => {
          if (error) {
            callback({ status: 'FAILED', error });
            return;
          }
          callback({ status: 'OK', payload: stdout });
        });
      } else {
        callback({ status: 'FAILED', error: new Error(`${electionId} is not an ongoing election`) });
      }
    });
  });

  socket.on('make-election', (electionId, template, callback) => {
    const electionDir = `${electionsDir}/${electionId}`;
    const groupFilePath = 'files/groups/default.json';

    fs.stat(electionDir, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
      }
      if (stats.isDirectory()) {
        const templateFilePath = `${electionDir}/template.json`;
        fs.writeFile(templateFilePath, template, (err) => {
          if (err) {
            callback({ status: 'FAILED', error: err });
            return;
          }
          execFile('api/src/scripts/makeElection.sh', [electionId, templateFilePath, groupFilePath, electionDir], (er, stdout) => {
            if (er) {
              callback({ status: 'FAILED', er });
              return;
            }
            callback({ status: 'OK' });
          });
        });
      } else {
        callback({ status: 'FAILED', error: new Error(`${electionId} is not an ongoing election`) });
      }
    });
  });
});

io.of('/voter').use((socket, next) => {
  authHelper(socket, 'voter', next);
});

io.of('/voter').on('connection', (socket) => {
  console.log('New voter connected');

  socket.on('join-election', (electionId, callback) => {
    fs.stat(`${electionsDir}/${electionId}`, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
      }
      if (stats.isDirectory()) {
        socket.join(electionId);
        callback({ status: 'OK' });
      }
      callback({ status: 'FAILED', error: new Error(`${electionId} is not an ongoing election`) });
    });
  });
});
