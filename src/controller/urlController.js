const UrlMODEl = require('../model/urlmodel')
const ShortId = require('shortid') 


const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    18550,
  "redis-18550.c212.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("YFIQQ9yJjOEysL9iQ4mss8erAC55srfx", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const isValid = function(value){
    if(typeof (value) == 'undefined' || value == null) return false
    if(typeof (value) == 'string', value.trim().length > 0) return true
}

const isValidRequest = function(object){
    return Object.keys(object).length > 0
}

const isValidUrl = function(value){
    let regexForUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-])?\??(?:[-\+=&;%@.\w])#?(?:[\w]*))?)/
    return regexForUrl.test(value)
}



const urlShortener = async function (req, res) {
    try {
    const requestBody = req.body;
    const queryParams = req.query;
  
    //query params must be empty
    if (isValidRequest(queryParams)) {
      return res.status(400).send({ status: false, message: "invalid request" });
    }
  
    if (!isValidRequest(requestBody)) {
      return res.status(400).send({ status: false, message: "data is required" });
    }
    //base url is taken from readme
    const longUrl = req.body.longUrl;
    const base = "http://localhost:3000/";
  
    if (!isValid(longUrl)) {
      return res.status(400).send({ status: false, message: "URL is required" });
    }
  
    // if requestBody has more than one key
    if (Object.keys(requestBody).length > 1) {
      return res.status(400).send({ status: false, message: "invalid request" });
    }
  
    if (!isValidUrl(longUrl)) {
      return res
        .status(400)
        .send({ status: false, message: "Enter a valid URL" });
    }
  
    
      // first lets check catch memory has any data related to input longURL
      const urlDataFromCatch = await GET_ASYNC(longUrl);
  
      if (urlDataFromCatch) {
        const data = {
        longUrl: longUrl,
        shortUrl: base + urlDataFromCatch,
        urlCode: urlDataFromCatch,
         };
        res.status(200).send({
          status: true,
          message: "Url shorten successfully",
          data: data,
        });
      } else {
        // now as data is not available is catch memory lets check inside DB
        const urlDataFromDB = await UrlMODEl.findOne({ longUrl }).select({
            longUrl: 1,
            shortUrl: 1,
            urlCode: 1,
          _id: 0,
        });
  
        // if url is present in our DB then first add data to catch then send DB fetched data in response
        if (urlDataFromDB) {
          const addingUrlDataInCatchByLongUrl = await SET_ASYNC(
            urlDataFromDB.longUrl,
            urlDataFromDB.urlCode
          );
  
          const addingUrlDataInCatchByUrlCode = await SET_ASYNC(
            urlDataFromDB.urlCode,
            urlDataFromDB.longUrl
          );
  
          return res.status(200).send({
            status: true,
            message: "url shorten successfully",
            data: url,
          });
  
          //else we will create a new document in DB. Also add same data inside catch memory for future call
        } else {
          // generating random code by using shortid package
          const urlCode = ShortId.generate().toLowerCase();
          const shortUrl = base + urlCode;
  
          const urlData = {
           
            longUrl: longUrl.trim(),
            shortUrl: shortUrl,
            urlCode: urlCode,
          };
  
          // creating url data inside DB and setting same data to catch memory
          const newUrl = await UrlMODEl.create(urlData);
  
          const addingUrlDataInCatchByLongUrl = await SET_ASYNC(
            urlData.longUrl,
            urlData.urlCode
          );
  
          const addingUrlDataInCatchByUrlCode = await SET_ASYNC(
            urlData.urlCode,
            urlData.longUrl
          );
  
          // in response we are sending urlData as per demand
          return res.status(201).send({
            status: true,
            message: "url shorten successfully",
            data: urlData,
          });
        }
      }
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  };
  
  //*************GET URL******************* */
  
  const getUrl = async function (req, res) {
    try {
    const requestBody = req.body;
    const queryParams = req.query;
    //const urlCode = req.params.urlCode;
    
      // query params must be empty
      if (isValidRequest(queryParams)) {
        return res
          .status(400)
          .send({ status: false, message: "invalid request" });
      }
  
      if (isValidRequest(requestBody)) {
        return res
          .status(400)
          .send({ status: false, message: " input data is not required" });
      }
      
      const urlCode = req.params.urlCode;
      
      if (!urlCode) {
        return res.status(400).send({ status: false, message: " urlCode is required" });
      }
      
  
      // First lets check inside catch memory
      const urlDataFromCatch = await GET_ASYNC(urlCode);
  
      if (urlDataFromCatch) {
        return res.redirect(urlDataFromCatch);
      } else {
        const urlDataByUrlCode = await UrlMODEl.findOne({ urlCode });
  
        if (!urlDataByUrlCode) {
          return res
            .status(404)
            .send({ status: false, message: "no such url exist" });
        }
  
        const addingUrlDataInCatchByUrlCode = SET_ASYNC(
          urlCode,
          urlDataByUrlCode.longUrl
        );
        const addingUrlDataInCatchByLongUrl = SET_ASYNC(
          urlDataByUrlCode.longUrl,
          urlCode
        );
  
        // if we found the document by urlCode then redirecting the user to original url
        return res.redirect(urlDataByUrlCode.longUrl);
      }
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  };





module.exports.urlShortener = urlShortener
module.exports.getUrl = getUrl
//module.exports={urlShortener,getUrl}

