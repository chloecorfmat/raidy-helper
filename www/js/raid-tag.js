/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
	// Application Constructor
	initialize: function () {
		this.bindEvents();
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function () {
		document.addEventListener('deviceready', this.onDeviceReady, false);
		document.addEventListener('offline', this.onOffline, false);
		document.addEventListener('online', this.onOnline, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicitly call 'app.receivedEvent(...);'
	onDeviceReady: function () {
		app.receivedEvent('deviceready');
	},
	onOffline: function () {
		localStorage.setItem('online', false);
	},
	onOnline: function () {
		localStorage.setItem('online', true);
	},
	// Update DOM on a Received Event
	receivedEvent: function (id) {
		var b = check_authentification();
		main();
	}
};
var raidID;
function main() {
	var disconnection = document.getElementById("disconnect");
	disconnection.addEventListener("click", disconnect);

	raidID = setIDintoTabs();
	
	if (localStorage.timings == undefined || localStorage.timings == "") {
		localStorage.timings = "[]";
	}

	// show competitors
	var competitors = localStorage.getItem('competitors-'+raidID);
	if (competitors == null) {
		document.getElementById('connection-error').innerHTML = "Liste des participants indisponible";
	} else {
		var competitors_json = JSON.parse(competitors);
		show_competitors_into_list(competitors_json);
	}

	//refresh if online
	var online = localStorage.getItem('online');
	if (online == 'true' || online == true) {
		var r = function (response, http_code) {
			var response_json = JSON.parse(response);
			if (http_code == 200) {
				localStorage.setItem('competitors-'+raidID, response);
				show_competitors_into_list(response_json)
			}
		};
		apiCall("GET", 'helper/raid/' + raidID + '/competitor', null, r);
	}
	var e = document.getElementById("connection-error");
	nfc.enabled(e.innerHTML="", e.innerHTML="Le NFC doit être activé");

	
	var checkpoint = JSON.parse(localStorage.pois)[raidID];
	var is_checkpoint = JSON.parse(checkpoint)["isCheckpoint"];
    console.log(is_checkpoint);
	if (is_checkpoint=="1") {
		var c = document.getElementsByClassName("checkpoint");
		for (var i=0 ; i<c.length ; i++) {
			c[i].classList.add('checkpoint-visible');
		}
		var checkpoint = JSON.parse(checkpoint)["id"];
		document.getElementById("form_numbersign").addEventListener("submit", function(e) {
			e.preventDefault();
			
			var numberSign = document.getElementById('numbersign').value;
			document.getElementById('numbersign').value="";
			
			if (localStorage.online == "true") {
				var r = function(response, http_code) {
					response = JSON.parse(response);
					if (response.nfc_serial_id!="") {
						if (http_code==200) {
							check_competitor(response.nfc_serial_id, checkpoint, raidID);
						} else {
							saveTiming(numberSign, checkpoint);
						}
					} else {
						showToast("Ce dossard n'a pas de badge associé");
					}
				};
				apiCall("GET",'helper/raid/'+raidID+'/race/competitor/numbersign/'+numberSign,null, r);
			} else {
				saveTiming(numberSign, checkpoint);
			}
			return false;
		});
		
			
		document.getElementById("check-with-nfc").addEventListener("click", scan_badge);

	
	}
	syncTiming();

}


function show_competitors_into_list(response_json) {
	var competitors = document.getElementById("competitors--list");
	competitors.innerHTML = ""; // clear div
	document.getElementById('connection-error').innerHTML = ""

	for (var i = 0; i < response_json.length; i = i + 1) {
		var competitor = response_json[i];

		if (competitor.nfc_serial_id=="") {
			var action = '<button class="associate" data-competitor-number="'+competitor.number_sign+'" data-race-id="'+competitor.race.id+'">Associer</button>';
		} else {
			var action = '<img src="img/icon-check.svg" />'
		}
		var e = document.createElement('div');
		e.innerHTML = '<div class="competitors--list-items">' +
			'<div class="competitor" id="competitor-' + competitor.number_sign+'-'+competitor.race.id + '">' +
			'<div class="competitor--content-container">' +
			'<p class="competitor--title">' + competitor.firstname + " " + competitor.lastname.toUpperCase() + '</p>' +
			'<p class="competitor--name">Epreuve : '+ competitor.race.name +'</p>' +
			'<p class="competitor--name">Dossard : ' + competitor.number_sign  + ', Année : ' + competitor.birthyear  + ', Sexe : '+ competitor.sex +'</p>' +
			'</div>' +
			'<div class="competitor--content-icons">' + action + '</div>' +
			'</div>' +
			'</div>';

		competitors.append(e);
		var online = localStorage.getItem('online');
		
	}
	init_listener_association();

	if (response_json.length == 0) {
		document.getElementById('connection-error').innerHTML = "Aucun participant";
	}
}

function init_listener_association() {
	var buttons = document.getElementsByClassName("associate");
	for (var i = 0; i < buttons.length; i = i + 1) {
		buttons[i].addEventListener("click", associate);
	}
}

function associate() {
	var button = this;
	var competitor = button.getAttribute('data-competitor-number');
	var race = button.getAttribute('data-race-id');

	var active_buttons = document.getElementsByClassName("association-active");
	for (var i = 0; i < active_buttons.length; i = i + 1) {
		abort_association(active_buttons[i]);
	}
	abort_scan_badge();
	button.classList.add("association-active");
	button.innerHTML = "Annuler";
	button.removeEventListener("click", associate);
	button.addEventListener("click", abort_association);
	
	// Read NDEF formatted NFC Tags
    nfc.addNdefListener (
        function (nfcEvent) {
            var tag = nfcEvent.tag,
			ndefMessage = tag.ndefMessage;
			var serialnumber = nfc.bytesToHexString(tag.id);
			document.getElementById("tag-id").innerHTML= serialnumber;
			if (ndefMessage != []) {
				var dossard = nfc.bytesToString(ndefMessage[0].payload).substring(3);
				document.getElementById("tag-msg").innerHTML= dossard;
				showToast("Badge déjà associé au dossard "+dossard);
			} else {
				associate_competitor(serialnumber, competitor, race, raidID)
				
			}
			nfc.removeNdefListener();
        },
        function () { // success callback
            console.log("Waiting for NDEF tag");
        },
        function (error) { // error callback
            console.log("Error adding NDEF listener " + JSON.stringify(error));
        }
    );
}

function abort_association(button) {
	if (this.classList != undefined) {
		button = this;
	}
	nfc.removeNdefListener()
	button.classList.remove("association-active");
	button.innerHTML = "Associer";
	button.removeEventListener("click", abort_association);
	button.addEventListener("click", associate);
}

function abort_scan_badge(button) {
	if (this.classList != undefined) {
		button = this;
	}
	nfc.removeNdefListener()
	button.classList.remove("scan-active");
	button.innerHTML = "Checker un badge";
	button.removeEventListener("click", abort_scan_badge);
	button.addEventListener("click", scan_badge);
}

function scan_badge() {
	var button = this;
	button.classList.add("scan-active");
	button.innerHTML = "Annuler";
	var active_buttons = document.getElementsByClassName("association-active");
	for (var i = 0; i < active_buttons.length; i = i + 1) {
		abort_association(active_buttons[i]);
	}
	button.removeEventListener("click", scan_badge);
	button.addEventListener("click", abort_scan_badge);
	
	nfc.addNdefListener (
		function (nfcEvent) {
			var tag = nfcEvent.tag,
			ndefMessage = tag.ndefMessage;
			var serialnumber = nfc.bytesToHexString(tag.id);
			document.getElementById("tag-id").innerHTML= serialnumber;
			var numberSign = nfc.bytesToString(ndefMessage[0].payload);

			abort_scan_badge(button);	

			if (localStorage.online == "true") {
				check_competitor(serialnumber, checkpoint, raidID);
				syncTiming();
			} else {
				saveTiming(null,checkpoint, serialnumber);
			}
		},
		function () { // success callback
			console.log("Waiting for NDEF tag");
		},
		function (error) { // error callback
			console.log("Error adding NDEF listener " + JSON.stringify(error));
		}
	);
}

function saveTiming(numberSign, checkpoint, nfc=null) {
	var timings = JSON.parse(localStorage.timings);
	var d = new Date().toISOString().slice(0, 19).replace('T', ' ');
	
	if (nfc != null) {
		timings.push('{"nfcid":"'+nfc+'", "time":"'+d+'", "checkpoint_id":"'+checkpoint+'"}');
	} else {
		timings.push('{"numberSign":"'+numberSign+'", "time":"'+d+'", "checkpoint_id":"'+checkpoint+'"}');
	}
	localStorage.timings = JSON.stringify(timings);
}

function syncTiming() {
	// sync timings
	var newTimings = [];
	var timings = JSON.parse(localStorage.timings);
	for (var t = 0 ; t< timings.length ; t++) {
		var timing = JSON.parse(timings[t]);
		if (timing.nfcid == undefined) {

			var r = function(response, http_code) {
				response = JSON.parse(response);
				if (http_code==200) {
					console.log(response);
					console.log(response.nfc_serial_id);
					check_competitor(response.nfc_serial_id, timing.checkpoint_id, raidID);
				} else {
					newTimings.push(timing);
					showToast("Echec de connexion avec le serveur");
				}
			};
			apiCall("GET",'helper/raid/'+raidID+'/race/competitor/numbersign/'+timing.numberSign,null, r);
		} else {
			check_competitor(timing.nfcid, timing.checkpoint_id, raidID);
		}
	}

	localStorage.timings = JSON.stringify(newTimings);
}