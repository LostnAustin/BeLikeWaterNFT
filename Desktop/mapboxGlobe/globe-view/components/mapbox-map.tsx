import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { globalAgent } from 'http';

function MapboxMap() {
    // this is where the map instance will be stored after initialization
  const [map, setMap] = React.useState<mapboxgl.Map>();

    // React ref to store a reference to the DOM node that will be used
  // as a required parameter `container` when initializing the mapbox-gl
  // will contain `null` by default
    const mapNode = React.useRef(null);

  React.useEffect(() => {
    const node = mapNode.current;
        // if the window object is not found, that means
        // the component is rendered on the server
        // or the dom node is not initialized, then return early
    if (typeof window === "undefined" || node === null) return;

        // otherwise, create a map instance
    const map = new mapboxgl.Map({
      container: node,
            accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
            zoom: 1.5,
            center: [-90, 40],
            style: 'mapbox://styles/mapbox/satellite-v9',
            projection: 'globe' 
    });

    map.on('style.load', () => {
      map.setFog({}); // Set the default atmosphere style
      });
       
      // The following values can be changed to control rotation speed:
       
      // At low zooms, complete a revolution every two minutes.
      const secondsPerRevolution = 120;
      // Above zoom level 5, do not rotate.
      const maxSpinZoom = 5;
      // Rotate at intermediate speeds between zoom levels 3 and 5.
      const slowSpinZoom = 3;
       
      let userInteracting = false;
      let spinEnabled = true;
       
      function spinGlobe() {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
      let distancePerSecond = 360 / secondsPerRevolution;
      if (zoom > slowSpinZoom) {
      // Slow spinning at higher zooms
      const zoomDif =
      (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
      distancePerSecond *= zoomDif;
      }
      const center = map.getCenter();
      center.lng -= distancePerSecond;
      // Smoothly animate the map over one second.
      // When this animation is complete, it calls a 'moveend' event.
      map.easeTo({ center, duration: 1000, easing: (n) => n });
      }
      }
       
      // Pause spinning on interaction
      map.on('mousedown', () => {
      userInteracting = true;
      });
       
      // Restart spinning the globe when interaction is complete
      map.on('mouseup', () => {
      userInteracting = false;
      spinGlobe();
      });
       
      // These events account for cases where the mouse has moved
      // off the map, so 'mouseup' will not be fired.
      map.on('dragend', () => {
      userInteracting = false;
      spinGlobe();
      });
      map.on('pitchend', () => {
      userInteracting = false;
      spinGlobe();
      });
      map.on('rotateend', () => {
      userInteracting = false;
      spinGlobe();
      });
       
      // When animation is complete, start spinning if there is no ongoing interaction
      map.on('moveend', () => {
      spinGlobe();
      });
       
      if (document.getElementById('btn-spin')) {
      document.getElementById('btn-spin').addEventListener('click', (e) => {
      spinEnabled = !spinEnabled;
      if (spinEnabled) {
      spinGlobe();
      e.target.innerHTML = 'Pause rotation';
      } else {
      map.stop(); // Immediately end ongoing animation
      e.target.innerHTML = 'Start rotation';
      }
      })
    };
       
      spinGlobe();
      
        // save the map object to React.useState
    setMap(map);

        return () => {
      map.remove();
    };
  }, []);

    return <div ref={mapNode} style={{ width: "100%", height: "100%" }} />;
}

export default MapboxMap;