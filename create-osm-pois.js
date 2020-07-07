#!/usr/bin/env node

const H = require('highland')
const JSONStream = require('JSONStream')

const { db, deleteAnnotations, addAnnotation, setNextAnnotations, random } = require('../database/google-cloud')

const city = 'amsterdam'

async function addPoi (feature) {
  const poiId = feature.id

  const poiRef = db.collection('pois').doc(poiId)

  await poiRef.set({
    city,
    source: 'osm',
    random: random(),
    url: `https://www.openstreetmap.org/${poiId.replace(/^osm:/, '').replace(':', '/')}`
  })

  await deleteAnnotations(poiId, 'osm')
  await addAnnotation(poiId, 'osm', feature)
  await setNextAnnotations(poiId, ['address'])
}

const features = process.stdin
  .pipe(JSONStream.parse('features.*'))

let i = 0
H(features)
  .map((feature) => {
    console.log(`Adding OSM feature ${++i}`)
    return feature
  })
  .flatMap((feature) => H(addPoi(feature)))
  .done(() => {
    console.log('Done!')
  })
