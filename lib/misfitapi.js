'use strict';

function SiteError(code, message, type, cause, extra) {
  this.code = code;
  this.message = message;
  this.type = type;
  this.cause = cause;
  this.extra = extra;
  this.stack = (cause && cause.stack) ? cause.stack : undefined;
}

SiteError.prototype = {
  toString: function() {
    return 'SiteError: ' + this.code + ', ' + this.message;
  },
  
  toJson: function() {
    return '{"code":"'+this.code+'", "message":"'+this.message+'"}';
  },
  
  stack: function() {
    if (this.cause && this.cause.stack) return this.cause.stack;
    return 'No error stack!';
  }
  
};


var querystring = require('querystring');
var request  = require('request');
var util = require('util');
var _ = require('lodash');

var HTTP_TIMEOUT = 30000;
var MODULE_NAME = 'MisfitAPI';

function MisfitAPI(app){
  this.app = _.defaults(app||{},{
    clientKey:'your default clientKey',//clientKey in our developer portal
    clientSecret:'your default clientSecret',//clientSecret in our developer portal
    apiRoot:'https://api.misfitwearables.com',
    redirect_uri: 'https://your.default.redirect_uri.here',
    response_type: 'code',
    scope:'public,email,birthday,tracking,sessions,sleeps',
  });
}



var endpoint = {
  authorize: '/auth/dialog/authorize',
  exchange: '/auth/tokens/exchange',
  profile: '/move/resource/v1/user/:userId/profile',
  profileWithId: '/move/resource/v1/user/:userId/profile/:id',
  device: '/move/resource/v1/user/:userId/device',
  deviceWithId: '/move/resource/v1/user/:userId/device/:id',
  goal: '/move/resource/v1/user/:userId/activity/goals',
  goalWithId: '/move/resource/v1/user/:userId/activity/goals/:id',
  summary: '/move/resource/v1/user/:userId/activity/summary',
  session: '/move/resource/v1/user/:userId/activity/sessions',
  sessionWithId: '/move/resource/v1/user/:userId/activity/sessions/:id',
  sleep: '/move/resource/v1/user/:userId/activity/sleeps',
  sleepWithId: '/move/resource/v1/user/:userId/activity/sleeps/:id',
  push: '/shine/v7/open/push',
  batchRequest: '/shine/v7/open/batch_request',
  revoke: '/auth/tokens/revoke',
};


function getResource(app, resource, params, callback){
  var url = app.apiRoot + endpoint[resource];
  if(params.id){
    url = app.apiRoot + endpoint[resource+'WithId'];
    url = url.replace(/:id/,params.id);
    delete params.id;
  }
  if(params.userId){
    url = url.replace(/:userId/,params.userId);
    delete params.userId;
  }else{
    url = url.replace(/:userId/,'me');
  }
  var headers = {};
  var tk = params.token;
  if(!tk){
    headers = {
      app_id: app.clientKey,
      app_secret: app.clientSecret,
    };
  }else{
    headers = {
      Authorization:"Bearer "+tk
    };
  }
  request({
    url: url+'?'+querystring.stringify(params),
    headers: headers,
    timeout:HTTP_TIMEOUT
  },function(err,response,body){
    console.log(MODULE_NAME,'getResource',body,url+'?'+querystring.stringify(params));

    if(err){
      console.error(MODULE_NAME,'getResource',err);
      return callback(err);
    }
    if(response.statusCode!=200){
        return callback(new SiteError( 500,  body ));
    }
    try{
      var result = JSON.parse(body);
    }catch(e){
      return callback(new SiteError(500, body));
    } 
    return callback(null,result);  
  });
}

MisfitAPI.prototype = {
  authorize: function (callback) {
    var app = this.app;
    var url = util.format('%s%s?%s',app.apiRoot,endpoint.authorize,querystring.stringify({
      client_id:app.clientKey,
      response_type:app.response_type,
      redirect_uri: app.redirect_uri,
      scope:app.scope,
    }));
    callback(null,url);
  }, 
  exchange: function (code, callback) {
    var app = this.app;
    var url = app.apiRoot + endpoint.exchange;
    var body = querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      client_id: app.clientKey,
      client_secret: app.clientSecret,
      redirect_uri: app.redirect_uri,//should be the same with the uri in the authorize step
    });

    var headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    request.post({
      url: url,
      headers: headers,
      body: body,
      timeout:HTTP_TIMEOUT
    },function(err,response,body){
      if(err){
        return callback(err);
      }
      if(response.statusCode!=200){
        return callback(new SiteError(response.statusCode, body));
      }
      try{
      var result = JSON.parse(body);
      }catch(e){
        return callback(new SiteError(response.statusCode, body));
      } 
      return callback(null,result);
    });
  },
  getProfile: function (params, callback) {
    /*
    {
      "userId":"theId",
      "name":"Misfit",
      "birthday":"1955-07-06",
      "gender":"female"
    }
    */
    return getResource(this.app, 'profile', params, callback);
  },
  getDevice: function (params, callback) {
    /*
    {
      "id":"theId",
      "deviceType":"shine",
      "serialNumber":"XXXXXV0011",
      "firmwareVersion":"0.0.50r",
      "batteryLevel":40
    } 
    */
    return getResource(this.app, 'device', params, callback);
  },
  getGoals: function (params, callback) {
    /* 
     {
      "goals":[
        {
          "id":"theId",
          "date":"2013-10-05",
          "points":500,
          "targetPoints":1000
        },
        ...
      ]
    }
    */
    getResource(this.app, 'goal', params, callback);
  },
  getSummary: function (params, callback) {
  /*
  {
      "points": 96.4,
      "steps": 888,
      "calories": 3132.3888,
      "activityCalories": 547.1241,
      "distance": 0.2821
  }
  detail==true:
  {
    "summary": [
      {
        "date": "2013-11-05",
        "points": 394.4,
        "steps": 3650,
        "calories": 1687.4735,
        "activityCalories": 412.3124,
        "distance": 1.18
      },
      {
        "date": "2013-11-06",
        "points": 459.6,
        "steps": 4330,
        "calories": 1707.8484,
        "activityCalories": 412.3124,
        "distance": 1.3982
      },...
    ]
  }
  */
    return getResource(this.app, 'summary', params, callback);
  },
  getSession: function (params, callback) {
  /*
  {
    "sessions":[
      {
        "id":"theId",
        "activityType":"Cycling",
        "startTime":"2014-05-19T10:26:54-04:00",
        "duration":900,
        "points":210.8,
        "steps":1406,
        "calories":25.7325,
        "distance":0.5125
      },
      ...
    ]
  }
  */
    return getResource(this.app, 'session', params, callback);
  },
  getSleep: function (params, callback) {
  /*
  {
    "sleeps":[
      {
        "id":"theId",
        "autoDetected": false,
        "startTime":"2014-05-19T23:26:54+07:00",
        "duration": 0,
        "sleepDetails":[
          {
            "datetime":"2014-05-19T23:26:54+07:00",
            "value":2
          },
          {
            "datetime":"2014-05-19T23:59:22+07:00",
            "value":1
          },
          ...
        ]
      },
      ...
    ]
  }
  */
    return getResource(this.app, 'sleep', params, callback);
  },
};


module.exports = MisfitAPI;








