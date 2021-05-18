import fs from 'fs';
import rimfaf from 'rimraf';
import path from 'path';
import joinElection from '../joinElection';
import { ELECTIONS_DIR } from '../../global';

const DEFAULT_SOCKET = { join: jest.fn() };

describe('Tests joinElection', () => { 
  describe('Election not created yet.', () => { 
    it('Should return FAILED.', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('FAILED');
          done();
        } catch (error) {
          done(error);
        }
      }
      joinElection('Invalid id', DEFAULT_SOCKET, callback);
    });
  });
  describe('Election created.', () => { 
    const DEFAULT_ELECTION_ID = 'TEST_ELECTION_ID';

    beforeEach(() => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      if (!fs.existsSync(electionPath)) {
        fs.mkdirSync(electionPath);
      }
    });

    afterEach(() => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      rimfaf.sync(electionPath); 
    });

    it('Should return FAILED. Undefined socket', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('FAILED');
          done();
        } catch (error) {
          done(error);
        }
      }
      joinElection(DEFAULT_ELECTION_ID, undefined, callback);
    });
    it('Should return OK and call socket.join', (done) => {
      const join = jest.fn();
      const socket = { join: join };

      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('OK');
          expect(join).toBeCalledTimes(1);
          done();
        } catch (error) {
          done(error);
        }
      }
      joinElection(DEFAULT_ELECTION_ID, socket, callback);
    });
  });
});
