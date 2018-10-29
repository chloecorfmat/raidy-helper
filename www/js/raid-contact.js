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
		console.log("Device is ready");
		console.log("Raids");
		var b = check_authentification();
		main();
	}
};

function main() {
	var disconnection = document.getElementById("disconnect");
	disconnection.addEventListener("click", disconnect);

	
	raidID = 11;
	
	cont = [
		{
			"title": "Respo sec",
			"phone": "0632453426",
			"name": "Alicia Rannou"
		},
		{
			"title": "Machin",
			"phone": "0632453426",
			"name": "Alicia Rannou"
		},
		{
			"title": "Chef buvette",
			"phone": "0632453426",
			"name": "Alicia Rannou"
		}];
	cont = JSON.stringify(cont);
	localStorage.setItem('contacts', cont);

	// show contacts
	var contacts = localStorage.getItem('contacts');
	if (contacts == null) {
		document.getElementById('connection-error').innerHTML = "Liste des contacts indisponible sans internet";
	} else {
		var contacts_json = JSON.parse(contacts);
		show_contacts_into_list(contacts_json);
	}

	//refresh if online
	var online = localStorage.getItem('online');
	console.log(online);
	if (online == 'true' || online == true) {
		var r = function (response, http_code) {
			var response_json = JSON.parse(response);
			if (http_code == 200) {
				localStorage.setItem('contacts', response);

				show_contacts_into_list(response_json)

			} else {
				console.log(response.code);
			}
		};
		apiCall("GET", 'helper/raid/' + raidID + '/contact', null, r);
	}
}


function show_contacts_into_list(response_json) {
	var contacts = document.getElementById("contacts--list");
	contacts.innerHTML = "<h1>Contacts</h1>"; // clear div

	for (var i = 0; i < response_json.length; i = i + 1) {
		var contact = response_json[i];
		console.log(contact);

		var e = document.createElement('div');
		e.innerHTML = '<div class="contacts--list-items">' +
			'<div class="contact" id="contact-' + contact.id + '">' +
			'<div class="contact--content-container">' +
			'<p class="contact--title">' + contact.title + '</p>' +
			'<p class="contact--name">' + contact.name + '</p>' +
			'</div>' +
			'<div class="contact--content-icons">' +
			'<a href="tel:' + contact.phone + '"><img src="img/icon-phone.svg" /></a>' +
			'<a href="sms:' + contact.phone + '"><img src="img/icon-message.svg" /></a>' +
			'</div>' +
			'</div>' +
			'</div>';

		contacts.append(e);
		var online = localStorage.getItem('online');
		if (online == 'true' || online == true) {
			document.getElementById('contact-' + contact.id).style.backgroundImage = 'url("' + contact.picture + '")';
		}
	}
}
