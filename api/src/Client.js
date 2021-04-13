import io from 'socket.io-client';

const socket = io('http://localhost:3000/');

console.log('emitting');
socket.on('connect', () => {
  console.log('connected');
  socket.emit('create-election', ({ status, payload, error }) => {
    if (status === 'OK') {
      console.log(payload);
      return;
    }
    console.log(error);
  });
});
