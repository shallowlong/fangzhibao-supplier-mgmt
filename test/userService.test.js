const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

let mockLogger, mockBcrypt, mockUserModel, mockSequelize;

function resetMocks() {
	mockLogger = {
		debug: sinon.stub(),
		info: sinon.stub(),
		error: sinon.stub(),
		warn: sinon.stub()
	};

	mockBcrypt = {
		genSalt: sinon.stub(),
		hash: sinon.stub(),
		compare: sinon.stub()
	};

	mockUserModel = {
		findOne: sinon.stub()
	};

	mockSequelize = {
		models: {
			User: mockUserModel
		}
	};
}

beforeEach(function () {
	sinon.restore();
	resetMocks();
});

function getMockedUserService() {
	return proxyquire('../services/userService', {
		'../logger': { logger: mockLogger },
		'bcryptjs': mockBcrypt,
		'../database': { sequelize: mockSequelize }
	});
}

describe('userService.js 单元测试', function () {
	describe('validateUser函数测试', function () {
		it('应该在用户存在且密码匹配时返回true', async function () {
			// 准备测试数据
			const testUsername = 'testuser';
			const testPassword = 'testpassword';
			const testSalt = 'test-salt';
			const testHash = 'test-hash';
			const mockUser = {
				username: testUsername,
				password: testHash
			};

			mockBcrypt.genSalt.resolves(testSalt);
			mockBcrypt.hash.resolves(testHash);
			mockUserModel.findOne.resolves(mockUser);
			mockBcrypt.compare.resolves(true);

			const userService = getMockedUserService();
			const result = await userService.validateUser(testUsername, testPassword);

			expect(result).to.be.true;
			expect(mockBcrypt.genSalt.calledWith(10)).to.be.true;
			expect(mockBcrypt.hash.calledWith(testPassword, testSalt)).to.be.true;
			expect(mockLogger.debug.called).to.be.true;
			expect(mockUserModel.findOne.calledWith({
				where: { username: testUsername }
			})).to.be.true;
			expect(mockBcrypt.compare.calledWith(testPassword, testHash)).to.be.true;
		});

		it('应该在用户不存在时返回null', async function () {
			const testUsername = 'nonexistentuser';
			const testPassword = 'testpassword';
			const testSalt = 'test-salt';
			const testHash = 'test-hash';

			mockBcrypt.genSalt.resolves(testSalt);
			mockBcrypt.hash.resolves(testHash);
			mockUserModel.findOne.resolves(null); // 用户不存在
			mockBcrypt.compare.resolves(false); // 不应该被调用

			const userService = getMockedUserService();
			const result = await userService.validateUser(testUsername, testPassword);

			expect(result).to.be.null;
			expect(mockUserModel.findOne.calledWith({
				where: { username: testUsername }
			})).to.be.true;
			expect(mockBcrypt.compare.called).to.be.false; // 不应该调用compare
		});

		it('应该在用户存在但密码不匹配时返回false', async function () {
			const testUsername = 'testuser';
			const testPassword = 'wrongpassword';
			const testSalt = 'test-salt';
			const testHash = 'test-hash';
			const mockUser = {
				username: testUsername,
				password: testHash
			};

			mockBcrypt.genSalt.resolves(testSalt);
			mockBcrypt.hash.resolves(testHash);
			mockUserModel.findOne.resolves(mockUser);
			mockBcrypt.compare.resolves(false);

			const userService = getMockedUserService();
			const result = await userService.validateUser(testUsername, testPassword);

			expect(result).to.be.false;
			expect(mockUserModel.findOne.calledWith({
				where: { username: testUsername }
			})).to.be.true;
			expect(mockBcrypt.compare.calledWith(testPassword, testHash)).to.be.true;
		});

		it('应该在数据库查询出错时抛出异常', async function () {
			const testUsername = 'testuser';
			const testPassword = 'testpassword';
			const testSalt = 'test-salt';
			const testHash = 'test-hash';
			const databaseError = new Error('Database connection failed');

			mockBcrypt.genSalt.resolves(testSalt);
			mockBcrypt.hash.resolves(testHash);
			mockUserModel.findOne.rejects(databaseError); // 数据库查询失败

			const userService = getMockedUserService();

			try {
				await userService.validateUser(testUsername, testPassword);
				expect.fail('应该抛出异常');
			} catch (error) {
				expect(error).to.equal(databaseError);
			}
		});

		it('应该在bcrypt操作出错时抛出异常', async function () {
			const testUsername = 'testuser';
			const testPassword = 'testpassword';
			const bcryptError = new Error('Bcrypt error');

			mockBcrypt.genSalt.rejects(bcryptError); // bcrypt操作失败

			const userService = getMockedUserService();

			try {
				await userService.validateUser(testUsername, testPassword);
				expect.fail('应该抛出异常');
			} catch (error) {
				expect(error).to.equal(bcryptError);
			}
		});

		it('应该正确处理各种参数情况', async function () {
			const testSalt = 'test-salt';
			const testHash = 'test-hash';

			mockBcrypt.genSalt.resolves(testSalt);
			mockBcrypt.hash.resolves(testHash);
			mockUserModel.findOne.resolves(null); // 用户不存在

			const userService = getMockedUserService();

			const result1 = await userService.validateUser(undefined, undefined);
			const result2 = await userService.validateUser(null, null);
			const result3 = await userService.validateUser('', '');

			expect(result1).to.be.null;
			expect(result2).to.be.null;
			expect(result3).to.be.null;
		});
	});
});