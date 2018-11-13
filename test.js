const log = require('loglevel');
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiHttp);

log.enableAll();
log.setDefaultLevel("debug");
const url = 'http://localhost:3001';

describe('Request test', () => {
	it('blocks', done => {
		this.skip();
		chai.request(url)
			.get('/blocks')
			//.query({id: 1})
			.end((err, res) => {
				log.info(res.text);
				expect(err).to.be.null;
				expect(res).to.have.status(200);
				//expect(res.body).to.be.an('array');
				done();
			});
	});
	it('peers', done => {
		this.skip();
		chai.request(url)
			.get('/peers')
			.end((err, res) => {
				log.info(res.text);
				expect(err).to.be.null;
				expect(res).to.have.status(200);
				//expect(res.body).to.be.an('array');
				done();
			});
	});

	it('mineBlock', done => {
		this.skip();
		chai.request(url)
			.post('/mineBlock')
			.send({ "data": "Some data to the first block" })
			.end((err, res) => {
				expect(err).to.be.null;
				expect(res).to.have.status(200);
				done();
			});
	});
	it('addPeer', done => {
		chai.request(url)
			.post('/addPeer')
			.send({ "peer": "ws://localhost:6001" })
			.end((err, res) => {
				expect(err).to.be.null;
				expect(res).to.have.status(200);
				done();
			});
	});
});