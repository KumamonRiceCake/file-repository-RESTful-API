/**
 * This tests scenarios of image router
 */

const request = require('supertest')
const app = require('../src/app')
const File = require('../src/models/file')
const { userOneId, userOne, setupDatabase } = require('./fixtures/db')
const { emptyDirectory } = require('../src/routers/utils/s3')

beforeEach(async () => {
    await emptyDirectory(userOne._id + '/')
    await setupDatabase()
    await request(app)
        .post('/file')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('file', 'tests/fixtures/test_text.txt')
        .field('directory', 'test1/test1-1/')
    await request(app)
        .post('/file')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('file', 'tests/fixtures/sample-script.bash')
        .field('directory', 'test1/test1-1/')
})

/**
 * File uploading scenarios below.
 * POST: /file
 */

test('Should upload file for user', async () => {
    const response = await request(app)
        .post('/file')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('file', 'tests/fixtures/sample.jpg')  // This should be from the root of the project
        .field('directory', 'test1/test1-1/')
        .expect(200)

    expect(response.body).toMatchObject({
        directory: 'test1/test1-1/',
        filename: 'sample.jpg'
    })

    const file = await File.findOne({
        directory: 'test1/test1-1/',
        filename: 'sample.jpg',
        owner: userOneId
    })

    expect(file).not.toBeNull()
})


/**
 * Folder list fetching scenarios below.
 * GET: /file/folders
 */

test('Should fetch folders in directory', async () => {
    const response = await request(app)
        .get('/file/folders?directory=test1%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(1)
})

test('Should not fetch folders for nonexistent directory', async () => {
    await request(app)
        .get('/file/folders?directory=non-exist%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(404)
})

/**
 * Folder creation scenarios below.
 * POST: /file/folders
 */

test('Should create folder for user', async () => {
    await request(app)
        .post('/file/folders')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            directory: "test1/",
            folderName: "test1-2"
        })
        .expect(201)
})

/**
 * File deletion scenarios below.
 * DELETE: /file
 */

test('Should delete file for user', async () => {
    const response = await request(app)
        .delete('/file?directory=test1%test1-1%&filename=test_text.txt')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            directory: "test1/test1-1/",
            filename: "test_text.txt"
        })
        .expect(200)

    expect(response.body).toMatchObject({
        directory: 'test1/test1-1/',
        filename: 'test_text.txt'
    })
    
    const file = await File.findOne({
        directory: 'test1/test1-1/',
        filename: 'test_text.txt',
        owner: userOneId
    })

    expect(file).toBeNull()
})

test('Should not delete file if it does not exist', async () => {
    await request(app)
        .delete('/file?directory=test1%test1-1%&filename=non-existent.png')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(400)
})

/**
 * File list fetching scenarios below.
 * GET: /file/list
 */

test('Should fetch files in directory for user', async () => {
    const response = await request(app)
        .get('/file/list?directory=test1%test1-1%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
})

test('Should not fetch files in nonexistent directory', async () => {
    await request(app)
        .get('/file/list?directory=non-exist%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            directory: "test1/non-existent/"
        })
        .expect(404)
})

/**
 * Directory deletion scenarios below.
 * DELETE: /file/directory
 */

test('Should empty directory for user', async () => {
    const response = await request(app)
        .delete('/file/directory?directory=test1%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const files = await File.find({
        owner: userOneId
    })

    expect(files.length).toEqual(0)
})

test('Should not empty nonexistent directory', async () => {
    await request(app)
        .delete('/file/directory?directory=non-exist%')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(404)
})

/**
 * File URL link fetching scenarios below.
 * GET: /file/link
 */

test('Should get url link of file for user', async () => {
    const response = await request(app)
        .get('/file/link?directory=test1%test1-1%&filename=test_text.txt')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body[0]).toEqual(expect.any(String))
})

test('Should not get link of nonexistent file', async () => {
    await request(app)
        .get('/file/link?directory=test1%test1-1%&filename=non-existent.jpg')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(404)
})

/**
 * All user images fetching with options scenarios below.
 * GET: /image/me
 */

test('Should fetch all files of user', async () => {
    const response = await request(app)
        .get('/file/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
})

test('Should not fetch files for unauthenticated user', async () => {
    await request(app)
        .get('/file/me')
        .send()
        .expect(401)
})

test('Should sort files by createdAt', async () => {
    //file/me?sortBy=createdAt:desc
    const response = await request(app)
        .get('/file/me?sortBy=createdAt:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        directory: "test1/test1-1/",
        filename: "sample-script.bash"
    })
})

test('Should sort files by updatedAt', async () => {
    const response = await request(app)
        .get('/file/me?sortBy=updatedAt:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        directory: "test1/test1-1/",
        filename: "sample-script.bash"
    })
})

test('Should sort files by filename', async () => {
    const response = await request(app)
        .get('/file/me?sortBy=filename:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        directory: "test1/test1-1/",
        filename: "test_text.txt"
    })
})

test('Should fetch page of files', async () => {
    const response = await request(app)
        .get('/file/me?limit=2&skip=1')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(1)
    expect(response.body[0]).toMatchObject({
        directory: "test1/test1-1/",
        filename: "sample-script.bash"
    })
})