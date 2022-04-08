const express = require('express')
const router = express.Router()
const UrlController = require('../controller/urlController')

// test API
router.get('/test', function(req, res){
    res.send({status : true, message : "Test API working fine"})
})

router.post('/url/shorten', UrlController.urlShortener )

router.get('/:urlCode', UrlController.getUrl)









module.exports = router