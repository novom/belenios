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
  socket.disconnect();
});

socket.on('connect', () => {
  console.log('connected');

  setInterval(() => {
    socket.emit('refreshAuthToken', jsonwebtoken.sign(
      { extraPayload: { ticketId: 'invitationId' } },
      process.env.JWT_SECRET,
      {
        algorithm: process.env.JWT_ALGO,
        expiresIn: 10,
      },
    ), ({ status, errCode, errMessage }) => { console.log(errMessage) });
  }, 8000);
});

socket.on('disconnect', () => {
  console.log('disconnected');
});
