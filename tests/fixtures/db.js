const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../../src/models/user')
const File = require('../../src/models/file')

const userOneId = new mongoose.Types.ObjectId()
const userOne = {
    _id: userOneId,
    name: 'Jeong Won Kim',
    email: 'lhouette@gmail.com',
    password: 'jwkPass123!',
    tokens: [{
        token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET)
    }]
}

const userTwoId = new mongoose.Types.ObjectId()
const userTwo = {
    _id: userTwoId,
    name: 'Naomi',
    email: 'naomi@example.com',
    password: 'naomi12345!@',
    tokens: [{
        token: jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET)
    }]
}

const fileOne = {
    _id: new mongoose.Types.ObjectId(),
    directory: 'first directory for test',
    filename: 'first file for test',
    url: 'first url for eest',
    owner: userOne._id
}

const fileTwo = {
    _id: new mongoose.Types.ObjectId(),
    directory: 'second directory for test',
    filename: 'second file for test',
    url: 'second url for eest',
    owner: userOne._id
}

const fileThree = {
    _id: new mongoose.Types.ObjectId(),
    directory: 'third directory for test',
    filename: 'third file for test',
    url: 'third url for eest',
    owner: userTwo._id
}

const setupDatabase = async () => {
    await User.deleteMany()
    await File.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
    await new File(fileOne).save()
    await new File(fileTwo).save()
    await new File(fileThree).save()
}

module.exports = {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    fileOne,
    fileTwo,
    fileThree,
    setupDatabase
}