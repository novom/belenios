import createElection from '../createElection';

describe('Tests createElection', () => {
  it('Should return an election id', (done) => {
    function callback(data) {
      try {
        expect(data).toBeDefined();
        expect(data.status).toBeDefined();
        expect(data.payload).toBeDefined();
        done();
      } catch (error) {
        done(error);
      }
    }
    createElection(callback);
  });
});
