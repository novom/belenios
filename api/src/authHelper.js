import jsonwebtoken from 'jsonwebtoken';
import { setTimeout, clearTimeout } from 'long-timeout';

const setTokenExpiredTimeout = (socket, tokenExpiration, timeoutHandle) => {
  const theSocket = socket;
  const tokenExpiresIn = (tokenExpiration * 1000) - Date.now();

  if (theSocket.timeoutHandle) {
    clearTimeout(theSocket.timeoutHandle);
  }
  const closeHandle = () => clearTimeout(timeoutHandle);
  // eslint-disable-next-line no-param-reassign
  timeoutHandle = setTimeout(() => {
    theSocket.disconnect();
  }, tokenExpiresIn);

  if (theSocket.closeHandle) {
    theSocket.removeListener('disconnect', theSocket.closeHandle);
  }
  theSocket.timeoutHandle = timeoutHandle;
  theSocket.on('disconnect', closeHandle);
  theSocket.closeHandle = closeHandle;
};

export default function onDataChannelClientConnected(socket, namespace, next) {
  const theSocket = socket;
  const { authToken } = socket.handshake.auth;
  let timeoutHandle;

  theSocket.on('refreshAuthToken', (token, callback) => {
    jsonwebtoken.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: [process.env.JWT_ALGO] },
      (err, payload) => {
        if (err) {
          console.log(`Error refreshing token: ${err}`);
          callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN', errMessage: err.message });
          return;
        }
        if (namespace === 'admin' && !payload.extraPayload.accessScope.event.actions.find((action) => action.match(/^all$|^edit$/))) {
          callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN_PAYLOAD', errMessage: 'The token payload should contain a "ticketId" attribute' });
          return;
        }
        if (namespace === 'voters' && !payload.extraPayload.ticketId) {
          callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN_PAYLOAD', errMessage: 'The token payload should contain a "ticketId" attribute' });
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
      },
    );
  });

  if (!authToken) {
    console.log('Client failed to authenticate: "Missing an authentication token"');
    next(new Error('The current server does not allow anonymous client to connect. Please provide a valid JWT. Your client instance will be disconnected.'));
    return;
  }

  jsonwebtoken.verify(
    authToken,
    process.env.JWT_SECRET,
    { algorithms: [process.env.JWT_ALGO] },
    (err, payload) => {
      if (err) {
        next(err);
        return;
      }
      if (namespace === 'admin' && !payload.extraPayload.accessScope.event.actions.find((action) => action.match(/^all$|^edit$/))) {
        next(new Error('The token payload should contain a "ticketId" attribute'));
        return;
      }
      if (namespace === 'voters' && !payload.extraPayload.ticketId) {
        next(new Error('The token payload should contain a "ticketId" attribute'));
        return;
      }

      theSocket.auth = payload;
      if (payload.exp) {
        setTokenExpiredTimeout(theSocket, payload.exp, timeoutHandle);
      }
      next();
    },
  );
}
