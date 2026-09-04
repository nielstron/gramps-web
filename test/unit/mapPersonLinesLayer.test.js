import {describe, expect, it} from 'vitest'

import {
  buildPersonEventGroups,
  buildPersonRoutesGeoJSON,
  PERSON_ROUTE_COLOR_STOPS,
  personRouteLegendTicks,
} from '../../src/components/GrampsjsMapPersonLinesLayer.js'
import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'

describe('person life-event routes on the map', () => {
  it('can hide both the route and its direction arrows', () => {
    const layer = document.createElement('grampsjs-map-person-lines-layer')
    layer.visible = false

    expect(layer._lineLayerDef().layout.visibility).to.equal('none')
    expect(layer._arrowsLayerDef().layout.visibility).to.equal('none')
  })

  it('offers the selected person route as a deselectable map overlay', () => {
    const view = new GrampsjsViewMap()
    view.appState = {i18n: {strings: {}}}
    view._dataLayers = []
    view._dataPlaces = [
      {handle: 'p1', profile: {lat: '1', long: '2'}},
      {handle: 'p2', profile: {lat: '3', long: '4'}},
    ]
    view._selectedPersonData = {
      extended: {
        events: [
          {date: {sortval: 1}, place: 'p1'},
          {date: {sortval: 2}, place: 'p2'},
        ],
      },
    }

    expect(view._getOverlaysForLayerSwitcher()).to.deep.include({
      handle: 'person-life-event-route',
      desc: 'Life-event route (blue older → red newer)',
      visible: true,
    })
  })

  it('does not draw a route through unresolved dates', () => {
    const layer = document.createElement('grampsjs-map-person-lines-layer')
    layer.places = [
      {handle: 'p1', profile: {lat: '1', long: '2'}},
      {handle: 'p2', profile: {lat: '3', long: '4'}},
      {handle: 'p3', profile: {lat: '5', long: '6'}},
    ]
    layer.events = [
      {date: {sortval: 1, modifier: 0}, place: 'p1'},
      {date: {sortval: 2, modifier: 6}, place: 'p2'},
      {date: {sortval: 3, modifier: 0}, place: 'p3'},
    ]

    expect(layer._buildGeoJSON().features[0].geometry.coordinates).toEqual([
      [2, 1],
      [6, 5],
    ])
  })

  it('colors route segments by their relative recency', () => {
    const layer = document.createElement('grampsjs-map-person-lines-layer')
    layer.places = [
      {handle: 'p1', profile: {lat: '1', long: '2'}},
      {handle: 'p2', profile: {lat: '3', long: '4'}},
      {handle: 'p3', profile: {lat: '5', long: '6'}},
    ]
    layer.events = [
      {date: {sortval: 1, modifier: 0}, place: 'p1'},
      {date: {sortval: 2, modifier: 0}, place: 'p2'},
      {date: {sortval: 3, modifier: 0}, place: 'p3'},
    ]

    const geojson = layer._buildGeoJSON()
    expect(geojson.features.map(feature => feature.properties.recency)).toEqual(
      [0, 1]
    )
    expect(JSON.stringify(layer._linePaint()['line-color'])).toContain(
      'recency'
    )
    expect(
      JSON.stringify(layer._arrowsLayerDef().paint['icon-color'])
    ).toContain('recency')
    expect(PERSON_ROUTE_COLOR_STOPS).toHaveLength(5)
  })

  it('uses one color scale for all currently visible routes', () => {
    const places = [
      {handle: 'before-pavia', profile: {lat: '1', long: '2'}},
      {handle: 'pavia', profile: {lat: '3', long: '4'}},
      {handle: 'before-paris', profile: {lat: '5', long: '6'}},
      {handle: 'paris', profile: {lat: '7', long: '8'}},
      {handle: 'before-1920', profile: {lat: '9', long: '10'}},
      {handle: 'place-1920', profile: {lat: '11', long: '12'}},
    ]
    const routes = [
      [
        {
          date: {
            sortval: 1700,
            modifier: 0,
            dateval: [0, 0, 1700, false],
          },
          place: 'before-pavia',
        },
        {
          date: {
            sortval: 1800,
            modifier: 0,
            dateval: [0, 0, 1800, false],
          },
          place: 'pavia',
        },
      ],
      [
        {
          date: {
            sortval: 1750,
            modifier: 0,
            dateval: [0, 0, 1750, false],
          },
          place: 'before-paris',
        },
        {
          date: {
            sortval: 1860,
            modifier: 0,
            dateval: [0, 0, 1860, false],
          },
          place: 'paris',
        },
      ],
      [
        {
          date: {
            sortval: 1900,
            modifier: 0,
            dateval: [0, 0, 1900, false],
          },
          place: 'before-1920',
        },
        {
          date: {
            sortval: 1920,
            modifier: 0,
            dateval: [0, 0, 1920, false],
          },
          place: 'place-1920',
        },
      ],
    ]

    const features = buildPersonRoutesGeoJSON(routes, places).features
    expect(features.map(feature => feature.properties.recency)).toEqual([
      0, 0.25, 1,
    ])
    expect(features.map(feature => feature.properties.toYear)).toEqual([
      1800, 1860, 1920,
    ])
    expect(features.map(feature => feature.properties.time)).toEqual([
      '1800',
      '1860',
      '1920',
    ])
    expect(personRouteLegendTicks(1800, 1920)).toEqual([
      {position: 0, year: 1800},
      {position: 0.25, year: 1860},
      {position: 0.5, year: 1885},
      {position: 0.75, year: 1904},
      {position: 1, year: 1920},
    ])
  })

  it('keeps different relatives as separate routes', () => {
    const layer = document.createElement('grampsjs-map-person-lines-layer')
    layer.places = [
      {handle: 'p1', profile: {lat: '1', long: '2'}},
      {handle: 'p2', profile: {lat: '3', long: '4'}},
      {handle: 'p3', profile: {lat: '5', long: '6'}},
      {handle: 'p4', profile: {lat: '7', long: '8'}},
    ]
    layer.eventGroups = [
      [
        {date: {sortval: 1, modifier: 0}, place: 'p1'},
        {date: {sortval: 2, modifier: 0}, place: 'p2'},
      ],
      [
        {date: {sortval: 3, modifier: 0}, place: 'p3'},
        {date: {sortval: 4, modifier: 0}, place: 'p4'},
      ],
    ]

    expect(
      layer
        ._buildGeoJSON()
        .features.map(feature => feature.geometry.coordinates)
    ).toEqual([
      [
        [2, 1],
        [4, 3],
      ],
      [
        [6, 5],
        [8, 7],
      ],
    ])
  })

  it('collapses the same move by multiple people into one arrow', () => {
    const layer = document.createElement('grampsjs-map-person-lines-layer')
    layer.places = [
      {handle: 'p1', profile: {lat: '1', long: '2'}},
      {handle: 'p2', profile: {lat: '3', long: '4'}},
    ]
    layer.eventGroups = [
      [
        {date: {sortval: 1, modifier: 0}, place: 'p1'},
        {date: {sortval: 2, modifier: 0}, place: 'p2'},
      ],
      [
        {date: {sortval: 3, modifier: 0}, place: 'p1'},
        {date: {sortval: 4, modifier: 0}, place: 'p2'},
      ],
    ]

    const features = layer._buildGeoJSON().features
    expect(features).toHaveLength(1)
    expect(features[0].properties.travelerCount).toBe(2)
    expect(features[0].properties.toSortval).toBe(4)
  })

  it('uses a family event as a shared waypoint for both partners', () => {
    const places = [
      {handle: 'gruenbach', profile: {lat: '1', long: '2'}},
      {handle: 'kempten', profile: {lat: '3', long: '4'}},
      {handle: 'buoch', profile: {lat: '5', long: '6'}},
      {handle: 'heidelberg', profile: {lat: '7', long: '8'}},
    ]
    const events = [
      {
        handle: 'emilie-birth',
        date: {sortval: 1, modifier: 0},
        place: 'gruenbach',
      },
      {
        handle: 'partner-birth',
        date: {sortval: 1, modifier: 0},
        place: 'kempten',
      },
      {
        handle: 'marriage',
        date: {sortval: 2, modifier: 0},
        place: 'buoch',
      },
      {
        handle: 'emilie-death',
        date: {sortval: 3, modifier: 0},
        place: 'heidelberg',
      },
      {
        handle: 'partner-death',
        date: {sortval: 4, modifier: 0},
        place: 'heidelberg',
      },
    ]
    const people = [
      {
        handle: 'emilie',
        event_ref_list: [{ref: 'emilie-birth'}, {ref: 'emilie-death'}],
        family_list: ['family'],
      },
      {
        handle: 'partner',
        event_ref_list: [{ref: 'partner-birth'}, {ref: 'partner-death'}],
        family_list: ['family'],
      },
    ]
    const families = [{handle: 'family', event_ref_list: [{ref: 'marriage'}]}]

    const groups = buildPersonEventGroups(people, families, events)
    const features = buildPersonRoutesGeoJSON(groups, places).features

    expect(features.map(feature => feature.geometry.coordinates)).toEqual([
      [
        [2, 1],
        [6, 5],
      ],
      [
        [6, 5],
        [8, 7],
      ],
      [
        [4, 3],
        [6, 5],
      ],
    ])
    expect(features[1].properties.travelerCount).toBe(2)
  })
})
