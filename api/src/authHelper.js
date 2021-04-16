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
    theSocket.role = '';
    theSocket.disconnect();
  }, tokenExpiresIn);

  if (theSocket.closeHandle) {
    theSocket.removeListener('disconnect', theSocket.closeHandle);
  }
  theSocket.timeoutHandle = timeoutHandle;
  theSocket.closeHandle = closeHandle;
  theSocket.on('disconnect', closeHandle);
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
        if (theSocket.role === 'admin' && !payload.extraPayload?.accessScope?.event?.action?.find((action) => action.match(/^all$|^edit$/))) {
          callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN_PAYLOAD', errMessage: 'The admin token should contain a "extraPayload.accessScope.event.action" attribute' });
          return;
        }
        if (theSocket.role === 'voter' && !payload.extraPayload?.ticketId) {
          callback({ status: 'FAILED', errCode: 'INVALID_AUTH_TOKEN_PAYLOAD', errMessage: 'The token should contain a "extraPayload.ticketId" attribute' });
          return;
        }
        theSocket.auth = { ...theSocket.auth, ...payload };
        if (payload.exp) {
          setTokenExpiredTimeout(theSocket, payload.exp, timeoutHandle);
        } else if (theSocket.timeoutHandle) {
          clearTimeout(theSocket.timeoutHandle);
        }
        callback({ status: 'OK', role: theSocket.role });
      },
    );
  });

  if (!authToken) {
    next(new Error('The Belenios API requires a valid JWT. Your client instance will be disconnected.'));
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

      if (namespace === 'admin' && !payload?.extraPayload?.accessScope?.event?.action?.find((action) => action.match(/^all$|^edit$/))) {
        next(new Error('The admin token should contain a "extraPayload.accessScope.event.action" attribute'));
        return;
      }

      if (namespace === 'voter' && !payload?.extraPayload?.ticketId) {
        next(new Error('The token should contain a "extraPayload.ticketId" attribute'));
        return;
      }

      theSocket.role = namespace;
      theSocket.auth = payload;
      if (payload.exp) {
        setTokenExpiredTimeout(theSocket, payload.exp, timeoutHandle);
      }
      next();
    },
  );
}
