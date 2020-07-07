#!/usr/bin/env node

const R = require('ramda')
const { db, getPoiRef } = require('../database/google-cloud')

const DAG = require('../watch-annotations/functions/streetswipe-dag.js')

let i = 0
db.collection('pois')
  .get()
  .then(async (snapshot) => {
    if (snapshot.empty) {
      console.log('No POIs found')
      return
    }

    for (const poi of snapshot.docs) {
      const poiRef = getPoiRef(poi.id)

      console.log(`Updated POI ${i++}:`, poi.id)
      const annotationRefs = await poiRef
        .collection('annotations')
        .get()

      const annotations = annotationRefs.docs.map((doc) => doc.data())
      const grouped = R.groupBy(R.prop('type'), annotations)
      const pairs = R.toPairs(grouped)
      const counted = R.fromPairs(pairs.map(([key, value]) => ([`annotations.${key}`, value.length])))

      const nextAnnotations = {}
      annotations.forEach((annotation) => {
        const type = annotation.type
        if (DAG[type]) {
          for (let [nextType, testAnnotation] of Object.entries(DAG[type])) {
            if (testAnnotation(annotation)) {
              nextAnnotations[`annotations.${nextType}`] = 0
            }
          }
        }
      })

      console.log({...nextAnnotations, ...counted})

      await poiRef.update({
        ...nextAnnotations,
        ...counted
      })
    }
  })
  .catch(err => {
    console.log('Error getting documents', err)
  })
