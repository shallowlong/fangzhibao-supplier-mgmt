const debug = require('debug')('fangzhibao-supplier-mgmt:services/UserService')
const bcrypt = require('bcryptjs')
const { sequelize } = require('../database')

const userModel = sequelize.models.User

async function validateUser(username, password) {
	const salt = await bcrypt.genSalt(10)
	const encryptedPassword = await bcrypt.hash(password, salt)
	debug(`encryptedPassword = ${encryptedPassword}`)

	const user = await userModel.findOne({
		where: { username: username }
	});

	return user && await bcrypt.compare(password, user.password)
}

module.exports = {
	validateUser
}