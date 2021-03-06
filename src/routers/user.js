/**
 * This file includes router about users
 */

const express = require('express')
const { emptyDirectory } = require('./utils/s3')
const User = require('../models/user')
const auth = require('../middleware/auth')
const router = new express.Router()

/**
 * Sign up new user.
 * Requirement: user name, email, password
 */
router.post('/users', async (req, res) => {
    const user = new User(req.body)
    
    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

/**
 * Login user.
 * Requirement: email, password
 */
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send()
    }
})

/**
 * Logout user.
 */
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

/**
 * Logout all user tokens.
 */
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

/**
 * Get user profile.
 */
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

/**
 * Update user profile.
 * Allowed update fields: name, email, password
 */
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

/**
 * Delete user.
 */
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()

        // Empty user directory
        await emptyDirectory(req.user._id + '/')

        res.send(req.user)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router