#!/usr/bin/env node

const R = require('ramda')
const turf = require('@turf/turf')
const H = require('highland')
const JSONStream = require('JSONStream')

const features = process.stdin
  .pipe(JSONStream.parse('features.*'))

H(features)
  .map((feature) => {
    const id = `osm:${feature.properties.element_type}:${feature.id}`

    const keys = [
      'addr:place',
      'addr:city',
      'addr:housenumber',
      'addr:place',
      'addr:postcode',
      'addr:street',
      'name',
      'amenity',
      'shop'
    ]

    let properties = R.pick(keys, R.map((value) => value === null ? undefined : value, feature.properties))

    let geometry = feature.geometry
    if (geometry.type !== 'Point') {
      const centroid = turf.centroid(geometry)
      geometry = centroid.geometry
    }

    return {
      type: 'Feature',
      id,
      properties,
      geometry
    }
  })
  .pipe(JSONStream.stringify('{"type": "FeatureCollection", "features": [', ',\n', ']}'))
  .pipe(process.stdout)
