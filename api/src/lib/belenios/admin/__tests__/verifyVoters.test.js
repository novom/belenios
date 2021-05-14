import fs from 'fs';
import rimfaf from 'rimraf';
import { ELECTIONS_DIR } from '../../global';
import path from 'path';
import verifyVoters from '../verifyVoters';
import setVoters from '../setVoters';

describe('Tests verifyVoters', () => { 
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
      verifyVoters('Invalid id', callback);
    });
  });
  describe('Election created.', () => { 

    const DEFAULT_ELECTION_ID = 'TEST_ELECTION_ID';
    const DEFAULT_VOTERS = [{ id: 'bob', weight: 1 }, { id: 'bobby', weight: 3 }];

    beforeEach((done) => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      if (!fs.existsSync(electionPath)) {
        fs.mkdirSync(electionPath);
      }

      setVoters(DEFAULT_ELECTION_ID, DEFAULT_VOTERS, () => done());
    });

    afterEach(() => { 
      const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
      rimfaf.sync(electionPath); 
    });

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
      verifyVoters(undefined, callback);
    });

    it('Should return OK and a payload of voters', (done) => {
      function callback(data) {
        try {
          expect(data).toBeDefined();
          expect(data.status).toEqual('OK');
          expect(data.payload).toEqual(DEFAULT_VOTERS);
          done();
        } catch (error) {
          done(error);
        }
      }
      verifyVoters(DEFAULT_ELECTION_ID, callback);
    });
  });
});
