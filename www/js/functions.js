

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

function showToast(message) {
	// one toast at a time
	if (document.getElementsByClassName('toast--container').length == 0) {
		var body = document.getElementsByTagName("body");
		var e = document.createElement('div');
		e.classList.add('toast--container')
		e.innerHTML = '<p class="toast--message">'+message+'</p>';
		body[0].append(e);

		// self destruct
		setTimeout(function() {
			e.classList.add('toast--disapear');
		}, 2000);
		setTimeout(function() {
			body[0].removeChild(e);
		}, 3500);
	}
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
			} else if (http_code==400) {
				console.log(response.message);
				if (response.message=="You can not check in for this raid today") {
					showToast("Ce raid n'a pas lieu aujourd'hui")
				}
			} else {
				showToast("Échec de la validation");
			}
		};
		apiCall("PUT",'helper/raid/'+raidID+'/check-in',null, r);
	} else {
		showToast("Aucune connexion");
	}
}