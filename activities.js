// activities.js - Hanterar aktiviteter och Google Forms integration

export class ActivitiesManager {
  constructor(map) {
    this.map = map;
    this.aktivitetLayersLive = {};
    this.layerControl = null;
    this.SHEET_URL = "https://sheets.avvepavve.com/api/formdata";
    
    this.addressIcon = L.icon({
      iconUrl: 'GPS.svg',
      iconSize: [13, 22],
      iconAnchor: [6, 22],
      popupAnchor: [0, -22],
    });

    this.initActivities();
  }

  initActivities() {
    // Starta första uppdatering
    this.uppdateraAktiviteterFrånGoogleFormulär();
    
    // Uppdatera var 2:a minut
    setInterval(() => {
      this.uppdateraAktiviteterFrånGoogleFormulär();
    }, 120000);
  }

  normaliseraAdress(adress) {
    return adress
      .toLowerCase()
      .replace(/[^a-z0-9åäö\s]/gi, '')
      .replace(/\d{3}\s?\d{2}/g, '')
      .replace(/malmö/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async uppdateraAktiviteterFrånGoogleFormulär() {
    try {
      const response = await fetch(this.SHEET_URL);
      const formData = await response.json();
      
      if (!Array.isArray(formData)) {
        throw new Error("Datan från formuläret kunde inte tolkas som en lista.");
      }

      // Logga fältnamnen för debugging
      if (formData.length > 0) {
        console.log("Tillgängliga fältnamn:", Object.keys(formData[0]));
      }

      const formSvar = formData.map(row => ({
        adress: this.normaliseraAdress(row["🏠 Gatuadress till din innergård"] || ""),
        aktivitet: row["🕺 Vad kommer hända på innergården?"] || "Ingen aktivitet angiven",
        kategori: row["Kategori"] || "Övrigt"
      }));

      const geoRes = await fetch('data/adresser_rev.geojson');
      const geoJson = await geoRes.json();

      // Matcha formulärdata med geografisk data
      geoJson.features.forEach(feature => {
        const geoAdress = this.normaliseraAdress(feature.properties.beladress || "");
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

      // Logga icke-matchade adresser för debugging (men skippa tomma)
      formSvar.forEach(entry => {
        const found = geoJson.features.find(feature => 
          this.normaliseraAdress(feature.properties.beladress || "") === entry.adress
        );
        if (!found && entry.adress.trim() !== "") { // Bara logga icke-tomma adresser
          console.log(`Ingen matchning för adress i formulär: "${entry.adress}"`);
        }
      });

      this.updateMarkers(geoJson);
      this.updateLayerControl();

    } catch (err) {
      console.error("Fel vid formulärintegration:", err);
    }
  }

  updateMarkers(geoJson) {
    // Rensa befintliga lager
    for (const layer of Object.values(this.aktivitetLayersLive)) {
      layer.clearLayers();
    }

    // Filtrera och lägg till nya markörer
    const filtered = geoJson.features.filter(f => f.properties.oppen === "Ja");
    
    filtered.forEach(feature => {
      const aktivitet = feature.properties.Aktivitet;
      const kategori = feature.properties.Kategori || "Övrigt";

      const coords = feature.geometry.type === "MultiPoint"
        ? feature.geometry.coordinates
        : [feature.geometry.coordinates];

      coords.forEach(coord => {
        const latLng = [coord[1], coord[0]];
        const marker = L.marker(latLng, { icon: this.addressIcon });
        
        const popup = `
          <strong>Adress:</strong> ${feature.properties.beladress}<br>
          <strong>Aktivitet:</strong> ${aktivitet}<br>
          <button class="btn route-btn" data-lat="${latLng[0]}" data-lng="${latLng[1]}">Visa rutt</button>
        `;
        marker.bindPopup(popup);

        if (!this.aktivitetLayersLive[kategori]) {
          this.aktivitetLayersLive[kategori] = L.layerGroup();
        }
        this.aktivitetLayersLive[kategori].addLayer(marker);
      });
    });
  }

  updateLayerControl() {
    // Spara aktiva kategorier
    const activeCategories = new Set();
    for (const [kategori, layer] of Object.entries(this.aktivitetLayersLive)) {
      if (this.map.hasLayer(layer)) {
        activeCategories.add(kategori);
      }
    }

    // Om inga kategorier är aktiva, aktivera alla
    if (activeCategories.size === 0) {
      Object.keys(this.aktivitetLayersLive).forEach(kategori => activeCategories.add(kategori));
    }

    // Uppdatera overlay maps
    const overlayMaps = {};
    for (const [aktivitet, layer] of Object.entries(this.aktivitetLayersLive)) {
      overlayMaps[aktivitet] = layer;
      
      if (activeCategories.has(aktivitet)) {
        layer.addTo(this.map);
      } else {
        this.map.removeLayer(layer);
      }
    }

    // Uppdatera layer control (för närvarande inaktiverad)
    if (this.layerControl) {
      this.map.removeControl(this.layerControl);
    }
    // layerControl = L.control.layers(null, overlayMaps, { collapsed: true, position: 'topleft' }).addTo(map);
  }

  // Getters för externa moduler
  getAktivitetLayers() {
    return this.aktivitetLayersLive;
  }

  getLayerControl() {
    return this.layerControl;
  }
}
