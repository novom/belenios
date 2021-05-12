import io from 'socket.io-client';
import jsonwebtoken from 'jsonwebtoken';

const socket = io('http://localhost:3000/admin', {
  auth: {
    authToken: jsonwebtoken.sign(
      { extraPayload: { accessScope: { event: { action: ['edit'] } } } },
      process.env.JWT_SECRET,
      {
        algorithm: process.env.JWT_ALGO,
        expiresIn: 10,
      },
    ),
  },
});

socket.on('connect_error', (err) => {
  console.log(err);
  socket.disconnect();
});

socket.on('connect', () => {
  console.log('connected');
  socket.emit('create-election', ({ status, payload, error }) => {
    if (status === 'OK') {
      console.log(payload);

      socket.emit('set-voters', [{ id: 'bob', weight: 1 }, { id: 'bobby', weight: 3 }], payload, (setVoters) => {
        console.log('setVoters', setVoters);
        socket.emit('verify-voters', payload, (verifyVoters) => {
          console.log('verifyVoters', verifyVoters);
        });
      });
    } else {
      console.log('what', error);
    }
  });

  setInterval(() => {
    socket.emit('refreshAuthToken', jsonwebtoken.sign(
      { extraPayload: { accessScope: { event: { action: ['edit'] } } } },
      process.env.JWT_SECRET,
      {
        algorithm: process.env.JWT_ALGO,
        expiresIn: 10,
      },
    ), ({ status, errCode, errMessage }) => { console.log(status); });
  }, 8000);
});

socket.on('disconnect', () => {
  console.log('disconnected');
});
