// buildings.js - Hanterar 3D-byggnader och specialmarkörer

export class BuildingsManager {
  constructor(map) {
    this.map = map;
    this.buildingOffset = { lng: -0.00002, lat: 0.00007 };
    
    this.initIcons();
    this.loadBuildings();
    this.loadSpecialMarkers();
  }

  initIcons() {
    // Rondellen/Gaza icon
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
    return {
      ...geojson,
      features: geojson.features.map(f => ({
        ...f,
        geometry: JSON.parse(JSON.stringify(f.geometry)),
        properties: { ...f.properties }
      }))
    };
  }

  addBuildingSidesFromLayer(layerGroup) {
    const wallColor = '#faf4b7';
    
    layerGroup.eachLayer(layer => {
      const geom = layer.feature && layer.feature.geometry;
      if (geom && geom.type === "Polygon") {
        const coords = geom.coordinates[0];
        
        for (let i = 0; i < coords.length - 1; i++) {
          const base1 = coords[i];
          const base2 = coords[i + 1];
          const top1 = [base1[0] + this.buildingOffset.lng, base1[1] + this.buildingOffset.lat];
          const top2 = [base2[0] + this.buildingOffset.lng, base2[1] + this.buildingOffset.lat];
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
          }).addTo(this.map);
        }
      }
    });
  }

  loadBuildings() {
    fetch('data/byggnader_mollan_rev.geojson', { cache: "force-cache" })
      .then(response => response.json())
      .then(data => {
        // Skapa offsetdata för taken
        const offsetData = this.cloneGeoJSON(data);
        offsetData.features.forEach(feature => {
          if (feature.geometry.type === "Polygon") {
            feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(coord => [
              coord[0] + this.buildingOffset.lng,
              coord[1] + this.buildingOffset.lat
            ]);
          }
        });

        // Lägg till tak (offset data)
        const takLayer = L.geoJSON(offsetData, {
          style: {
            color: '#f47c31',
            weight: 1,
            fillColor: '#f47c31',
            fillOpacity: 1
          }
        });

        // Lägg till väggar (originaldata)
        const originalLayer = L.geoJSON(data);
        this.addBuildingSidesFromLayer(originalLayer);
        
        // Lägg till taken på kartan
        takLayer.addTo(this.map);
      })
      .catch(err => console.error("Fel vid inläsning av byggnader:", err));
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
      .catch(error => {
        console.error("Fel vid inläsning av gazarondellen.geojson:", error);
      });
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
      .catch(error => {
        console.error("Fel vid inläsning av stege.geojson:", error);
      });
  }
}
