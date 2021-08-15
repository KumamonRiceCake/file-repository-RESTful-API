const request = require('supertest')
const app = require('../src/app')
const File = require('../src/models/file')
const {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    fileOne,
    fileTwo,
    fileThree,
    setupDatabase
} = require('./fixtures/db')

beforeEach(setupDatabase)

// Should upload file for user
// Should not upload file if user is unauthenticated
// Should fetch folders in directory
// Should not fetch folders for nonexistent directory
// Should not fetch folders if user is unauthenticated
// Should create folder for user
// Should not create folder if user is unauthenticated
// Should not create folder if it already exists
// Should delete file for user
// Should not delete file if user is unauthenticated
// Should not delete file if it does not exist
// Should fetch files in directory for user
// Should not fetch files in directory if user is unauthenticated
// Should not fetch files in nonexistent directory
// Should empty directory for user
// Should not empty directory if user is unauthenticated
// Should not empty nonexistent directory
// Should get url link of file for user
// Should not get file link if user is unauthenticated
// Should not get link of nonexistent file
// Should fetch all files of user
// Should not fetch files for unauthenticated user
// Should sort files by createdAt
// Should sort files by updatedAt
// Should sort files by filename
// Should fetch page of files


