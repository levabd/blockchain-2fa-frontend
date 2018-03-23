const express = require('express')
const app = express()
const port = process.env.PORT || 8080
const router = express.Router()
app.use(express.static(`${__dirname}/dist`)) // set the static files location for the static html
app.engine('.html', require('ejs').renderFile)
app.set('views', `${__dirname}/dist`)
router.get('/get-config', (req, res, next) => {
  const config = {
    API_URL: process.env.API_URL || 'http://localhost:3000/v1/api',
    VALIDATOR_API_URL: process.env.VALIDATOR_API_URL || 'http://sawtooth-validator-public:8008'
  };
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(config));
})
router.get('/*', (req, res, next) => {
  res.sendFile(`${__dirname}/dist/index.html`)
})
app.use('/', router)
app.listen(port)
console.log('App running on port', port)
