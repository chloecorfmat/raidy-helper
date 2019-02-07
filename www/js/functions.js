

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
				if (response_json.message=="You can not check in for this raid today") {
					showToast("Ce raid n'a pas lieu aujourd'hui")
				}
				if (response_json.message=="You have already checked in for this raid") {
					showToast("Vous avez déjà validé votre position")
				}
				if (response_json.message=="Out of zone") {
					showToast("Vous n'êtes pas à proximité du poste")
				}
			} else {
				showToast("Échec de la validation");
			}
		};
		
		var data = {lat: mapManager.currentPosition.lat, lng: mapManager.currentPosition.lng};
		
		apiCall("PUT",'helper/raid/'+raidID+'/check-in',data, r);
	} else {
		showToast("Aucune connexion");
	}
}


function associate_competitor(message, competitor, race, raid) {
	var data = {NFCSerialId:message};

	var r = function(response, http_code) {
		response = JSON.parse(response);
		if (http_code==200) {
			
			var message = [
				ndef.textRecord(competitor)
			];
			
			nfc.write(message,
				function() {
					
					var icon_container = document.querySelector('#competitor-' + competitor+'-'+race+' .competitor--content-icons');
					var active_button = document.getElementsByClassName("association-active")[0];
					icon_container.removeChild(active_button);
					icon_container.innerHTML = '<img src="img/icon-check.svg" />';
				},
				function(error) {
					showToast("Echec d'écriture sur la puce");
				}
			);
		} else {
			showToast("Echec de connexion avec le serveur "+http_code+" : "+response.message);
		}
	};
	apiCall("PATCH",'helper/raid/'+raid+'/race/'+race+'/competitor/'+competitor,data, r);
}

function check_competitor(nfcid,checkpoint, raid, numberSign=null) {
	var d = generateDateNow();
	var data = {"NFCSerialId":nfcid, "time":d, "poi_id":checkpoint};
	var r = function(response, http_code) {
		response = JSON.parse(response);
		if (http_code==200) {
			if (numberSign!=null) {
				showToast("Passage de dossard "+numberSign+" enregistré avec succès");
				logToHistory("Passage de dossard "+numberSign+" enregistré avec succès");
			}
			
		} else if (http_code==400 && response.message=="No checkpoint for this poi and this competitor") {
			showToast("Checkpoint déjà validé pour ce participant");
			logToHistory("Checkpoint déjà validé pour ce participant")

		} else if (http_code==404 && response.message=="Ce competitor n'existe pas") {
			showToast("Ce badge n'est associé à aucun participant");
			nfc.write("");
		} else if (http_code==400 && response.message=="La course n'est pas en cours") {
			showToast("La course n'est pas en cours");
			logToHistory("La course n'est pas en cours");
		} else {
			showToast("Echec de connexion avec le serveur");
			
		}
	};
	apiCall("PUT",'helper/raid/'+raid+'/racetiming',data, r);
}

function generateDateNow() {
	return convertUTCDateToLocalDate(new Date()).toISOString().slice(0, 19).replace('T', ' ')
}
function convertUTCDateToLocalDate(date) {
	var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

	var offset = date.getTimezoneOffset() / 60;
	var hours = date.getHours();

	newDate.setHours(hours - offset);

	return newDate;
}


function logToHistory(msg) {
	if (localStorage.scanHistory == undefined || localStorage.scanHistory == "") {
        localStorage.scanHistory = "{}";
    }
	var scanHistory = JSON.parse(localStorage.scanHistory);
	if (scanHistory[raidID] == undefined || scanHistory[raidID] == "") {
        scanHistory[raidID] = "[]";
    }
	
	var h = document.getElementById("historique");
	var p = document.createElement('p');
	var d = (new Date);
	d = format_two_digits(d.getHours()) + ":" + format_two_digits(d.getMinutes());
	var text = "<strong>"+d+"</strong> "+msg;
	p.innerHTML = text;
	h.insertBefore(p, h.firstChild);

	function format_two_digits(n) {
		return n < 10 ? '0' + n : n;
	}
	var sh = JSON.parse(scanHistory[raidID]);
	sh.unshift(text);
	scanHistory[raidID] = JSON.stringify(sh);
	localStorage.scanHistory = JSON.stringify(scanHistory);
}