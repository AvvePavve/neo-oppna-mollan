// location.js

export class LocationManager {
  constructor(map) {
    this.map = map;
    this.watchId = null;
    this.userLatLng = null;
    this.userMarker = null;
    this.accuracyCircle = null;
    this.hasCenteredUser = false;
    this.shouldOpenPopup = false;
    
    this.userIcon = L.divIcon({
      className: 'user-location-icon',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -9],
    });

    this.initLocationControl();
  }

  initLocationControl() {
    // Min plats
    L.Control.Locate = L.Control.extend({
      onAdd: (map) => {
        const container = L.DomUtil.create('div', 'leaflet-control');
        const link = L.DomUtil.create('a', 'leaflet-bar leaflet-control-locate', container);
        link.href = '#';
        link.title = 'Visa min plats';

        L.DomEvent.on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', () => {
            this.showUserLocation();
          });

        return container;
      },
      onRemove: (map) => {}
    });

    // Lägg till kontrollen
    L.control.locate = (opts) => new L.Control.Locate(opts);
    L.control.locate({ position: 'topright' }).addTo(this.map);
  }

  showUserLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation stöds inte av din webbläsare.");
      return;
    }
    
    this.shouldOpenPopup = true;
    document.getElementById("spinnerOverlay").style.display = "flex";
    
    if (!this.watchId) {
      this.startWatchingPosition();
    } else {
      // Om redan aktiv, använd senaste position
      if (this.userLatLng) {
        this.map.setView(this.userLatLng, 17);
        if (this.userMarker) {
	   this.userMarker.bindPopup("Du är här!").openPopup();
	}
        this.hasCenteredUser = true;
      }
      document.getElementById("spinnerOverlay").style.display = "none";
    }
  }

  startWatchingPosition() {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handlePositionUpdate(position);
      },
      (error) => {
        document.getElementById("spinnerOverlay").style.display = "none";
        alert("Kunde inte hämta din plats: " + error.message);
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: Infinity
      }
    );
  }

  handlePositionUpdate(position) {
    document.getElementById("spinnerOverlay").style.display = "none";
    
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    this.userLatLng = [lat, lng];

    this.updateUserMarker();
    this.updateAccuracyCircle(position.coords.accuracy);
    
    if (!this.hasCenteredUser) {
      this.map.setView(this.userLatLng, 17);
      this.hasCenteredUser = true;
    }
    
    if (this.shouldOpenPopup && this.userMarker) {
	this.userMarker.openPopup();
	this.shouldOpenPopup = false;
    }

    console.log("Ny position:", position.coords);
  }

  updateUserMarker() {
    if (!this.userMarker) {
      this.userMarker = L.marker(this.userLatLng, {
        icon: this.userIcon,
        pane: 'userPane'
      }).addTo(this.map).bindPopup("Du är här!");
    } else {
      this.userMarker.setLatLng(this.userLatLng);
    }
  }

  updateAccuracyCircle(accuracy) {
    if (!this.accuracyCircle) {
      this.accuracyCircle = L.circle(this.userLatLng, {
        radius: Math.max(accuracy, 10),
        color: '#136AEC',
        fillColor: '#136AEC',
        fillOpacity: 0.15,
        weight: 1,
        pane: 'userAccuracyPane'
      }).addTo(this.map);
    } else {
      this.accuracyCircle.setLatLng(this.userLatLng);
      this.accuracyCircle.setRadius(accuracy);
    }
  }

  // Få aktuell position
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (this.userLatLng) {
        resolve(this.userLatLng);
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error("Geolocation stöds inte"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.userLatLng = [lat, lng];
          this.handlePositionUpdate(position);
          resolve(this.userLatLng);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  getUserLatLng() {
    return this.userLatLng;
  }

  getUserMarker() {
    return this.userMarker;
  }

  getAccuracyCircle() {
    return this.accuracyCircle;
  }
}
