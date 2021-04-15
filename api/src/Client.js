import io from 'socket.io-client';
import jsonwebtoken from 'jsonwebtoken';

const socket = io('http://localhost:3000/voters', {
  auth: {
    authToken: jsonwebtoken.sign(
      { extraPayload: { ticketId: 'invitationId' } },
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
});

socket.on('connect', () => {
  console.log('connected');
  socket.emit('create-election', ({ status, payload, error }) => {
    if (status === 'OK') {
      console.log(payload);
      return;
    }
    console.log(error);
  });

  setInterval(() => {
    socket.emit('refreshAuthToken', jsonwebtoken.sign(
      { extraPayload: { ticketId: 'invitationId' } },
      process.env.JWT_SECRET,
      {
        algorithm: process.env.JWT_ALGO,
        expiresIn: 10,
      },
    ));
  }, 8000);
});

socket.on('disconnect', () => {
  console.log('disconnected');
});
