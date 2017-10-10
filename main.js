var APIKey = "";
var APIKeySecret = "";
var callbackURL = "https://05tkqekkjc.execute-api.us-west-2.amazonaws.com/prod/printedin-linkedin-auth-callback/";
var stateValues = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
var cookieKey = 'LIAccess_token';

var https = require('https');
var exec = require('child_process').exec;
var result = {cookie:null,data:null};

exports.handler = function(event, context) {
    //console.log('@@@PETICION:' + JSON.stringify(event, null, 2));
    var cookie = getAuthCookie(event.cookies);
    if(cookie){
        console.log('@@@ getData HAY COOKIE -> ' + cookie);
        getData(context, cookie);
    } else if(event.code){
		getAccessToken(context, event.code);
    } else if (event.error){
        context.fail(event.error_description);  
    } else {
        authorize(context);
    } 
};

function authorize(context){
    console.log("@@@ authorize");
    context.done('https://www.linkedin.com/uas/oauth2/authorization' + 
		    '?response_type=code&client_id=' + APIKey + 
		    '&scope=r_basicprofile' + 
		    '&state=RNDM_' + randomState(18) + 
		    '&redirect_uri=' + callbackURL);
}


function getAuthCookie(cookies){
	var values = {};
	cookies && cookies.split(';').forEach(function(cookie) {
		var parts = cookie.split('=');
		values[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	return values[cookieKey];
}

function randomState(length) {
	var result = "";
	
	length = parseInt(length);		
	if (!length || length <= 0) {
		length = 18;
	}	
	for (var i = 0; i < length; i++) {
		result += stateValues.charAt(Math.floor(Math.random() * stateValues.length));
	}
	return result;
}

function getAccessToken(context, code) {
	console.log("@@@ getAccessToken");
	var options = {
		host: 'api.linkedin.com',
		port: 443,
		path: '/uas/oauth2/accessToken' + 
			'?grant_type=authorization_code' + 
			'&code=' + code + 
			'&redirect_uri=' + callbackURL + 
			'&client_id=' + APIKey + 
			'&client_secret=' + APIKeySecret
	};
	var req = https.request(options, function(res) {
		var access_token;
		res.on('data', function(d) {			
			var access_token = JSON.parse(d).access_token;
			var expires_in = JSON.parse(d).expires_in;
			console.log('@@@RESPUESTA getAccessToken');
			result.cookie = cookieKey + '=' + access_token + '; Expires=' + expires_in;
			getData(context, access_token);
		});
	});
	req.on('error', function(e) {
		console.error("Error obteniendo access token -> " + e);
		authorize(context);
	});
	req.end();
}

function getData(context, access_token) {

		console.log("@@@ getData");

		var options = {
			host: 'api.linkedin.com',
			port: 443,
			path: '/v1/people/~' + 
				'?format=json' +
				'&oauth2_access_token=' + access_token
		};

		var req = https.request(options, function(res) {
			res.on('data', function(d) {
				console.log('@@@ result -> ' + d);
				result.data = JSON.stringify(JSON.parse(d));
				context.succeed(result);
			});
		});

		req.on('error', function(e) {
			console.error("Error obteniendo datos -> " + e);
			authorize(context);
		});
		req.end();
}
