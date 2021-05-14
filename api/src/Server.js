import express from 'express';
import socketIO from 'socket.io';
import http from 'http';
import fs from 'fs';

import { execFile } from 'child_process';
import authHelper from './authHelper';
import createElection from './lib/belenios/admin/createElection';
import setVoters from './lib/belenios/admin/setVoters';
import verifyVoters from './lib/belenios/admin/verifyVoters';
import lockVoters from './lib/belenios/admin/lockVoters';
import makeElection from './lib/belenios/admin/makeElection';

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

io.of('/admin').use((socket, next) => {
  authHelper(socket, 'admin', next);
});

io.of('/admin').on('connection', (socket) => {
  socket.on('create-election', createElection);
  socket.on('set-voters', setVoters);
  socket.on('verify-voters', verifyVoters);
  socket.on('lock-voters', lockVoters);
  socket.on('make-election', makeElection);
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
      callback({ status: 'FAILED', error: `${electionId} is not an ongoing election` });
    });
  });
});
