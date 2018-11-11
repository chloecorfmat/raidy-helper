

function apiCall(method, url, jsonData=null, callback=null) {
	if (callback==null) {
		callback=function(a) {return true;}
	}
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
         if (this.readyState == 4) {
			 callback(this.responseText, this.status);
         }
    };
    xhttp.open(method, api_path+'api/'+url, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.setRequestHeader("Access-Control-Allow-Origin", api_path);
	if (localStorage.getItem('token')!=null) {
    	xhttp.setRequestHeader("X-Auth-Token", localStorage.getItem('token'));
	}
    if (jsonData!=null) {
		xhttp.send(JSON.stringify(jsonData));
	} else {
		xhttp.send();
	}
}

function check_authentification() {
	var status = localStorage.getItem('isAuthenticated');
	if (status!="true") {
		window.location.replace("connection.html");
		return false;
	} else {
		return true;
	}
}

function disconnect() {
	localStorage.setItem('isAuthenticated', 'false');
	var token = localStorage.getItem('token');

	apiCall('DELETE', 'auth-tokens', {token: token});
	localStorage.removeItem('token');
	localStorage.removeItem('name');
	window.location.replace("connection.html");
}

function getURLParameter(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
}

function setIDintoTabs() {
	var id = getURLParameter("id");
	
	var links = document.querySelectorAll(".nav--tab a");
	for(let i=0; i<links.length; i++) {
		links[i].setAttribute("href", links[i].getAttribute("href")+"?id="+id);
	}
	return id;
}

function showBottom(message) {
	console.log("###################");
	console.log(message);
	console.log("###################");
	toast.showWithOptions(
    {
      message: message,
      duration: "short", // which is 2000 ms. "long" is 4000. Or specify the nr of ms yourself.
      position: "bottom",
      addPixelsY: -40  // added a negative value to move it up a bit (default 0)
    }
//    onSuccess, // optional
//    onError    // optional
  );
}

var checkin = function() {
  var online = localStorage.getItem('online');
	if (online == 'true' || online == "true") {
		var r = function(response, http_code) {
			var response_json = JSON.parse(response);
			if (http_code==200) {
				document.getElementById('checkInButton').classList.add('checkin--validated');
				document.getElementById('checkInButton').innerHTML = 'Position validée';
				document.getElementById('checkInButton').removeEventListener("click", checkin);
				var checkins = JSON.parse(localStorage.checkins);
				checkins[raidID] = true;
				localStorage.checkins = JSON.stringify(checkins);
				console.log(response.code);
			} else {
				showBottom("Aucune connexion");
				console.log(response.code);
			}
		};
		apiCall("GET",'helper/raid/'+raidID+'/check-in',null, r);
	} else {
		showBottom("Aucune connexion");
		document.getElementById('checkInButton').classList.add('checkin--validated');
				document.getElementById('checkInButton').innerHTML = 'Position validée';
				document.getElementById('checkInButton').removeEventListener("click", checkin);
				var checkins = JSON.parse(localStorage.checkins);
				checkins[raidID] = true;
				localStorage.checkins = JSON.stringify(checkins);
	}
}