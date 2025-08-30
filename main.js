let watchId = null;
let isRoutingActive = false;
let accuracyCircle;
let hasCenteredUser = false;

function closeInfo() {
  document.getElementById("infoOverlay").style.display = "none";
}

// Baskarta ljus o mörk
const lightTiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 20,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	ext: 'png'
});

//const darkTiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}', {
//	minZoom: 0,
//	maxZoom: 20,
//	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//	ext: 'png'
//});

// Extent
const defaultCenter = [55.591988278009765, 13.011586184559851];
const defaultZoom = 16;
const map = L.map('map', { layers: [], zoomControl: false }).setView(defaultCenter, defaultZoom);

const bounds = L.latLngBounds(
  [55.53, 12.90],  // sydväst
  [55.65, 13.12]   // nordost
);

map.setMaxBounds(bounds);
map.setMinZoom(14);
map.setMaxZoom(20);

map.on('drag', () => {
  map.panInsideBounds(bounds, { animate: false });
});

// Temporärt inaktiverad dark mode:
// function setBaseMap() {
//   const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
//   if (isDark) {
//     if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
//     if (!map.hasLayer(darkTiles)) darkTiles.addTo(map);
//   } else {
//     if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
//     if (!map.hasLayer(lightTiles)) lightTiles.addTo(map);
//   }
// }

// setBaseMap();
// window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setBaseMap);

// Använd alltid ljusa kartan:
lightTiles.addTo(map);

map.createPane('userPane');
map.getPane('userPane').style.zIndex = 1000;

map.createPane('userAccuracyPane');
map.getPane('userAccuracyPane').style.zIndex = 599;

let userMarker;
let userLatLng;
let routingControl;
const removeRouteBtn = document.getElementById('removeRouteBtn');

// User icon
const userIcon = L.divIcon({
  className: 'user-location-icon',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
});

// Min plats
L.Control.Locate = L.Control.extend({
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-control');
    const link = L.DomUtil.create('a', 'leaflet-bar leaflet-control-locate', container);
    link.href = '#';
    link.title = 'Visa min plats';

    L.DomEvent.on(link, 'click', L.DomEvent.stop)
      .on(link, 'click', () => {
        if (!navigator.geolocation) {
          alert("Geolocation stöds inte av din webbläsare.");
          return;
        }
		
		document.getElementById("spinnerOverlay").style.display = "flex";
		
		if (!watchId) {
			watchId = navigator.geolocation.watchPosition(
				position => {
					
					document.getElementById("spinnerOverlay").style.display = "none";
					
					const lat = position.coords.latitude;
					const lng = position.coords.longitude;
					userLatLng = [lat, lng];

					if (!userMarker) {
						userMarker = L.marker(userLatLng, {
							icon: userIcon,
							pane: 'userPane'
						}).addTo(map).bindPopup("Du är här!");
					} else {
						userMarker.setLatLng(userLatLng);
					}
					
					if (!accuracyCircle) {
						accuracyCircle = L.circle(userLatLng, {
							radius: Math.max(position.coords.accuracy, 10),
							color: '#136AEC',
							fillColor: '#136AEC',
							fillOpacity: 0.15,
							weight: 1,
							pane: 'userAccuracyPane'
						}).addTo(map);
					} else {
						accuracyCircle.setLatLng(userLatLng);
						accuracyCircle.setRadius(position.coords.accuracy);
					}
					
					if (!hasCenteredUser) {
						map.setView(userLatLng, 17);
						userMarker.openPopup();
						hasCenteredUser = true;
					}
					
					console.log("Ny position:", position.coords);
					
				},
				error => {
					document.getElementById("spinnerOverlay").style.display = "none";
					alert("Kunde inte hämta din plats: " + error.message);
				},
				{ 
				enableHighAccuracy: true,
				maximumAge: 0,
				timeout: Infinity
				}
			);
		} else {
  // Om redan aktiv, använd senaste position
			if (userLatLng) {
				map.setView(userLatLng, 17);
				if (userMarker) userMarker.openPopup();
				hasCenteredUser = true;
			}
			document.getElementById("spinnerOverlay").style.display = "none";
		}
      });

    return container;
  },
  onRemove: function(map) {}
});


// Lägg till kontrollen
L.control.locate = function(opts) {
  return new L.Control.Locate(opts);
};

L.control.locate({ position: 'topright' }).addTo(map);

// Adressikoner
const addressIcon = L.icon({
  iconUrl: 'GPS.svg',
  iconSize: [13, 22],
  iconAnchor: [6, 22],
  popupAnchor: [0, -22],
//  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
//  shadowSize: [35, 35],
//  shadowAnchor: [12, 35]
});

// Byggnader med offset
const buildingOffset = { lng: -0.00002, lat: 0.00007 };
function cloneGeoJSON(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: JSON.parse(JSON.stringify(f.geometry)),
      properties: { ...f.properties }
    }))
  };
}
function addBuildingSidesFromLayer(layerGroup) {
  const wallColor = '#faf4b7';
  layerGroup.eachLayer(layer => {
    const geom = layer.feature && layer.feature.geometry;
    if (geom && geom.type === "Polygon") {
      const coords = geom.coordinates[0];
      for (let i = 0; i < coords.length - 1; i++) {
        const base1 = coords[i];
        const base2 = coords[i + 1];
        const top1 = [base1[0] + buildingOffset.lng, base1[1] + buildingOffset.lat];
        const top2 = [base2[0] + buildingOffset.lng, base2[1] + buildingOffset.lat];
        const wallCoords = [[base1, base2, top2, top1, base1]];
        const wallFeature = {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: wallCoords }
        };
        L.geoJSON(wallFeature, {
          style: {
            color: wallColor,
            weight: 0.5,
            fillColor: wallColor,
            fillOpacity: 1
          }
        }).addTo(map);
      }
    }
  });
}
fetch('data/byggnader_mollan_rev.geojson', { cache: "force-cache" })
  .then(response => response.json())
  .then(data => {
    const offsetData = cloneGeoJSON(data);
    offsetData.features.forEach(feature => {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(coord => [
          coord[0] + buildingOffset.lng,
          coord[1] + buildingOffset.lat
        ]);
      }
    });
    const takLayer = L.geoJSON(offsetData, {
      style: {
        color: '#f47c31',
        weight: 1,
        fillColor: '#f47c31',
        fillOpacity: 1
      }
    });
    const originalLayer = L.geoJSON(data);
    addBuildingSidesFromLayer(originalLayer);
    takLayer.addTo(map);
  })
  .catch(err => console.error("Fel vid inläsning av byggnader:", err));

// Livesync!
const aktivitetLayersLive = {};
let layerControl = null;
const SHEET_URL = "https://sheets.avvepavve.com/api/formdata";
//const SHEET_URL = 'https://opensheet.elk.sh/1t5ILyafrrFJNiO2V0QrqbZyFNgTdXcY7SujnOOQHbfI/Formulärsvar 1';

function normaliseraAdress(adress) {
  return adress
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s]/gi, '')
    .replace(/\d{3}\s?\d{2}/g, '')
    .replace(/malmö/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function uppdateraAktiviteterFrånGoogleFormulär() {
  try {
    const response = await fetch(SHEET_URL);
    const formData = await response.json();
    if (!Array.isArray(formData)) throw new Error("Datan från formuläret kunde inte tolkas som en lista.");

    const formSvar = formData.map(row => ({
		adress: normaliseraAdress(row["📍 Gatuadress till din innergård"] || ""),
		aktivitet: row["🕺 Vad kommer hända på innergården?"] || "Ingen aktivitet angiven",
		kategori: row["Kategori"] || "Övrigt"
	}));

    const geoRes = await fetch('data/adresser_rev.geojson');
    const geoJson = await geoRes.json();

    geoJson.features.forEach(feature => {
      const geoAdress = normaliseraAdress(feature.properties.beladress || "");
      const match = formSvar.find(entry => geoAdress === entry.adress);
      if (match) {
		feature.properties.Aktivitet = match.aktivitet;
		feature.properties.Kategori = match.kategori;
		feature.properties.oppen = "Ja";
	  } else {
		feature.properties.oppen = "Nej";
		delete feature.properties.Aktivitet;
		delete feature.properties.Kategori;
		}
    });
	
	formSvar.forEach(entry => {
		const found = geoJson.features.find(feature => 
			normaliseraAdress(feature.properties.beladress || "") === entry.adress
		);
		if (!found) {
			console.log(`Ingen matchning för adress i formulär: "${entry.adress}"`);
		}
	});

    for (const layer of Object.values(aktivitetLayersLive)) {
      layer.clearLayers();
    }

	const filtered = geoJson.features.filter(f => f.properties.oppen === "Ja");
	filtered.forEach(feature => {
		const aktivitet = feature.properties.Aktivitet;
		const kategori = feature.properties.Kategori || "Övrigt";

		const coords = feature.geometry.type === "MultiPoint"
			? feature.geometry.coordinates
			: [feature.geometry.coordinates];

	coords.forEach(coord => {
		const latLng = [coord[1], coord[0]];
		const marker = L.marker(latLng, { icon: addressIcon });
		const popup = `
			<strong>Adress:</strong> ${feature.properties.beladress}<br>
			<strong>Aktivitet:</strong> ${aktivitet}<br>
			<button class="btn route-btn" data-lat="${latLng[0]}" data-lng="${latLng[1]}">Visa rutt</button>
		`;
		marker.bindPopup(popup);
		if (!aktivitetLayersLive[kategori]) {
			aktivitetLayersLive[kategori] = L.layerGroup();
		}
		aktivitetLayersLive[kategori].addLayer(marker);
		});
	});
	
	const activeCategories = new Set();
	for (const [kategori, layer] of Object.entries(aktivitetLayersLive)) {
		if (map.hasLayer(layer)) {
			activeCategories.add(kategori);
		}
	}
	
	if (activeCategories.size === 0) {
      Object.keys(aktivitetLayersLive).forEach(kategori => activeCategories.add(kategori));
    }
	
	const overlayMaps = {};
	for (const [aktivitet, layer] of Object.entries(aktivitetLayersLive)) {
		overlayMaps[aktivitet] = layer;
		if (activeCategories.has(aktivitet)) {
    // Användaren hade slagit på detta lager
			layer.addTo(map);
		} else {
    // Annars låt det vara avstängt
			map.removeLayer(layer);
		}
	}

    if (layerControl) {
      map.removeControl(layerControl);
    }
//    layerControl = L.control.layers(null, overlayMaps, { collapsed: true, position: 'topleft' }).addTo(map);

  } catch (err) {
    console.error("Fel vid formul\u00e4rintegration:", err);
  }
}

uppdateraAktiviteterFrånGoogleFormulär();
setInterval(uppdateraAktiviteterFrånGoogleFormulär, 120000);

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('route-btn')) {
    const lat = parseFloat(e.target.getAttribute('data-lat'));
    const lng = parseFloat(e.target.getAttribute('data-lng'));
    routeTo([lat, lng]);
  }
});

// Rondellen
const gazaIcon = L.icon({
  iconUrl: 'Logotyp_Nal.svg',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});

fetch('data/gazarondellen.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon: gazaIcon });
      },
      onEachFeature: (feature, layer) => {
        const latlng = layer.getLatLng();
		const popup = `
			<strong>${feature.properties.name || "Gazarondellen"}</strong><br>
			<strong>Aktivitet:</strong> Se schema ☰ i menyn till höger.<br>
			<button class="btn route-btn" data-lat="${latlng.lat}" data-lng="${latlng.lng}">Visa rutt</button>
		`;
        layer.bindPopup(popup);
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error("Fel vid inl\u00e4sning av gazarondellen.geojson:", error);
  });

// Ruttning! Tänk på att detta ligger på min privata server. Vi kanske inte vill ha det så framöver.
function routeTo(destinationLatLng) {
  function startRouting(fromLatLng) {
    map.panTo(fromLatLng, { animate: true });

    if (routingControl) {
      map.removeControl(routingControl);
    }
    routingControl = L.Routing.control({
      waypoints: [L.latLng(fromLatLng), L.latLng(destinationLatLng)],
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#67aae2', weight: 5 }] },
      router: L.Routing.osrmv1({
        serviceUrl: 'https://routing.avvepavve.com/route/v1',
	//	serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1', 
        profile: 'foot',
        language: 'sv',
        steps: false
      })
	})
	.on('routingerror', function(e) {
	  console.error('Routing error:', e.error);

	  let message = 'Ett fel uppstod vid ruttberäkningen.';
      if (e.error.status === -1 || e.error.message?.includes('NoRoute')) {
        message = 'Ingen rutt kunde hittas – antingen befinner du dig utanför Malmö eller så ligger min server nere :3 /avvepavve';
      }

      alert(message);  
    })
	.addTo(map);

    removeRouteBtn.style.display = 'block';
    document.getElementById("spinnerOverlay").style.display = "none";
  }
  
  isRoutingActive = true; // aktivera routing-flagga

  if (userLatLng) {
    startRouting(userLatLng);
  } else {
    if (!navigator.geolocation) {
      alert("Geolocation stöds inte av din webbläsare.");
      return;
    }

    // Visa spinner
    document.getElementById("spinnerOverlay").style.display = "flex";

    if (!watchId) {
      watchId = navigator.geolocation.watchPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          userLatLng = [lat, lng];

          if (!userMarker) {
            userMarker = L.marker(userLatLng, { icon: userIcon, pane: 'userPane' })
              .addTo(map).bindPopup("Du är här!");
          } else {
            userMarker.setLatLng(userLatLng);
          }
		  
		  if (!accuracyCircle) {
            accuracyCircle = L.circle(userLatLng, {
              radius: Math.max(position.coords.accuracy, 10),
              color: '#136AEC',
              fillColor: '#136AEC',
			  fillOpacity: 0.15,
			  weight: 1,
			  pane: 'userAccuracyPane'
		    }).addTo(map);
          } else {
            accuracyCircle.setLatLng(userLatLng);
            accuracyCircle.setRadius(position.coords.accuracy);
          }

          if (!routingControl && isRoutingActive) {
            startRouting(userLatLng);
          }
        },
        error => {
          document.getElementById("spinnerOverlay").style.display = "none";
          alert("Kunde inte hämta din plats: " + error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }
}

removeRouteBtn.addEventListener('click', () => {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
    removeRouteBtn.style.display = 'none';
    isRoutingActive = false; // stäng av flagga så rutt inte återskapas
  }
});

// Menyer o grejer
const menuToggle = document.getElementById("menuToggle");
const menuDrawer = document.getElementById("menuDrawer");
const menuClose = document.getElementById("menuClose");

menuToggle.addEventListener("click", (e) => {
  const aboutOpen = document.getElementById("aboutOverlay").style.display === "flex";
  if (aboutOpen) {
    e.stopPropagation(); // blockera öppning
    return;
  }
  menuDrawer.classList.toggle("open");
  document.body.classList.toggle("no-scroll");
});

menuClose.addEventListener("click", () => {
  menuDrawer.classList.remove("open");
  document.body.classList.remove("no-scroll");
});

document.addEventListener("click", (event) => {
  const isClickInside = menuDrawer.contains(event.target) || menuToggle.contains(event.target);
  if (!isClickInside) {
    menuDrawer.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }
});

function openOverlay(id) {
  const el = document.getElementById(id);
  if (el) {
    menuDrawer.classList.remove("open");
    document.body.classList.remove("no-scroll");
    setTimeout(() => {
      el.style.display = "flex";
      requestAnimationFrame(() => {
        el.classList.add("show");
        document.body.classList.add("no-scroll");
      });
    }, 300);
  }
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("show");
    setTimeout(() => {
      el.style.display = "none";
      document.body.classList.remove("no-scroll");
    }, 300);
  }
}

document.getElementById("openAboutOverlay").addEventListener("click", function (e) {
  e.preventDefault();
  openOverlay("aboutOverlay");
});

document.getElementById("openAaaOverlay").addEventListener("click", function (e) {
  e.preventDefault();
  openOverlay("AaaOverlay");
});

document.getElementById("openSchemaOverlay").addEventListener("click", function (e) {
  e.preventDefault();
  openOverlay("SchemaOverlay");
});

function fixViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', fixViewportHeight);
window.addEventListener('orientationchange', fixViewportHeight);
window.addEventListener('focus', fixViewportHeight);
window.addEventListener('touchstart', () => {
  setTimeout(fixViewportHeight, 300);
});

fixViewportHeight();

// Okej, jag vet att detta är vibe code spaghetti. Till dig som eventuellt tar över detta projekt: förlåt, och jag hoppas att du kan göra det bättre. /avvepavve
