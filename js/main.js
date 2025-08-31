// main.js

import { LocationManager } from './location.js';
import { RoutingManager } from './routing.js';
import { ActivitiesManager } from './activities.js';
import { BuildingsManager } from './buildings.js';
import { UIManager } from './ui.js';

// Vygrejer
const defaultCenter = [55.591988278009765, 13.011586184559851];
const defaultZoom = 16;

// Baskarta
const lightTiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
  minZoom: 0,
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  ext: 'png'
});

const map = L.map('map', { 
  layers: [], 
  zoomControl: false 
}).setView(defaultCenter, defaultZoom);

// Bounds
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

// Lägg till baskarta
lightTiles.addTo(map);

// Skapa panes för olika lager
map.createPane('userPane');
map.getPane('userPane').style.zIndex = 1000;

map.createPane('userAccuracyPane');
map.getPane('userAccuracyPane').style.zIndex = 599;

// Initialisera alla managers
let locationManager;
let routingManager;
let activitiesManager;
let buildingsManager;
let uiManager;

function initializeApp() {
  try {
    uiManager = new UIManager();
    uiManager.setupGlobalFunctions();

    locationManager = new LocationManager(map);

    window.locationManager = locationManager;

    routingManager = new RoutingManager(map);

    activitiesManager = new ActivitiesManager(map);

    buildingsManager = new BuildingsManager(map);

    console.log('Lyckad inladdning');

  } catch (error) {
    console.error('Fel vid initialisering av applikationen:', error);
  }
}

// Starta applikationen när DOM är redo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// (Debugging)
export { 
  map, 
  locationManager, 
  routingManager, 
  activitiesManager, 
  buildingsManager, 
  uiManager 
};

