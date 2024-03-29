const _ = require('lodash')
const moment = require('moment')

const User = require('../models').User
const Role = require('../models').Role

function login(req, res) {
  res.render('login')
}

function logout(req, res) {
  if (req.session) {
    // delete session object
    req.session.destroy((err) => {
      res.redirect('/')
    })
  }
}

function signup(req, res) {
  res.render('signup')
}

function authenticate(req, res, next) {
  User.authenticate(_.get(req, 'body.useremail'), _.get(req, 'body.userpassword'))
    .then((result) => {
      _.set(req.session, 'user', result.user)
      _.set(req.session, 'roles', result.roles)
      res.redirect('/')
    })
    .catch((err) => {
      console.error(err)
      if (err.code === 'USER_NOT_FOUND') {
        _.set(res.locals, 'USER_NOT_FOUND', true)
      } else if (err.code === 'WRONG_PW') {
        _.set(res.locals, 'WRONG_PW', true)
      }
      next()
    })
}

function registerUser(req, res, next) {
  const email = _.get(req, 'body.useremail')

  User.create({
    email: _.size(email) > 0 ? email : null,
    password: _.get(req, 'body.userpassword'),
    first_name: _.get(req, 'body.userfirstname'),
    last_name: _.get(req, 'body.userlastname')
  }, {
    raw: true
  })
  .then((user) => {
    return [
      user.get({ plain: true }),
      user.getRoles({ raw: true })
    ]
  })
  .spread((user, roles) => {
    _.set(req.session, 'user', _.pick(user, ['user_id', 'first_name']))
    _.set(req.session, 'roles', roles)
    res.redirect('/')
  })
  .catch(err => {
    console.log(err)
    _.forEach(err.errors, (error) => {
      if (error.path === 'email' && error.validatorKey === 'not_unique') {
        _.set(res.locals, 'emailInUse', true)
      } else if (error.path === 'email' && error.validatorKey == 'isEmail') {
        _.set(res.locals, 'invalidEmail', true)
      } else if (error.path === 'password' && error.validatorKey === 'len') {
        _.set(res.locals, 'passwordCheckLength', true)
      }
    })
  })
}

function profile(req, res) {
  const userId = _.get(req, 'params.userId')
  User.findOne({
    where: { 'user_id': userId },
    attributes: {
      exclude: ['password']
    },
    include: [{
      model: Role
    }]
  })
  .then((user) => {
    const userIsOrganizer = _.some(user.Roles, (role) => role.name === 'Organizer')

    res.render('profile', {
      moment,
      user,
      userIsOrganizer
    })
  })
}

module.exports = {
  login,
  logout,
  signup,
  registerUser,
  authenticate,
  profile
}
