const express = require('express')
require('./db/mongoose')
const userRouter = require('./routers/user')
const fileRouter = require('./routers/file')

const app = express()

app.use(express.json())
app.use(userRouter)
app.use(fileRouter)

module.exports = app