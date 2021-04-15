import express from 'express';
import socketIO from 'socket.io';
import http from 'http';
import { execFile } from 'child_process';
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

io.of('/admin').use((socket, next) => {
  authHelper(socket, 'admin', next);
});

io.of('/admin').on('connection', (socket) => {
  console.log('New client connected');

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
});

io.of('/voters').use((socket, next) => {
  authHelper(socket, 'voters', next);
});

io.of('/voters').on('connection', (socket) => {
  console.log(socket.auth);
});
