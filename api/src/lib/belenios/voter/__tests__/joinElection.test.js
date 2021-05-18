import setVoters from '../../admin/setVoters';
import fs from 'fs';
import rimfaf from 'rimraf';
import { ELECTIONS_DIR } from '../../global';
import path from 'path';
import lockVoters from '../../admin/lockVoters';
import joinElection from '../joinElection';

const DEFAULT_ELECTION_ID = 'AAAAAAAAAAAAAA'; // Length need to be equal to 14 char.
const DEFAULT_USER_ID = 'bob';
const DEFAULT_VOTERS = [{ id: DEFAULT_USER_ID, weight: 1 }, { id: 'bobby', weight: 3 }];
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
      joinElection('Invalid id', DEFAULT_USER_ID, DEFAULT_SOCKET, callback);
    });
  });
  describe('Election created.', () => { 

    beforeEach((done) => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      if (!fs.existsSync(electionPath)) {
        fs.mkdirSync(electionPath); 
      }

      setVoters(DEFAULT_ELECTION_ID, DEFAULT_VOTERS, () => {
        lockVoters(DEFAULT_ELECTION_ID, () => { done() })
      });
    });

    afterEach(() => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      rimfaf.sync(electionPath); 
    });

    it('Should return FAILED. Undefined params', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('FAILED');
          done();
        } catch (error) {
          done(error);
        }
      }
      joinElection(undefined, undefined, undefined, callback);
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
      joinElection(DEFAULT_ELECTION_ID, DEFAULT_USER_ID, socket, callback);
    });
    it('Should return OK and add userCred to socket', (done) => {
      const join = jest.fn();
      const socket = { join: join };

      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('OK');
          expect(socket.privCred).toBeDefined();
          done();
        } catch (error) {
          done(error);
        }
      }
      joinElection(DEFAULT_ELECTION_ID, DEFAULT_USER_ID, socket, callback);
    });
  });
});
