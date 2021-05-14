import setVoters from '../setVoters';
import fs from 'fs';
import rimfaf from 'rimraf';
import { ELECTIONS_DIR } from '../../global';
import path from 'path';


const DEFAULT_VOTERS = [{ id: 'bob', weight: 1 }, { id: 'bobby', weight: 3 }];

describe('Tests setVoters', () => { 
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
      setVoters('Invalid id', DEFAULT_VOTERS, callback);
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

    it('Should return FAILED. No election id', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('FAILED');
          done();
        } catch (error) {
          done(error);
        }
      }
      setVoters(undefined, DEFAULT_VOTERS, callback);
    });

    it('Should return FAILED. No voters id', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('FAILED');
          done();
        } catch (error) {
          done(error);
        }
      }
      setVoters(DEFAULT_ELECTION_ID, undefined, callback);
    });

    it('Should return OK', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('OK');
          done();
        } catch (error) {
          done(error);
        }
      }
      setVoters(DEFAULT_ELECTION_ID, DEFAULT_VOTERS, callback);
    });
  });
});
