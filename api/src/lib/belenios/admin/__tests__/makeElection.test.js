import setVoters from '../setVoters';
import fs from 'fs';
import rimfaf from 'rimraf';
import { ELECTIONS_DIR } from '../../global';
import path from 'path';
import makeElection from '../makeElection';
import lockVoters from '../lockVoters';

const DEFAULT_TEMPLATE = {
  description: 'Description of the election.',
  name: 'Name of the election',
  questions: [{
    answers: ['Answer 1', 'Answer 2'], min: 0, max: 1, question: 'Question 1?',
  }, {
    answers: ['Answer 1', 'Answer 2'], blank: true, min: 1, max: 1, question: 'Question 2?',
  }],
};

describe('Tests makeElection', () => { 
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
      makeElection('Invalid id', JSON.stringify(DEFAULT_TEMPLATE), callback);
    });
  });
  describe('Election created.', () => { 

    const DEFAULT_ELECTION_ID = 'AAAAAAAAAAAAAA'; // Length need to be equal to 14 char.
    const DEFAULT_VOTERS = [{ id: 'bob', weight: 1 }, { id: 'bobby', weight: 3 }];

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
      makeElection(undefined, JSON.stringify(DEFAULT_TEMPLATE), callback);
    });
    it('Should return OK', (done) => {
      function callback(data) {
        try {
          console.log(data);
          expect(data).toBeDefined();
          expect(data.status).toEqual('OK');
          done();
        } catch (error) {
          done(error);
        }
      }
      makeElection(DEFAULT_ELECTION_ID, JSON.stringify(DEFAULT_TEMPLATE), callback);
    });
  });
});
