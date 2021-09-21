/**
 * This tests scenarios of user router
 */

const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/user')
const { userOne, setupDatabase } = require('./fixtures/db')

// Setup DB before each scenario
beforeEach(setupDatabase)

/**
 * User signup scenarios below.
 * POST: /users
 */

test('Should signup a new user', async () => {
    const response = await request(app).post('/users').send({
        name: 'Ana',
        email: 'example@example.com',
        password: 'anaPass123!'
    }).expect(201)

    // Assert that the DB was changed correctly
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()

    // Assertions about the response
    expect(response.body).toMatchObject({
        user: {
            name: 'Ana',
            email: 'example@example.com'
        },
        token: user.tokens[0].token
    })
    expect(user.password).not.toBe('anaPass123!')
})

test('Should not signup user without any one of name, email, or password', async () => {
    // No name
    await request(app).post('/users').send({
        email: 'test-email@testing.com',
        password: 'testpass123!'
    }).expect(400)

    // No email
    await request(app).post('/users').send({
        name: 'tester-name',
        password: 'testpass123!'
    }).expect(400)

    // No password
    await request(app).post('/users').send({
        name: 'tester-name',
        email: 'test-email@testing.com'
    }).expect(400)
})

test('Should not signup user with invalid email, or password', async () => {
    // Invalid email
    await request(app).post('/users').send({
        name: 'tester-name',
        email: 'test-email.com',
        password: 'testpass123!'
    }).expect(400)

    // Invalid password
    await request(app).post('/users').send({
        name: 'tester-name',
        email: 'test-email@testing.com',
        password: 'pass'
    }).expect(400)
})

test('Should not signup user with existing email', async () => {
    await request(app).post('/users').send({
        name: 'tester-name',
        email: userOne.email,
        password: 'testpass123!'
    }).expect(400)
})

/**
 * User login scenarios below.
 * POST: /users/login
 */

test('Should login existing user', async () => {
    const response = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200)

    const user = await User.findById(userOne._id)
    expect(response.body.token).toBe(user.tokens[1].token)
})

test('Should not login non-existent user', async () => {
    await request(app).post('/users/login').send({
        email: 'nonexistUser',
        password: 'wrongPass123'
    }).expect(400)
})

test('Should not login if password is wrong', async () => {
    await request(app).post('/users/login').send({
        email: userOne.email,
        password: 'wrongPass123'
    }).expect(400)
})

/**
 * User logout scenarios below.
 * POST: /users/logout
 */

test('Should logout logged-in user', async () => {
    await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200)

    let user = await User.findById(userOne._id)
    expect(user.tokens.length).toEqual(2)

    await request(app)
        .post('/users/logout')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    user = await User.findById(userOne._id)
    expect(user.tokens.length).toEqual(1)
})

test('Should not logout user who is not logged-in', async () => {
    await request(app)
        .post('/users/logout')
        .send()
        .expect(401)
})

/**
 * All user tokens logout scenarios below.
 * POST: /users/loginAll
 */

test('Should logout all tokens of logged-in user', async () => {
    await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200)

    let user = await User.findById(userOne._id)
    expect(user.tokens.length).toEqual(2)

    await request(app)
        .post('/users/logoutAll')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    user = await User.findById(userOne._id)
    expect(user.tokens.length).toEqual(0)
})

test('Should logout all tokens of user if not logged-in', async () => {
    await request(app)
        .post('/users/logoutAll')
        .send()
        .expect(401)
})

/**
 * User profile fetching scenarios below.
 * GET: /users/me
 */

test('Should get profile for user', async () => {
    await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)
})

test('Should not get profile for unauthenticated user', async () => {
    await request(app)
        .get('/users/me')
        .send()
        .expect(401)
})

/**
 * User profile update scenarios below.
 * PATCH: /users/me
 */

test('Should update valid user fields: name, email, and password', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: 'Samantha',
            email: 'samantha123@newemail.com',
            password: 'samPass999'
        })
        .expect(200)

    const user = await User.findById(userOne._id)
    expect(user).toMatchObject({
        name: 'Samantha',
        email: 'samantha123@newemail.com',
    })
})

test('Should not update user with invalid email, or password', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            email: 'samemail.com'
        })
        .expect(400)

    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            password: 'pass9'
        })
        .expect(400)
})

test('Should not update invalid user fields', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            location: 'New York'
        })
        .expect(400)
})

test('Should not update user if unauthenticated', async () => {
    await request(app)
        .patch('/users/me')
        .send({
            name: 'Jessy'
        })
        .expect(401)
})

/**
 * User deletion scenarios below.
 * DELETE: /users/me
 */

test('Should delete account for user', async () => {
    await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const user = await User.findById(userOne)
    expect(user).toBeNull()
})

test('Should not delete account for unauthenticated user', async () => {
    await request(app)
        .delete('/users/me')
        .send()
        .expect(401)
})