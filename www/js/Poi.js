var Poi = function (map) {
    this.map = map;
    this.marker = L.marker([0, 0]);
    this.id = "";
    this.name = "";
    this.poiType = null;
    this.requiredHelpers = 0;

    this.color = "#000000";

}

Poi.prototype.toJSON = function(){
    var poi =
        {
            id : this.id !=null ? this.id : null,
            name : this.name,
            latitude : this.marker.getLatLng().lat,
            longitude : this.marker.getLatLng().lng,
            requiredHelpers : this.requiredHelpers,
            poiType: this.poiType.id
        }
    var json = JSON.stringify(poi);
    //console.log(this.requiredHelpers);
   // console.log(this.requiredHelpers);
    return json;
}
Poi.prototype.fromObj = function(poi) {
    var keepThis = this;

    this.id = poi.id;
    this.name = poi.name;
    this.poiType = mapManager.poiTypesMap.get(poi.poiType);
    this.color = this.poiType.color;
    this.requiredHelpers = poi.requiredHelpers;

    this.marker = L.marker([poi.latitude, poi.longitude]);

    this.marker.addTo(mapManager.group);

    this.marker.disableEdit();

    this.buildUI();

}
Poi.prototype.fromJSON = function(json){
    var poi = JSON.parse(json);
    this.fromObj(poi);
}

Poi.prototype.buildUI= function (){
    var keepThis = this;
    this.color  =this.poiType.color;
    const markerHtmlStyles = `
  background-color: ` + this.color + `;
  width: 2rem;
  height: 2rem;
  display: block;

  position: relative;
  border-radius: 3rem 3rem 0;
  transform: translateX(-1rem) translateY(-2rem) rotate(45deg);`;

    this.marker.bindPopup('' +
        '<header style="' +
        'background: ' + this.color + ' ;' +
        'color: #ffffff ;' +
        'padding: 0rem 3rem;">' +
        '<h3>' + this.name + '</h3>' +
        '</header>' +
        '<div> ' +
        '<h4>Bénévoles</h4>' +
        '<p>' + this.requiredHelpers + ' Requis </p>' +
        '</div>');
   var icon = L.divIcon({
        className: "my-custom-pin",
        iconAnchor: [0, 5],
        labelAnchor: [0, 0],
        popupAnchor: [0, -35],
        html: `<span style="${markerHtmlStyles}" />`
    });
    this.marker.setIcon(icon);
}
