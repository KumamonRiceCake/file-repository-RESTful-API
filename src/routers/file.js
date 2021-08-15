const express = require('express')
const { listFolders, createFolder, listFiles, uploadFile, deleteFile, emptyDirectory } = require('./utils/s3')
const upload = require('./utils/upload')
const auth = require('../middleware/auth')
const File = require('../models/file')

const router = new express.Router()

// Upload file
router.post('/file', auth, upload.single('file'), async (req, res) => {
    if (!req.file || req.body.directory === undefined) {
        return res.status(400).send()
    }

    const directory = req.user._id + '/' + req.body.directory
    const file = req.file.buffer
    file.name = req.file.originalname
    
    try {
        const fileUpload = await uploadFile(directory, file)
        if (fileUpload.error) {
            return res.status(400).send(fileUpload)
        }

        const fileData = new File({
            directory: req.body.directory,
            filename: file.name,
            url: fileUpload,
            owner: req.user._id
        })
        await fileData.save()

        res.send(fileData)
    } catch (e) {
        res.status(500).send(e)
    }
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

// List files and folders in folder
router.get('/file/directory', auth, async (req, res) => {
    // directory field not provided
    if (req.body.directory === undefined) {
        return res.status(400).send()
    }

    try {
        const fileList = await listFiles(req.user._id + '/' + req.body.directory)

        if (fileList.length === 0) {
            return res.status(404).send({ error: 'Directory not exist' })
        }

        res.send(fileList)
    } catch (e) {
        res.status(500).send()
    }
})

// Get file link
router.get('/file', auth, async (req, res) => {
    // filepath not provided
    if (req.body.directory === undefined || req.body.filename === undefined) {
        return res.status(400).send()
    }
    
    try {
        const file = await File.findOne({ directory: req.body.directory, filename: req.body.filename, owner: req.user._id })
        if (!file) {
            return res.status(404).send()
        }

        res.send(file.url)
    } catch (e) {
        res.status(500).send()
    }
})

// List folders
router.get('/file/folders', auth, async (req, res) => {
    if (req.body.directory === undefined) {
        return res.status(400).send()
    }

    try {
        const folders = await listFolders(req.user._id + '/' + req.body.directory)
        if (folders.error) {
            return res.status(404).send(folders.error)
        }
        res.send(folders)
    } catch (e) {
        res.status(500).send(e.message)
    }
})

// Create folder
router.post('/file/folders', auth, async (req, res) => {
    // directory or folderName not provided
    if (req.body.directory === undefined || req.body.folderName === undefined) {
        return res.status(400).send()
    }

    try {
        createFolder(req.user._id + '/' + req.body.directory, req.body.folderName, (err) => {
            if (err) {
                return res.status(400).send(err)
            }
            res.status(201).send()
        })
    } catch (e) {
        res.status(500).send(e)
    }    
})

// Delete file or folder
router.delete('/file', auth, async (req, res) => {
    // directory or folderName not provided
    if (req.body.directory === undefined || req.body.filename === undefined) {
        return res.status(400).send()
    }

    const filepath = req.user._id + '/' + req.body.directory + req.body.filename

    try {
        const deletionError = await deleteFile(filepath)
        // Invalid filepath (not exist or non-empty folder)
        if (deletionError) {
            return res.status(400).send(deletionError)
        }

        // If it is a file, delete data from database
        if (!req.body.filename.endsWith('/')) {
            const deletedFile = await File.findOneAndDelete({ directory: req.body.directory, filename: req.body.filename, owner: req.user._id })
            if (!deletedFile) {
                return res.status(404).send()
            }
            return res.send(deletedFile)
        }

        res.send()
    } catch (e) {
        res.status(500).send(e.message)
    }
})

// Empty directory
router.delete('/file/directory', auth, async (req, res) => {
    // directory field not provided
    if (req.body.directory === undefined) {
        return res.status(400).send()
    }

    try {
        const filelist = await emptyDirectory(req.user._id + '/' + req.body.directory)
        // directory not exist
        if (filelist.error) {
            return res.status(404).send(filelist)
        }
        
        // If it is a file, delete data from database
        filelist.forEach(async (key) => {
            key = key.replace(req.user._id + '/', '')
            const divisionIndex = key.lastIndexOf('/')
            const directory = key.substring(0, divisionIndex+1)
            const filename = key.substring(divisionIndex+1, key.length+1)
            const file = await File.findOneAndDelete({ directory, filename, owner: req.user._id })

            if (!file) {
                return res.status(404).send()
            }
        })
        
        res.send()
    } catch (e) {
        res.status(500).send(e)
    }
})

// List all files of user
// GET /file/me?limit=10&skip=10
// GET /file/me?sortBy=createdAt:desc
router.get('/file/me', auth, async (req, res) => {
    const sort = {}
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await req.user.populate({
            path: 'files',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        
        if (!req.user.files) {
            return res.status(404).send()
        }

        res.send(req.user.files)
    } catch (e) {
        res.status(500).send(e)
    }
})

// TODO: list public files

module.exports = router