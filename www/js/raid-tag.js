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
	show_history_into_list();
	if (localStorage.timings == undefined || localStorage.timings == "") {
		localStorage.timings = "[]";
	}

	
	var e = document.getElementById("nfc-error");
	nfc.enabled(
		function() {e.innerHTML="";},
		function() {e.innerHTML="Le NFC doit être activé";});

	syncTiming();
	var checkpoint = JSON.parse(localStorage.pois)[raidID];
	checkpoint = JSON.parse(checkpoint)["id"];
	
	document.getElementById("form_numbersign").addEventListener("submit", function(e) {
		e.preventDefault();

		var numberSign = document.getElementById('numbersign').value;
		document.getElementById('numbersign').value="";

		if (localStorage.online == "true") {
			var r = function(response, http_code) {
				response = JSON.parse(response);
				if (http_code==200) {
					if (response.nfc_serial_id!="") {
						check_competitor(response.nfc_serial_id, checkpoint, raidID,numberSign);
						syncTiming();
					} else {
						showToast("Le dossard "+numberSign+" n'a pas de badge associé");
						logToHistory("Le dossard "+numberSign+" n'a pas de badge associé")
					}
				} else {
					saveTiming(numberSign, checkpoint);
				}
			};
			apiCall("GET",'helper/raid/'+raidID+'/competitor/numbersign/'+numberSign,null, r);
		} else {
			saveTiming(numberSign, checkpoint);
		}
		return false;
	});

	document.getElementById("check-with-nfc").addEventListener("click", scan_badge);

}


function show_history_into_list() {
	if (localStorage.scanHistory == undefined || localStorage.scanHistory == "") {
        localStorage.scanHistory = "{}";
    } else {
		var sh = JSON.parse(localStorage.scanHistory);
		if (sh[raidID] == undefined || sh[raidID] == "") {
			sh[raidID] = "[]";
		} else {
			var history = document.getElementById("historique");
			history.innerHTML = ""; // clear div

			var logs = JSON.parse(sh[raidID]);
			for (var i = 0; i < logs.length; i = i + 1) {
				var log = logs[i];
				var p = document.createElement('p');
				p.innerHTML = log;
				history.append(p);
			}
		}
	}
}

function abort_scan_badge(button) {
	var active_scans = document.getElementsByClassName("scan-active");
	if (active_scans[0]!==undefined) {
		button = active_scans[0];
		if (this.classList !== undefined) {
			nfc.removeNdefListener();
		}
		
		button.classList.remove("scan-active");
		button.innerHTML = "Activer le scan";
		button.removeEventListener("click", abort_scan_badge);
		button.addEventListener("click", scan_badge);
	}
}

function scan_badge() {
	abort_scan_badge();
	var button = this;
	button.classList.add("scan-active");
	button.innerHTML = "Annuler le scan";

	nfc.removeNdefListener();
	
	button.removeEventListener("click", scan_badge);
	button.addEventListener("click", abort_scan_badge);
	
	var checkpoint = JSON.parse(localStorage.pois)[raidID];
	checkpoint = JSON.parse(checkpoint)["id"];
	
	function scan_listener(nfcEvent) {
		var tag = nfcEvent.tag;
		var serialnumber = nfc.bytesToHexString(tag.id);

		if (tag.ndefMessage != undefined && tag.ndefMessage[0] != undefined && tag.ndefMessage[0] != "" && tag.ndefMessage[0].payload != "") {
			if (localStorage.online == "true") {
				check_competitor(serialnumber, checkpoint, raidID, nfc.bytesToString(tag.ndefMessage[0].payload).substr(3));
				syncTiming();
			} else {
				saveTiming(nfc.bytesToString(tag.ndefMessage[0].payload).substr(3),checkpoint, serialnumber);
			}

		} else {
			if (localStorage.online == "true") {
				var r = function (response, http_code) {
					if (http_code == 200) {
						var response_json = JSON.parse(response);
						var message = [
							ndef.textRecord(response_json.number_sign)
						];
						nfc.write(message);
						check_competitor(response_json.nfc_serial_id, checkpoint, raidID, response_json.number_sign);
					} else {
						if (http_code == 404) {

							showToast("Ce badge n'est associé à aucun participant");
							logToHistory("Ce badge n'est associé à aucun participant");

						} else {
							showToast("Echec de connexion avec le serveur");
						}
					}
				};
				apiCall("GET", 'helper/raid/' + raidID + '/competitor/nfcserialid/'+serialnumber, null, r);
			} else {
				saveTiming("",checkpoint, serialnumber);
			}
		}
	}
	
	nfc.addNdefListener (
		function (nfcEvent) {
			scan_listener(nfcEvent)
		},
		function () { // success callback
			console.log("Waiting for NDEF tag in scan");
		},
		function (error) { // error callback
			console.log("Error adding NDEF listener " + JSON.stringify(error));
		}
	);
	
}

function saveTiming(numberSign, checkpoint, nfc=null) {
	logToHistory("Passage de dossard "+numberSign+" sauvegardé, une connexion internet est requise");
	var timings = JSON.parse(localStorage.timings);
	var d = generateDateNow();
	
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
					check_competitor(response.nfc_serial_id, timing.checkpoint_id, raidID);
				} else {
					newTimings.push(timing);
				}
			};
			apiCall("GET",'helper/raid/'+raidID+'/race/competitor/numbersign/'+timing.numberSign,null, r);
		} else {
			check_competitor(timing.nfcid, timing.checkpoint_id, raidID);
		}
	}
	if (timings.length>0 && newTimings.length==0) {
		logToHistory("Les passages sauvegardés ont été synchronisés avec le serveur");
	}
	localStorage.timings = JSON.stringify(newTimings);
}