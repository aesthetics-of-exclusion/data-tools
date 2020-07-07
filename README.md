# data-tools

Import OSM POIs from  GeoJSON:

    curl https://github.com/aesthetics-of-exclusion/download-pois/raw/master/data/amsterdam-pois.geojson | ./create-osm-pois.js

GeoJSON files produced by the Python script in [download-pois](https://github.com/aesthetics-of-exclusion/download-pois) are very large and contain a lot of unneeded data. To simplify these GeoJSON files, pipe them through [`poi-geojson-simplifier.js`]:

    ./poi-geojson-simplifier.js < amsterdam-pois-large.geojson > amsterdam-pois.geojson
