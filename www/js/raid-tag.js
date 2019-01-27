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

function main() {
	var disconnection = document.getElementById("disconnect");
	disconnection.addEventListener("click", disconnect);

	var raidID = setIDintoTabs();

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

		
		var name = competitor.firstname.charAt(0).toUpperCase() + " " + competitor.lastname.toUpperCase();


		var e = document.createElement('div');
		e.innerHTML = '<div class="competitors--list-items">' +
			'<div class="competitor" id="competitor-' + competitor.id + '">' +
			'<div class="competitor--content-container">' +
			'<p class="competitor--title">' + competitor.numberSign + '</p>' +
			'<p class="competitor--name">' + name + '</p>' +
			'</div>' +
			'</div>' +
			'</div>';

		competitors.append(e);
		var online = localStorage.getItem('online');
	}

	if (response_json.length == 0) {
		document.getElementById('connection-error').innerHTML = "Aucun participant";
	}
}
