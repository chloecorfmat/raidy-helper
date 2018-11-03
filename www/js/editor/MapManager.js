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
            value: 2
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
        localStorage.poiTypes = "[]";
    }

    this.currentPositionMarker;
    this.recordTrack = false;
    this.recordedTrack = null;
    this.recorder = null;
    this.intervalRecord = 5000;
    this.newPoiPosition = null;

    this.waypoints = [];

    this.distance = 0;

    this.mode = EditorMode.READING;

    var keepThis = this;

    var baseLayer = L.tileLayer.offline('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data {attribution.OpenStreetMap}',
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
        'zoomlevels': [19],
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

                if (editor.activeTab = "pois-pan") {
                    keepThis.switchMode(EditorMode.POI_EDIT);
                } else {
                    keepThis.switchMode(EditorMode.READING);
                }

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
        .then(this.loadTracks())
        .then(this.loadPois());

    this.startFollowLocation(); //Start geolocation follow
}


MapManager.prototype.startFollowLocation = function() {
    var keepThis = this;
    var positionWatchId = navigator.geolocation.watchPosition(
        function(e) {
            let latLng = new L.LatLng(e.coords.latitude, e.coords.longitude);
            if (keepThis.mode == EditorMode.FOLLOW_POSITION) {
                mapManager.updateCurrentPosition(latLng);
            }
        }, null, {
            'enableHighAccuracy': true
        });
    mapManager.switchMode(EditorMode.FOLLOW_POSITION);
}

MapManager.prototype.backToLocation = function() {

    console.log("backToLocation");
    mapManager.switchMode(EditorMode.FOLLOW_POSITION);
    navigator.geolocation.getCurrentPosition(
        function(e) {
            let latLng = new L.LatLng(e.coords.latitude, e.coords.longitude);
            console.log(latLng);
            mapManager.updateCurrentPosition(latLng);
        }, null, {
            'enableHighAccuracy': true
        });
}

MapManager.prototype.recordLocation = function() {
    var keepThis = this;
    navigator.geolocation.getCurrentPosition(
        function(e) {
            let latLng = new L.LatLng(e.coords.latitude, e.coords.longitude);
            keepThis.recordedTrack.line.addLatLng(latLng);
            keepThis.recordedTrack.calculDistance();

            localStorage.recordedTrack = keepThis.recordedTrack.toJSON();
            keepThis.UIManager.updateRecordedDistance(keepThis.recordedTrack.distance);
        }, null, {
            'enableHighAccuracy': true
        });
}

MapManager.prototype.loadRessources = function() {
    var keepThis = this;
    return new Promise(function(resolve, reject){
        if(localStorage.online == "true"){
            console.log("Load poiTypes from server");
            apiCall('GET', "organizer/poitype", null, function(responseText, status) {
                if (status === 200) {
                    localStorage.poiTypes = responseText;
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
            console.log("Load poiTypes from local");
            var poiTypes = JSON.parse(localStorage.poiTypes);
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
    // console.log("Switch mode to : "+EditorMode.properties[mode].name);
    switch (mode) {
        case EditorMode.READING:
            this.setPoiEditable(false);
            break;
    }
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
            apiCall('GET', "organizer/raid/" + raidID + "/track", null, function(responseText, status) {
                if (status === 200) {
                    var tracks = JSON.parse(responseText);

                    var localTracks = JSON.parse(localStorage.tracks);
                    localTracks[raidID] = responseText;
                    localStorage.tracks = JSON.stringify(localTracks);

                    for (track of tracks) {
                        mapManager.addTrack(track);
                    }

                    if (tracks.length > 0) {
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

            for (track of tracks) {
                mapManager.addTrack(track);
            }

            if (tracks.length > 0) {
                mapManager.map.fitBounds(mapManager.group.getBounds());
                mapManager.saveTilesControl.setBounds(mapManager.group.getBounds());
            }
        }
        mapManager.switchMode(EditorMode.FOLLOW_POSITION);
        resolve();
    });
}

MapManager.prototype.loadPois = function() {
    if (localStorage.online == "true") {
        console.log("Load Pois from server");
        apiCall('GET', "organizer/raid/" + raidID + "/poi", null, function(responseText, status) {
            if (status === 200) {
                // console.log("Réponse reçue: %s", xhr_object.responseText);
                var pois = JSON.parse(responseText);

                var localPois = JSON.parse(localStorage.pois);
                localPois[raidID] = responseText;
                localStorage.pois = JSON.stringify(localPois);

                for (poi of pois) {
                    mapManager.addPoi(poi);
                }
                if (pois.length > 0) {
                    mapManager.map.fitBounds(mapManager.group.getBounds());
                }
            } else {
                // console.log("Status de la réponse: %d (%s)", xhr_object.status, xhr_object.statusText);
            }

        });
    } else {
        console.log("Load Pois from local");

        var allPois = JSON.parse(localStorage.pois)[raidID];

        if (allPois == undefined) {
            console.error('This raid is not saved on localStorage');
            return;
        }

        var pois = JSON.parse(allPois);

        for (poi of pois) {
            mapManager.addPoi(poi);
        }
        if (pois.length > 0) {
            mapManager.map.fitBounds(mapManager.group.getBounds());
        }
    }

    mapManager.switchMode(EditorMode.FOLLOW_POSITION);
}

MapManager.prototype.saveTracksLocal = function(){
    var tracks = "[";
    for(var track of this.tracksMap){
        tracks += track[1].toJSON()+",";
    }
    var tracks = tracks.substring(0, tracks.length-1);
    tracks += "]";

    var localTracks = JSON.parse(localStorage.tracks);
    localTracks[raidID] = tracks;
    localStorage.tracks = JSON.stringify(localTracks);
}

MapManager.prototype.savePoisLocal = function(){
    var pois = "[";
    for(var poi of this.poiMap){
        pois += poi[1].toJSON()+",";
    }
    var pois = pois.substring(0, pois.length-1);
    pois += "]";

    var localPois = JSON.parse(localStorage.pois);
    localPois[raidID] = pois;
    localStorage.pois = JSON.stringify(localPois);
}

MapManager.prototype.addPoi = function(poi) {
    newPoi = new Poi(this.map);
    newPoi.fromObj(poi);
    this.poiMap.set(poi.id, newPoi);
}

MapManager.prototype.setPoiEditable = function(b) {
    this.poiMap.forEach(function(value, key, map) {
        value.setEditable(b);
    })
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
}
