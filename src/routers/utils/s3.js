const AWS = require('aws-sdk')

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const IdentityPoolId = process.env.IDENTITY_POOL_ID

AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
})

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: bucketName }
})

const listFolders = async (directory) => {
    const listedObjects = await s3.listObjectsV2({ Delimiter: '/', Prefix: directory }).promise()
    
    if (listedObjects.CommonPrefixes.length === 0) {
        return { error: 'Folder is empty!' }
    }
    const folders = []
    listedObjects.CommonPrefixes.forEach(({ Prefix }) => {
        folders.push(Prefix.replace(directory, ''))
    })
    
    return folders
}

const createFolder = (directory, folderName, callback) => {
    folderName = folderName.trim()
    if (!folderName) {
        return callback({ error: 'Folder names must contain at least one non-space character.' })
    }

    s3.headObject({ Key: directory + folderName + '/' }, (err, data) => {
        if (!err) { return callback({ error: 'Folder already exists!' }) }
        if (err.code !== 'NotFound') { return callback({ error: 'There was an error creating your folder!' }) }

        s3.putObject({ Key: directory + folderName + '/' }, (err, data) => {
            if (err) { callback({ error: 'There was an error creating your folder!' }) }
            callback()
            console.log('Successfully created folder')
        })
    })
}

const listFiles = async (directory) => {
    const listedObjects = await s3.listObjectsV2({ Prefix: directory }).promise()

    const keys = []
    listedObjects.Contents.forEach(({ Key }) => {
        Key = Key.replace(directory, '')
        const index = Key.indexOf('/')
        if (index !== -1 && index !== Key.length-1) {
            Key = Key.substring(0, index+1)
        }

        if (keys.indexOf(Key) === -1) {
            keys.push(Key)
        }
    })

    return keys
}

const uploadFile = async (folder, file) => {
    const fileKey = folder + file.name

    const listedObjects = await s3.listObjectsV2({ Prefix: fileKey }).promise()

    if (listedObjects.Contents.length !== 0) {
        return { error: 'File already exists' }
    }

    await s3.upload({
        Key: fileKey,
        Body: file,
        ACL: 'public-read'
    }).promise()

    console.log('File uploaded!')
    return buildUrl(fileKey)
}

const deleteFile = async (filepath) => {
    const deletedFile = await s3.listObjectsV2({ Prefix: filepath }).promise()

    console.log(deletedFile.Contents)

    if (deletedFile.Contents.length !== 1) {
        return { error: 'Please provide a valid filepath' }
    }

    await s3.deleteObject({ Key: filepath }).promise()

    console.log('File deleted!')
}

const emptyDirectory = async (directory) => {
    const listedObjects = await s3.listObjectsV2({ Prefix: directory }).promise()

    if (listedObjects.Contents.length === 0) {
        return { error: 'Directory does not exist.' }
    }

    const deleteParams = { Delete: { Objects: [] } }
    const deletedFileList = []

    listedObjects.Contents.forEach(({ Key }) => {
        deleteParams.Delete.Objects.push({ Key })
        if (!Key.endsWith('/')) { deletedFileList.push(Key) }
    })

    await s3.deleteObjects(deleteParams).promise()

    if (listedObjects.IsTruncated) {
        await emptyS3Directory()
    }

    console.log('Directory emptied!')
    return deletedFileList
}

const buildUrl = (filepath) => { return `https://s3.${process.env.BUCKET_REGION}.amazonaws.com/${process.env.BUCKET_NAME}/${filepath}` }

module.exports = {
    listFolders,
    createFolder,
    listFiles,
    uploadFile,
    deleteFile,
    emptyDirectory
}