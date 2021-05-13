import { createElection } from '../beleniosWrapper';

describe('belenios wrapper tests', () => {
  describe('Tests createElection', () => {
    it('should createElection', (done) => {
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
});
