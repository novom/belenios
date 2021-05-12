import express from 'express';
import socketIO from 'socket.io';
import http from 'http';
import { execFile } from 'child_process';
import fs from 'fs';
import readLine from 'readline';
import { once } from 'events';

import authHelper from './authHelper';

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

const electionDir = 'elections';

const lockedVotersList = [];

io.of('/admin').use((socket, next) => {
  authHelper(socket, 'admin', next);
});

io.of('/admin').on('connection', (socket) => {
  console.log('New admin connected');

  socket.on('create-election', (callback) => {
    console.log('Creating election');
    execFile('api/src/scripts/createElection.sh', (error, stdout) => {
      if (error) {
        callback({ status: 'FAILED', error });
        return;
      }
      callback({ status: 'OK', payload: stdout });
    });
  });

  socket.on('set-voters', (voters, electionId, callback) => {
    if (lockedVotersList.includes(electionId)) {
      callback({ status: 'FAILED', error: new Error('The voters list for this election has been locked.') });
      return;
    }
    fs.stat(`${electionDir}/${electionId}`, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
        return;
      }
      if (stats.isDirectory()) {
        const voterList = voters.reduce((acc, curr) => acc.concat(curr.id, ',', curr.weight, '\n'), '');
        console.log(voterList);
        fs.writeFile(`${electionDir}/${electionId}/voters.txt`, voterList, (err) => {
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
      const readStream = fs.createReadStream(`${electionDir}/${electionId}/voters.txt`);
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
    fs.stat(`${electionDir}/${electionId}/voters.txt`, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
      }
      if (stats.isFile()) {
        lockedVotersList.push(electionId);
        callback({ status: 'OK' });
      }
      callback({ status: 'FAILED', error: new Error(`${electionId} is not an ongoing election`) });
    });
  });

  socket.on('make-election', (electionId, template, callback) => {
    fs.stat(`${electionDir}/${electionId}`, (error, stats) => {
      if (error) {
        callback({ status: 'FAILED', error });
      }
      if (stats.isDirectory()) {
        console.log(template);
        fs.writeFile(`${electionDir}/${electionId}/template.json`, template, (err) => {
          if (err) {
            callback({ status: 'FAILED', error: err });
            return;
          }
          callback({ status: 'OK' });
        });
        callback({ status: 'OK' });
      }
      callback({ status: 'FAILED', error: new Error(`${electionId} is not an ongoing election`) });
    });
  });
});

io.of('/voter').use((socket, next) => {
  authHelper(socket, 'voter', next);
});

io.of('/voter').on('connection', (socket) => {
  console.log('New voter connected');

  socket.on('join-election', (electionId, callback) => {
    fs.stat(`${electionDir}/${electionId}`, (error, stats) => {
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
