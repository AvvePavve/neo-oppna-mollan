// routing.js

export class RoutingManager {
  constructor(map) {
    this.map = map;
    this.routingControl = null;
    this.isRoutingActive = false;
    this.removeRouteBtn = document.getElementById('removeRouteBtn');
    
    this.initEventListeners();
  }

  initEventListeners() {
    // Rutt-knappar
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('route-btn')) {
	e.stopPropagation();
	e.preventDefault();

        const lat = parseFloat(e.target.getAttribute('data-lat'));
        const lng = parseFloat(e.target.getAttribute('data-lng'));
        this.routeTo([lat, lng]);
      }
    });

    // Ta bort rutt-knapp
    this.removeRouteBtn.addEventListener('click', () => {
      this.removeRoute();
    });
  }

  routeTo(destinationLatLng) {
    this.isRoutingActive = true;
    
    // Importera userLatLng och watchId från location
    const userLatLng = window.locationManager?.getUserLatLng();
    
    if (userLatLng) {
      this.startRouting(userLatLng, destinationLatLng);
    } else {
      this.requestLocationAndRoute(destinationLatLng);
    }
  }

  startRouting(fromLatLng, destinationLatLng) {
    this.map.panTo(fromLatLng, { animate: true });

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
    }

    this.routingControl = L.Routing.control({
      waypoints: [L.latLng(fromLatLng), L.latLng(destinationLatLng)],
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#67aae2', weight: 5 }] },
      router: L.Routing.osrmv1({
        serviceUrl: 'https://routing.avvepavve.com/route/v1',
        profile: 'foot',
        language: 'sv',
        steps: false
      })
    })
    .on('routingerror', (e) => {
      console.error('Routing error:', e.error);
      
      let message = 'Ett fel uppstod vid ruttberäkningen.';
      if (e.error.status === -1 || e.error.message?.includes('NoRoute')) {
        message = 'Ingen rutt kunde hittas – antingen befinner du dig utanför Malmö eller så ligger min server nere :3 /avvepavve';
      }
      
      alert(message);
    })
    .addTo(this.map);

    this.removeRouteBtn.style.display = 'block';
    document.getElementById("spinnerOverlay").style.display = "none";
  }

  requestLocationAndRoute(destinationLatLng) {
    if (!navigator.geolocation) {
      alert("Geolocation stöds inte av din webbläsare.");
      return;
    }

    document.getElementById("spinnerOverlay").style.display = "flex";
    
    // Använd location manager
    window.locationManager?.getCurrentPosition()
      .then((userLatLng) => {
        if (this.isRoutingActive) {
          this.startRouting(userLatLng, destinationLatLng);
        }
      })
      .catch((error) => {
        document.getElementById("spinnerOverlay").style.display = "none";
        alert("Kunde inte hämta din plats: " + error.message);
      });
  }

  removeRoute() {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
      this.removeRouteBtn.style.display = 'none';
      this.isRoutingActive = false;
    }
  }

  getRoutingControl() {
    return this.routingControl;
  }

  getIsRoutingActive() {
    return this.isRoutingActive;
  }
}
