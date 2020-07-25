#!/usr/bin/env node

const R = require('ramda')
const { db, getPoiRef } = require('../database/google-cloud')

// Import DAG from https://github.com/aesthetics-of-exclusion/cloud-functions repository
// This script expects this repository to be cloned locally:
const DAG = require('../cloud-functions/functions/streetswipe-dag.js')

const argv = require('yargs')
  .describe('l', 'Only process first <limit> POIs')
  .alias('l', 'limit')
  .describe('d', 'Dry run - don\'t update database')
  .alias('d', 'dryrun')
  .boolean(['d'])
  .default('d', false)
  .argv

async function repairAggregates (limit, dryrun) {
  let i = 0

  let query = db.collection('pois')

  if (limit) {
    query = query.limit(limit)
  }

  const snapshot = await query.get()

  if (snapshot.empty) {
    console.error('No POIs found')
  } else {
    const aggregatedAnnotations = {}

    for (const poiRef of snapshot.docs) {
      console.log(`${i++} → Updating POI ${poiRef.id} →`)

      const annotationRefs = await getPoiRef(poiRef.id)
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

      const annotationCounts = {...nextAnnotations, ...counted}

      console.log(annotationCounts)
      if (!dryrun) {
        await getPoiRef(poiRef.id).update(annotationCounts)
      }

      for (let [key, count] of Object.entries(annotationCounts)) {
        const annotationType = key.split('.')[1]

        const typeAggregatedAnnotations = aggregatedAnnotations[annotationType] || {}

        aggregatedAnnotations[annotationType] = {
          ...typeAggregatedAnnotations,
          [count]: (typeAggregatedAnnotations[count] || 0) + 1
        }
      }
    }

    console.log('Updating db.collection(\'aggregates\').doc(\'annotations\') → ')
    console.log(aggregatedAnnotations)
    if (!dryrun && !limit) {
      await db.collection('aggregates').doc('annotations').update(aggregatedAnnotations)
    }
  }
}

repairAggregates(argv.limit, argv.dryrun)
