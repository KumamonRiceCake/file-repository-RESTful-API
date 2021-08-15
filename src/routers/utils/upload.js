const multer = require('multer')

const upload = multer({
    limits: {
        fileSize: 20000000  //20mb
    }
})

module.exports = upload