var app = {
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener('offline', this.onOffline, false);
        document.addEventListener('online', this.onOnline, false);
    },
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
	onOffline: function() {
		localStorage.setItem('online', false);
	},
	onOnline: function() {
		localStorage.setItem('online', true);
	},
    // Update DOM on a Received Event
    receivedEvent: function(id) {
		var b = check_authentification();

        initForm();
        main();
    }
};

var map;
var mapManager;
var raidID = setIDintoTabs();

function main() {
	var disconnection = document.getElementById("disconnect");
	disconnection.addEventListener("click", disconnect);
	
	var uiManager = new UIManager();
    mapManager = new MapManager(uiManager);
    mapManager.initialize();
	
	var options = {
        frequency: 1000
    };
    var watchID = navigator.compass.watchHeading(function(heading) {
        if(mapManager.currentPositionMarker != undefined){
            mapManager.currentPositionMarker.setRotationAngle(heading.magneticHeading);
        }
    }, null, options);
}

var UID = {
    _current: 0,
    getNew: function() {
        this._current++;
        return this._current;
    }
};

HTMLElement.prototype.pseudoStyle = function(element, prop, value) {
    var _this = this;
    var _sheetId = "pseudoStyles";
    var _head = document.head || document.getElementsByTagName('head')[0];
    var _sheet = document.getElementById(_sheetId) || document.createElement('style');
    _sheet.id = _sheetId;
    var className = "pseudoStyle" + UID.getNew();

    _this.className += " " + className;

    _sheet.innerHTML += " ." + className + ":" + element + "{" + prop + ":" + value + "}";
    _head.appendChild(_sheet);
    return this;
};