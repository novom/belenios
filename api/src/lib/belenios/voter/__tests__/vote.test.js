import setVoters from '../../admin/setVoters';
import fs from 'fs';
import rimfaf from 'rimraf';
import { ELECTIONS_DIR } from '../../global';
import path from 'path';
import makeElection from '../../admin/makeElection';
import lockVoters from '../../admin/lockVoters';
import joinElection from '../joinElection';
import vote from '../vote';

describe('Tests vote', () => { 
  const DEFAULT_ELECTION_ID = 'AAAAAAAAAAAAAA'; // Length need to be equal to 14 char.
  const DEFAULT_USER_ID = 'bob';
  const DEFAULT_VOTERS = [{ id: DEFAULT_USER_ID, weight: 1 }, { id: 'bobby', weight: 3 }];
  const DEFAULT_TEMPLATE = {
    description: 'Description of the election.',
    name: 'Name of the election',
    questions: [{
      answers: ['Answer 1', 'Answer 2'], min: 0, max: 1, question: 'Question 1?',
    }, {
      answers: ['Answer 1', 'Answer 2'], blank: true, min: 1, max: 1, question: 'Question 2?',
    }],
  };
  const DEFAULT_BALLOT = [[1,0],[1,0,0]];
  const DEFAULT_SOCKET = { 
    join: jest.fn(),
    privCred: undefined,
   };

  beforeEach((done) => { 
    const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
    if (!fs.existsSync(electionPath)) {
      fs.mkdirSync(electionPath); 
    }

    setVoters(DEFAULT_ELECTION_ID, DEFAULT_VOTERS, () => {
      lockVoters(DEFAULT_ELECTION_ID, () => { 
        makeElection(DEFAULT_ELECTION_ID, JSON.stringify(DEFAULT_TEMPLATE), () => {
          joinElection(DEFAULT_ELECTION_ID, DEFAULT_USER_ID, DEFAULT_SOCKET, () => {
            done();
          });
        });
      });
    });
  });

  afterEach(() => { 
    const electionPath = path.join(ELECTIONS_DIR, DEFAULT_ELECTION_ID);
    rimfaf.sync(electionPath); 
  });

  it('Should return OK. Missing params', (done) => {
    function callback(data) {
      try {
        console.log(data);
        expect(data).toBeDefined();
        expect(data.status).toEqual('FAILED');
        done();
      } catch (error) {
        done(error);
      }
    }
    vote(undefined, undefined, undefined, callback);
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
    vote(DEFAULT_ELECTION_ID, DEFAULT_SOCKET.privCred, JSON.stringify(DEFAULT_BALLOT), callback);
  });
});
