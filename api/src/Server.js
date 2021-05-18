import express from 'express';
import socketIO from 'socket.io';
import http from 'http';

import { execFile } from 'child_process';
import authHelper from './authHelper';
import createElection from './lib/belenios/admin/createElection';
import setVoters from './lib/belenios/admin/setVoters';
import verifyVoters from './lib/belenios/admin/verifyVoters';
import lockVoters from './lib/belenios/admin/lockVoters';
import makeElection from './lib/belenios/admin/makeElection';
import joinElection from './lib/belenios/voter/joinElection';
import vote from './lib/belenios/voter/vote';
import closeElection from './lib/belenios/admin/closeElection';

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

io.of('/admin').use((socket, next) => {
  authHelper(socket, 'admin', next);
});

io.of('/admin').on('connection', (socket) => {
  socket.on('create-election', createElection);
  socket.on('set-voters', setVoters);
  socket.on('verify-voters', verifyVoters);
  socket.on('lock-voters', lockVoters);
  socket.on('make-election', makeElection);
  socket.on('join-election', (electionId, callback) => { joinElection(electionId, socket, callback) });
  socket.on('close-election', closeElection);
});

io.of('/voter').use((socket, next) => {
  authHelper(socket, 'voter', next);
});

io.of('/voter').on('connection', (socket) => {
  socket.on('join-election', (electionId, userId, callback) => { joinElection(electionId, userId, socket, callback) });
  socket.on('vote', (electionId, callback) => { vote(electionId, socket.privCred, callback) });
});
