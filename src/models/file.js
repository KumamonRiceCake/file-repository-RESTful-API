const mongoose = require('mongoose')

const fileSchema = new mongoose.Schema({
    directory: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
})

const File = mongoose.model('File', fileSchema)

module.exports = File