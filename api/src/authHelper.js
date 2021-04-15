import jsonwebtoken from 'jsonwebtoken';
import { setTimeout, clearTimeout } from 'long-timeout';

const setTokenExpiredTimeout = (socket, tokenExpiration, timeoutHandle) => {
  const theSocket = socket;
  const tokenExpiresIn = (tokenExpiration * 1000) - Date.now();
  if (tokenExpiresIn < 0) {
    theSocket.emit('jwtExpired');
  }
  const closeHandle = () => clearTimeout(timeoutHandle);

  if (theSocket.timeoutHandle) {
    clearTimeout(theSocket.timeoutHandle);
  }
  // eslint-disable-next-line no-param-reassign
  timeoutHandle = setTimeout(() => {
    theSocket.emit('jwtExpired');
    theSocket.invitationId = { ...theSocket.auth, invitationId: '' };
  }, tokenExpiresIn);
  theSocket.timeoutHandle = timeoutHandle;

  theSocket.removeListener('disconnect', closeHandle);

  theSocket.on('disconnect', closeHandle);
};

export default function onDataChannelClientConnected(socket, jwt, next) {
  const theSocket = socket;
  const { authToken } = socket.handshake.auth;
  let timeoutHandle;

  theSocket.on('refreshAuthToken', (token, callback) => {
    jsonwebtoken.verify(token, jwt.secretKey, { algorithms: [jwt.algorithm] }, (err, payload) => {
      if (err) {
        console.log(`Error refreshing token: ${err}`);
        callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN', errMessage: err.message });
        return;
      }
      if (!payload.invitationId) {
        console.log('Error refreshing token: "The provided token does not have a "invitationId" attribute"');
        callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN_PAYLOAD', errMessage: 'The token payload should contain a "invitationId" attribute' });
        return;
      }
      theSocket.auth = { ...theSocket.auth, ...payload };
      if (payload.exp) {
        setTokenExpiredTimeout(theSocket, payload.exp, timeoutHandle);
      } else {
        if (theSocket.timeoutHandle) {
          clearTimeout(theSocket.timeoutHandle);
        }
        callback({ status: 'OK', role: payload.role });
      }
    });
  });

  if (!authToken) {
    console.log('Client failed to authenticate: "Missing an authentication token"');
    next(new Error('The current server does not allow anonymous client to connect. Please provide a valid JWT. Your client instance will be disconnected.'));
    return;
  }

  jsonwebtoken.verify(authToken, jwt.secretKey, { algorithms: [jwt.algorithm] }, (err, payload) => {
    if (err) {
      next(err);
      return;
    }
    theSocket.auth = payload;
    theSocket.auth.anonymous = false;

    if (payload.exp) {
      setTokenExpiredTimeout(theSocket, payload.exp, timeoutHandle);
    }
    next();
  });
}
