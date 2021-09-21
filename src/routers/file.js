/**
 * This file includes router about file
 */

const express = require('express')
const { listFolders, createFolder, listFiles, uploadFile, deleteFile, emptyDirectory } = require('./utils/s3')
const { decode } = require('./utils/pathModifier');
const upload = require('./utils/upload')
const auth = require('../middleware/auth')
const File = require('../models/file')

const router = new express.Router()

/**
 * Upload file.
 * Requirement: file and directory
 */
router.post('/file', auth, upload.single('file'), async (req, res) => {
    if (!req.file || req.body.directory === undefined) {
        return res.status(400).send()
    }

    const directory = req.user._id + '/' + req.body.directory.trim()
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
        res.status(500).send(e.message)
    }
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

/**
 * List files and folders in directory
 * Requirement: directory
 */
router.get('/file/list', auth, async (req, res) => {
    // directory field not provided
    if (req.query.directory === undefined) {
        return res.status(400).send()
    }

    try {
        const fileList = await listFiles(req.user._id + '/' + decode(req.query.directory))

        if (fileList.length === 0 && req.query.directory !== '') {
            return res.status(404).send({ error: 'Directory not exist' })
        }

        res.send(fileList)
    } catch (e) {
        res.status(500).send()
    }
})

/**
 * Get file link
 * Requirement: directory and filename
 */
router.get('/file/link', auth, async (req, res) => {
    // filepath not provided
    if (req.query.directory === undefined || req.query.filename === undefined) {
        return res.status(400).send()
    }
    
    try {
        const file = await File.findOne({ directory: decode(req.query.directory), filename: req.query.filename, owner: req.user._id })
        if (!file) {
            return res.status(404).send()
        }

        res.send([ file.url ])
    } catch (e) {
        res.status(500).send()
    }
})

/**
 * List folders in directory
 * Requirement: directory
 */
router.get('/file/folders', auth, async (req, res) => {
    if (req.query.directory === undefined) {
        return res.status(400).send()
    }

    try {
        const folders = await listFolders(req.user._id + '/' + decode(req.query.directory))
        if (folders.error) {
            return res.status(404).send(folders.error)
        }
        res.send(folders)
    } catch (e) {
        res.status(500).send(e.message)
    }
})

/**
 * Create folder
 * Requirement: directory and folderName
 */
router.post('/file/folders', auth, async (req, res) => {
    // directory or folderName not provided
    if (req.body.directory === undefined || req.body.folderName === undefined) {
        return res.status(400).send()
    }

    try {
        createFolder(req.user._id + '/' + req.body.directory.trim(), req.body.folderName, (err) => {
            if (err) {
                return res.status(400).send(err)
            }
            res.status(201).send()
        })
    } catch (e) {
        res.status(500).send(e)
    }    
})

/**
 * Delete file or empty folder
 * Requirement: directory and filename
 */
router.delete('/file', auth, async (req, res) => {
    // directory or folderName not provided
    if (req.query.directory === undefined || req.query.filename === undefined) {
        return res.status(400).send()
    }

    const directory = decode(req.query.directory).trim()
    const filename = decode(req.query.filename)
    const filepath = req.user._id + '/' + directory + filename

    try {
        const deletionError = await deleteFile(filepath)
        // Invalid filepath (not exist or non-empty folder)
        if (deletionError) {
            return res.status(400).send(deletionError)
        }

        // If it is a file, delete data from database
        if (!filename.endsWith('/')) {
            const deletedFile = await File.findOneAndDelete({ directory, filename, owner: req.user._id });
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

/**
 * Delete folder and its contents recursively
 * Requirement: directory
 */
router.delete('/file/directory', auth, async (req, res) => {
    // directory field not provided
    if (req.query.directory === undefined) {
        return res.status(400).send();
    }

    try {
        const filelist = await emptyDirectory(req.user._id + '/' + decode(req.query.directory).trim());
        // directory not exist
        if (filelist.error) {
            return res.status(404).send(filelist);
        }
        
        // If it is a file, delete data from database
        filelist.forEach(async (key) => {
            key = key.replace(req.user._id + '/', '');
            const divisionIndex = key.lastIndexOf('/');
            const directory = key.substring(0, divisionIndex+1);
            const filename = key.substring(divisionIndex+1, key.length+1);
            const file = await File.findOneAndDelete({ directory, filename, owner: req.user._id });

            if (!file) {
                return res.status(404).send()
            }
        })
        
        res.send()
    } catch (e) {
        res.status(500).send(e)
    }
})

/**
 * List all files of user.
 * Options: limit, skip, sortBy, tag
 * 
 * Examples
 * GET /file/me?limit=10&skip=10
 * GET /file/me?sortBy=createdAt:desc
 */
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

module.exports = router