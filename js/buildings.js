// buildings.js - Hanterar "3D-byggnader" och specialmarkörer
// buildings.js - KORRIGERAD VERSION
export class BuildingsManager {
  constructor(map) {
    this.map = map;
    this.buildingOffset = { lng: -0.00002, lat: 0.00007 };
    this.buildingLayers = [];
    
    this.initIcons();
    this.loadBuildings();
    this.loadSpecialMarkers();
  }

  initIcons() {
    // Rondellen icon
    this.gazaIcon = L.icon({
      iconUrl: 'Logotyp_Nal.svg',
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38]
    });

    // Stege icon
    this.stegeIcon = L.icon({
      iconUrl: 'Stege.svg',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });
  }

  cloneGeoJSON(geojson) {
    return JSON.parse(JSON.stringify(geojson));
  }

  loadBuildings() {
    fetch('data/byggnader_mollan_rev.geojson', { cache: "force-cache" })
      .then(response => response.json())
      .then(data => {
        this.renderBuildings(data);
      })
      .catch(err => console.error("Fel vid inläsning av byggnader:", err));
  }

  renderBuildings(data) {
    const allWalls = [];
    const allRoofs = this.cloneGeoJSON(data);
    
    // Processa tak och samla väggar
    allRoofs.features.forEach((feature, index) => {
      if (feature.geometry.type === "Polygon") {
        // Flytta taket
        feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(coord => [
          coord[0] + this.buildingOffset.lng,
          coord[1] + this.buildingOffset.lat
        ]);
        
        // Skapa väggar för denna byggnad
        const originalCoords = data.features[index].geometry.coordinates[0];
        
        for (let i = 0; i < originalCoords.length - 1; i++) {
          const base1 = originalCoords[i];
          const base2 = originalCoords[i + 1];
          const top1 = [base1[0] + this.buildingOffset.lng, base1[1] + this.buildingOffset.lat];
          const top2 = [base2[0] + this.buildingOffset.lng, base2[1] + this.buildingOffset.lat];
          
          allWalls.push({
            type: "Feature",
            geometry: { 
              type: "Polygon", 
              coordinates: [[base1, base2, top2, top1, base1]]
            }
          });
        }
      }
    });

    // ✅ VÄGGAR FÖRST (lägre z-index)
    const wallLayer = L.geoJSON({
      type: "FeatureCollection",
      features: allWalls
    }, {
      style: {
        color: '#faf4b7',
        weight: 0.5,
        fillColor: '#faf4b7',
        fillOpacity: 1
      },
      interactive: false
    });
    this.buildingLayers.push(wallLayer);
    wallLayer.addTo(this.map);

    // ✅ TAK EFTER (högre z-index) - FIXAD SYNTAX
    const roofLayer = L.geoJSON(allRoofs, {
      style: {
        color: '#f47c31',
        weight: 1,
        fillColor: '#f47c31',
        fillOpacity: 1
      },
      interactive: false
    });
    this.buildingLayers.push(roofLayer);
    roofLayer.addTo(this.map);
  }

  loadSpecialMarkers() {
    this.loadGazarondellen();
    this.loadStege();
  }

  loadGazarondellen() {
    fetch('data/gazarondellen.geojson')
      .then(response => response.json())
      .then(data => {
        L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            return L.marker(latlng, { icon: this.gazaIcon });
          },
          onEachFeature: (feature, layer) => {
            const latlng = layer.getLatLng();
            const popup = `
              <strong>${feature.properties.name || "Gazarondellen"}</strong><br>
              <strong>Aktivitet:</strong> Se schema i menyn ☰ till höger.<br>
              <button class="btn route-btn" data-lat="${latlng.lat}" data-lng="${latlng.lng}">Visa rutt</button>
            `;
            layer.bindPopup(popup);
          }
        }).addTo(this.map);
      })
      .catch(error => console.error("Fel vid inläsning av gazarondellen.geojson:", error));
  }

  loadStege() {
    fetch('data/stege.geojson')
      .then(response => response.json())
      .then(data => {
        L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            return L.marker(latlng, { icon: this.stegeIcon });
          },
          onEachFeature: (feature, layer) => {
            const latlng = layer.getLatLng();
            const popup = `
              <strong>${feature.properties.name || "Innergårdsstege"}</strong><br>
              <strong>Aktivitet:</strong> Vernissage klockan 11:30 på Kristianstadsgatan 39B.<br>
              <button class="btn route-btn" data-lat="${latlng.lat}" data-lng="${latlng.lng}">Visa rutt</button>
            `;
            layer.bindPopup(popup);
          }
        }).addTo(this.map);
      })
      .catch(error => console.error("Fel vid inläsning av stege.geojson:", error));
  }
}
