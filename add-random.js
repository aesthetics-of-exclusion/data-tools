#!/usr/bin/env node

const { db, random, getPoiRef } = require('../database/google-cloud')

let i = 0
db.collection('pois')
  .get()
  .then(async (snapshot) => {
    if (snapshot.empty) {
      console.log('No POIs found')
      return
    }

    for (const poi of snapshot.docs) {
      console.log(`Updated POI ${i++}`)
      await getPoiRef(poi.id).update({
        random: random()
      })
    }
  })
  .catch(err => {
    console.log('Error getting documents', err)
  })

i = 0
db.collectionGroup('annotations')
  .get()
  .then(async (snapshot) => {
    if (snapshot.empty) {
      console.log('No annotations found')
      return
    }

    for (const annotation of snapshot.docs) {
      console.log(`Updated annotation ${annotation.id}: ${i++}`)
      await annotation.ref.update({
        random: random()
      })
    }
  })
  .catch(err => {
    console.log('Error getting documents', err)
  })
