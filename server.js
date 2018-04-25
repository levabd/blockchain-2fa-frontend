const express = require('express')
const app = express()
const port = process.env.PORT || 80
const router = express.Router()
app.use(express.static(`${__dirname}/dist`)) // set the static files location for the static html
app.engine('.html', require('ejs').renderFile)
app.set('views', `${__dirname}/dist`)
router.get('/get-config', (req, res, next) => {
  const config = {
    API_URL: process.env.API_URL || 'https://allatrack-tfa.tk:443/v1/api',
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
