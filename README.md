misfit-cloud-api-sample
=======================

Nodejs sample for Misfit Cloud API

## Install:

```bash
npm install misfit-cloud-api --save
```

## Usage:

```javascript
var MisfitAPI = require('misfit-cloud-api'); 
```

### Redirect to authorization URL:
```javascript
var mySettings = {
	clientKey:'your clientKey',//clientKey in our developer portal
	clientSecret:'your clientSecret',//clientSecret in our developer portal
	redirect_uri: 'https://your.redirect_uri.here',
};
var misfitApi = new MisfitAPI(mySettings);
misfitApi.authorize(function(err,redirectURL){
  //redirect to redirectURL here
});

```

### Exchange access token and get profile:
```javascript

var mySettings = {
	clientKey:'your clientKey',//clientKey in our developer portal
	clientSecret:'your clientSecret',//clientSecret in our developer portal
	redirect_uri: 'https://your.redirect_uri.here',
};
var misfitApi = new MisfitAPI(mySettings);
misfitApi.exchange(req.query.code, function(err,token){//req.query.code: the code parameter in URL
  if(err){
    return callback(err);
  }
  misfitApi.getProfile({token:token.access_token},function(err,profile){
    if(err)return callback(err);
    if(profile&&profile.userId){
      //do what ever you want with the profile, like login.
    }else{
      return res.forbidden();
    }
  })
});

```