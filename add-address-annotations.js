#!/usr/bin/env node

const { db, addAnnotation, getPoiRef } = require('./google-cloud')

let i = 0
db.collection('pois')
  .where('annotations.address', '==', 0)
  .get()
  .then(async (snapshot) => {
    if (snapshot.empty) {
      console.log('No missing addresses')
      return
    }

    for (const poi of snapshot.docs) {
      const osmAnnotations = await getPoiRef(poi.id).collection('annotations')
        .where('type', '==', 'osm').get()
      const osmFeature = osmAnnotations.docs[0].data().data

      const housenumber = osmFeature.properties['addr:housenumber']
      const street = osmFeature.properties['addr:street']
      const city = osmFeature.properties['addr:city'] || 'amsterdam'
      const postcode = osmFeature.properties['addr:postcode'] || null

      let address
      if (housenumber && street && city) {
        console.log(`Adding address annotation ${++i}`)
        address = `${street} ${housenumber}, ${city}`

        await addAnnotation(poi.id, 'address', {
          housenumber,
          city,
          street,
          postcode,
          address
        })
      } else {
        console.error('Can\'t create address!', osmFeature.properties)
      }
    }
  })
  .catch(err => {
    console.log('Error getting documents', err)
  })
