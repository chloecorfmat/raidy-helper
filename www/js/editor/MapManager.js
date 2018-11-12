/*
 * Map editor mode :
 * 0 = reading
 * 1 = add poi
 */

var EditorMode = Object.freeze({
    "READING": 0,
    "ADD_POI": 1,
    "FOLLOW_POSITION": 2,
    "POI_EDIT": 3,
    properties: {
        0: {
            name: "READING",
            value: 0
        },
        1: {
            name: "ADD_POI",
            value: 1
        },
        2: {
            name: "FOLLOW_POSITION",
            value: 1
        },
        3: {
            name: "POI_EDIT",
            value: 3
        }

    }
});

var MapManager = function(uimanager) {

    this.map = L.map('editorMap', {
        editable: true
    }).setView([48.742917, -3.459180], 15);

    this.UIManager = uimanager;

    this.group = new L.featureGroup();
    this.group.addTo(this.map);

    this.waitingPoi = null;
    this.poiTypesMap = new Map();
    this.tracksMap = new Map();
    this.poiMap = new Map();

    if (localStorage.tracks == undefined || localStorage.tracks == "") {
        localStorage.tracks = "{}";
    }

    if (localStorage.pois == undefined || localStorage.pois == "") {
        localStorage.pois = "{}";
    }

    if (localStorage.poiTypes == undefined || localStorage.poiTypes == "") {
        localStorage.poiTypes = "{}";
    }
	
	if (localStorage.checkins == undefined || localStorage.checkins == "") {
        localStorage.checkins = "{}";
    }

    this.currentPositionMarker;
    this.recordTrack = false;
    this.recordedTrack = null;
    this.recorder = null;
    this.intervalRecord = 5000;
    this.newPoiPosition = null;

    this.currentPosition = null;
//    this.currentPosition = new L.LatLng(48.743,-3.40);;
//    this.currentPosition = new L.LatLng(48.740707649141,-3.4593216011262); // exact
    this.currentPosition = new L.LatLng(48.729044145254,-3.4635955095291); // exact
//    this.currentPosition = new L.LatLng(48.727927744892,-3.4603740193799); // 10m

    this.waypoints = [];

    this.distance = 0;

    this.mode = EditorMode.READING;

    var keepThis = this;

    var baseLayer = L.tileLayer.offline('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
        subdomains: 'abc',
        minZoom: 5,
        maxZoom: 19,
    }).addTo(this.map);

    var progress;
    var tilesToSave = 0;

    baseLayer.on('savestart', function(e) {
        progress = 0;
        tilesToSave = e._tilesforSave.length;
        console.log("Start downloading " + e._tilesforSave.length + " tiles");
    });

    baseLayer.on('savetileend', function(e) {
        progress++;
        var val = Math.round((progress * 100) / tilesToSave);
        var message = "Début du téléchargement de la carte";

        if (val > 1) {
            message = "Téléchargement de la carte - " + val + "%";
        }

        keepThis.UIManager.setMapDownloadStatus(message);
        console.log(progress + " tiles downloaded");
    });

    baseLayer.on('loadend', function(e) {
        keepThis.UIManager.setMapDownloadStatus("Téléchargement de la carte terminé");
        keepThis.UIManager.enableMapDownloadBarHide();
    });

    var BackToLocationCtrl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function(map) {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.backgroundImage = "url('img/icon-center-position.svg')";
            container.onclick = function() {
                keepThis.backToLocation();
            }
            return container;
        },
    });

    this.map.addControl(new BackToLocationCtrl());

    this.saveTilesControl = L.control.savetiles(baseLayer, {
        'zoomlevels': [16],
        'position': 'topright',
        'confirm': function(layer, succescallback) {
            console.log("download " + layer._tilesforSave.length + " tiles");
            keepThis.UIManager.displayMapDownloadBar();
            succescallback();
        },
        'saveText': '<i class="fa fa-download" aria-hidden="true" title="Save tiles"></i>',
    });
    this.saveTilesControl.addTo(this.map);

    //Hack to not allow user to remove cached map
    var btn = document.querySelector('.rmtiles');
    btn.parentNode.removeChild(btn);
};

MapManager.prototype.initialize = function() {
    /* MAP LISTENERS */
    var keepThis = this;

    this.map.addEventListener('click', function(e) {
        // console.log("Mode : "+EditorMode.properties[keepThis.mode].name);
        switch (keepThis.mode) {
            case EditorMode.READING:
                break;
            case EditorMode.ADD_POI:
                MicroModal.show('add-poi-popin');
                keepThis.waitingPoi = new Poi(keepThis.map);
                keepThis.waitingPoi.marker.setLatLng(e.latlng);

                break;
            case EditorMode.TRACK_EDIT:
                break;
            case EditorMode.POI_EDIT:
                break;
            default:
                // console.log("Something goes wrong with the map editor mode. " + this.mode);
        }
    });

    this.map.addEventListener('drag', function() {
        keepThis.switchMode(EditorMode.READING);
    });

    this.loadRessources()
        .then(function(res){
            return keepThis.loadTracks();
        })
        .then(function(res){
            return keepThis.loadPois();
        });
    this.startFollowLocation(); //Start geolocation follow

}

MapManager.prototype.startFollowLocation = function() {
    var keepThis = this;
    var positionWatchId = navigator.geolocation.watchPosition(
        function(e) {
            var latLng = new L.LatLng(e.coords.latitude, e.coords.longitude);
            keepThis.currentPosition = latLng;
            if (keepThis.mode == EditorMode.FOLLOW_POSITION) {
                mapManager.updateCurrentPosition(latLng);
            }
        }, null, {
            'enableHighAccuracy': true,
            'maximumAge': 0
        });
    mapManager.switchMode(EditorMode.FOLLOW_POSITION);
}

MapManager.prototype.backToLocation = function() {
    mapManager.switchMode(EditorMode.FOLLOW_POSITION);

    if (mapManager.currentPosition != null) {
        mapManager.updateCurrentPosition(mapManager.currentPosition);
    }
}

MapManager.prototype.recordLocation = function() {
    if (mapManager.currentPosition != null) {
        this.recordedTrack.line.addLatLng(this.currentPosition);
        this.recordedTrack.calculDistance();
        localStorage.recordedTrack = this.recordedTrack.toJSON();
        this.UIManager.updateRecordedDistance(this.recordedTrack.distance);
    }
}

MapManager.prototype.loadRessources = function() {
    var keepThis = this;
    return new Promise(function(resolve, reject) {
        if (localStorage.online == "true") {
            console.log("Load poiTypes from server");
            apiCall('GET', "helper/raid/"+ raidID + "/poitype", null, function(responseText, status) {
                if (status === 200) {
                    localPoiTypes = JSON.parse(localStorage.poiTypes);
                    localPoiTypes[raidID] = responseText;

                    localStorage.poiTypes = JSON.stringify(localPoiTypes);
                    var poiTypes = JSON.parse(responseText);
                    for (poiType of poiTypes) {
                        keepThis.poiTypesMap.set(poiType.id, poiType);
                    }
                    resolve();
                } else {
                    reject();
                }
            });
        } else {
			var allPoiTypes = JSON.parse(localStorage.poiTypes)[raidID];
			var poiTypes = JSON.parse(allPoiTypes);
			for (poiType of poiTypes) {
				keepThis.poiTypesMap.set(poiType.id, poiType);
			}
            resolve();
        }
    });
}

MapManager.prototype.switchMode = function(mode) {
    if (this.mode != mode) this.lastMode = this.mode;
    this.mode = mode;
}

MapManager.prototype.addTrack = function(track) {
    newTrack = new Track(this.map);
    newTrack.fromObj(track);
    this.tracksMap.set(track.id, newTrack);
}

MapManager.prototype.loadTracks = function() {
    return new Promise(function(resolve, reject){
        if (localStorage.online == "true") {
            console.log("Load tracks from server");
            apiCall('GET', "helper/raid/" + raidID + "/track", null, function(responseText, status) {
                if (status === 200) {
                    var tracks = JSON.parse(responseText);

                    var localTracks = JSON.parse(localStorage.tracks);
                    localTracks[raidID] = responseText;
                    localStorage.tracks = JSON.stringify(localTracks);
                    
					var emptyTracks = 0;
                    for (track of tracks) {
                        mapManager.addTrack(track);
                        if (track.trackpoints == "[]") {
							emptyTracks+=1;
						}
                    }
                    if (tracks.length > 0 && tracks.length > emptyTracks) {
                        mapManager.map.fitBounds(mapManager.group.getBounds());
                        mapManager.saveTilesControl.setBounds(mapManager.group.getBounds());
                    }
                    resolve();
                } else {
                    reject();
                }
            });
        } else {
            console.log("load tracks from localStorage");
            var allTracks = JSON.parse(localStorage.tracks)[raidID];

            if (allTracks == undefined) {
                console.error('This raid is not saved on localStorage');
                reject();
            }

            var tracks = JSON.parse(allTracks);
			var emptyTracks = 0;
            for (track of tracks) {
                mapManager.addTrack(track);
				if (track.trackpoints == "[]") {
					emptyTracks+=1;
				}
            }
            if (tracks.length > 0 && emptyTracks!=tracks.length) {
                mapManager.map.fitBounds(mapManager.group.getBounds());
                mapManager.saveTilesControl.setBounds(mapManager.group.getBounds());
            }
        }
        mapManager.switchMode(EditorMode.FOLLOW_POSITION);
        resolve();
    });
}

MapManager.prototype.loadPois = function() {

	return new Promise(function(resolve, reject) {
		if (localStorage.online == "true") {
		    console.log("Load Pois from server");
		    apiCall('GET', "helper/raid/" + raidID + "/poi", null, function(responseText, status) {
		        if (status === 200) {
		            var poi = JSON.parse(responseText);

		            var localPois = JSON.parse(localStorage.pois);
		            localPois[raidID] = responseText;
		            localStorage.pois = JSON.stringify(localPois);

					mapManager.addPoi(poi);
                    if (poi.length > 0) {
                        mapManager.map.fitBounds(mapManager.group.getBounds());
                        mapManager.UIManager.showCheckInBox();
                    }
                    resolve();
                } else if (status === 404) {
					// no attributed poi
					mapManager.UIManager.hideCheckInBox();
				} else {
                    reject();
                }

		    });
		} else {
		    console.log("Load Pois from local");

		    var allPois = JSON.parse(localStorage.pois)[raidID];
		    if (allPois == undefined) {
		        console.error('This raid is not saved on localStorage');
		        return;
		    }

		    var poi = JSON.parse(allPois);
			mapManager.addPoi(poi);

            if (pois.length > 0) {
                mapManager.map.fitBounds(mapManager.group.getBounds());
                mapManager.UIManager.showCheckInBox();
            }

            resolve();
        }
    });
    mapManager.switchMode(EditorMode.FOLLOW_POSITION);
}

MapManager.prototype.saveTracksLocal = function() {
    var tracks = "[";
    for (var track of this.tracksMap) {
        tracks += track[1].toJSON() + ",";
    }
    var tracks = tracks.substring(0, tracks.length - 1);
    tracks += "]";

    var localTracks = JSON.parse(localStorage.tracks);
    localTracks[raidID] = tracks;
    localStorage.tracks = JSON.stringify(localTracks);
}

MapManager.prototype.savePoisLocal = function() {
    var pois = "[";
    for (var poi of this.poiMap) {
        pois += poi[1].toJSON() + ",";
    }
    var pois = pois.substring(0, pois.length - 1);
    pois += "]";

    var localPois = JSON.parse(localStorage.pois);
    localPois[raidID] = pois;
    localStorage.pois = JSON.stringify(localPois);
}

MapManager.prototype.addPoi = function(poi) {
    newPoi = new Poi(this.map);
    newPoi.fromObj(poi);
    //newPoi.name = htmlentities.decode(newPoi.name);
//    this.poiMap.set(poi.id, newPoi);
    this.poiMap.set(0, newPoi);
	// only one POI -> my assigned poi

	document.getElementById("myPoiName").innerHTML = poi.name;
	document.getElementById("mapLink").setAttribute("href","http://maps.apple.com/maps?q="+poi.latitude+","+poi.longitude);
	
	this.UIManager.updatePoiDistance(this.getDistanceToPoi());
}

MapManager.prototype.updateCurrentPosition = function(latLng) {

    this.map.setView(latLng, 20);
    if (this.currentPositionMarker == null) {

        var icon = L.icon({
            iconUrl: 'img/current-position-marker.png',
            iconSize: [50, 50], // size of the icon
            iconAnchor: [25, 25], // point of the icon which will correspond to marker's location
            popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
        });


        this.currentPositionMarker = L.marker(latLng, {
            icon: icon
        }).addTo(this.map);
    } else {
        this.currentPositionMarker.setLatLng(latLng);
    }
	this.UIManager.updatePoiDistance(this.getDistanceToPoi());
}

MapManager.prototype.getDistanceToPoi = function() {
	var checkins = {};
	if (localStorage.checkins!=undefined) {
		checkins = JSON.parse(localStorage.checkins);
	}
	if (this.poiMap.get(0) != undefined && this.currentPosition!=null) {
		var d = Math.round(this.poiMap.get(0).marker.getLatLng().distanceTo(this.currentPosition));
		if (checkins[raidID] == true) {
			this.UIManager.displayCheckInPoi();
		} else if (d<=10) {
			this.UIManager.displayCheckinInZone();
		} else {
			this.UIManager.displayCheckinOutZone();
		}
		return d;
	} else {
		console.log('No position detected');
		return null;
	}
}

