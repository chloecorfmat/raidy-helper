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
	button.classList.add("association-active");
	button.innerHTML = "Annuler";
	button.removeEventListener("click", associate);
	button.addEventListener("click", abort_association);
	
//	associate_competitor("test", competitor, race, raidID);
	
	// Read NDEF formatted NFC Tags
    nfc.addNdefListener (
        function (nfcEvent) {
            var tag = nfcEvent.tag,
                ndefMessage = tag.ndefMessage;

            // dump the raw json of the message
            // note: real code will need to decode
            // the payload from each record
            console.log(JSON.stringify(ndefMessage));
			associate_competitor(JSON.stringify(ndefMessage), competitor, race, raidID)

            // assuming the first record in the message has
            // a payload that can be converted to a string.
            console.log(nfc.bytesToString(ndefMessage[0].payload).substring(3));
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