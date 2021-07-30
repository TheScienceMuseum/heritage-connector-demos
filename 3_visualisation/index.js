import { seriesSvgAnnotation } from "./annotation-series.js";
import {
  distance,
  trunc,
  hashCode,
  webglColor,
  iterateElements
} from "./util.js";

// SET ME TO FALSE BEFORE PUSHING
const debug = false;

if (debug) {
  // local debugging
  var api_url = 'http://localhost:8010';
} else {
  // remote: deployed
  var api_url = 'https://d0rgkq.deta.dev';
}

const predicatesToIgnoreInAttributePane = [
  "HC:database",
  "RDFS:label",
  "XSD:description",
  "WDT:P646",
  "WDT:P18",
  "WDT:P217", // inventory number
  "WDT:P729", // service entry
  "WDT:P2802", // fleet or registration number
  "WDT:P2598", // serial number
  "WDT:P2598", // serial number
  // External IDs
  "WDT:3074",
  "WDT:P214",
  "WDT:P244",
  "WDT:P646",
  "WDT:P2067",
  "WDT:P2741",
  "WDT:P6764",
  "WDT:P2703",
  "WDT:P4326",
  "WDT:P4438",
  "WDT:P8565",
  "WDT:P1711",
  "WDT:P1816",
  "WDT:P9144",
  "WDT:P1367",
  // TODO: add more to here from list, and comment what each of them are
]

let data = [];
let quadtree;

const createAnnotationData = datapoint => ({
  note: {
    label: datapoint.collection_category,
    bgPadding: 5,
    title: trunc(datapoint.label, 100)
  },
  x: datapoint.x,
  y: datapoint.y,
  dx: 20,
  dy: 20
});

// create a web worker that streams the chart data
const streamingLoaderWorker = new Worker("streaming-tsv-parser.js");
streamingLoaderWorker.onmessage = ({
  data: { items, totalBytes, finished }
}) => {
  const rows = items
    .map(d => ({
      ...d,
      x: Number(d.x),
      y: Number(d.y),
    }))
    .filter(d => d.label);
  data = data.concat(rows);

  if (finished) {
    document.getElementById("loading").style.display = "none";

    // create legend
    const uniqueTypes = data.map(d => d.type).filter(onlyUnique);
    const typeColors = uniqueTypes.map(d => categoricalColorScale(hashCode(d) % 10));
    var typeColorMapping = uniqueTypes.map(function (x, i) { 
      return {name: x, color: typeColors[i]}
    });
    
    const uniqueCollectionCategories = data.map(d => d.collection_category).filter(onlyUnique);
    const collectionCategoryColors = uniqueCollectionCategories.map(d => categoricalColorScale(hashCode(d) % 20));
    var collectionCategoryColorMapping = uniqueCollectionCategories.map(function (x, i) { 
      return {name: x, color: collectionCategoryColors[i]}
    });
    
    document.getElementById("legend").innerHTML = createLegend(typeColorMapping);

    // compute the fill color for each datapoint
    const typeFill = d =>
      webglColor(categoricalColorScale(hashCode(d.type) % 10));
    const collectionCategoryFill = d =>
      webglColor(categoricalColorScale(hashCode(d.collection_category) % 20));

    const fillColor = fc.webglFillColor().value(typeFill).data(data);
    pointSeries.decorate(program => fillColor(program));

    // wire up the fill color selector
    iterateElements(".controls a", el => {
      el.addEventListener("click", () => {
        iterateElements(".controls a", el2 => el2.classList.remove("active"));
        el.classList.add("active");
        fillColor.value(el.id === "type" ? typeFill : collectionCategoryFill);
        document.getElementById("legend").innerHTML = (el.id == "type") ? createLegend(typeColorMapping) : createLegend(collectionCategoryColorMapping.slice(0,10));
        redraw();
      });
    });

    // create a spatial index for rapidly finding the closest datapoint
    quadtree = d3
      .quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(data);
    
  }

  redraw();
};
streamingLoaderWorker.postMessage("visualisation_data_n_neighbours_10.tsv");

const categoricalColorScale = d3.scaleOrdinal(d3.schemeCategory10);

function entity(character) {
  return `&#${character.charCodeAt(0).toString()};`;
}

function createLegend(
  nameColorMapping,
  columns = null,
  swatchSize = 15,
  swatchWidth = swatchSize,
  swatchHeight = swatchSize,
  marginLeft = 0
) {
  const id = "legend-element";

  if (columns !== null) return `<div style="display: flex; align-items: center; margin-left: ${+marginLeft}px; min-height: 33px; font: 10px sans-serif;">
    <style>
      .${id}-item {
        break-inside: avoid;
        display: flex;
        align-items: center;
        padding-bottom: 1px;
      }

      .${id}-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(100% - ${+swatchWidth}px - 0.5em);
      }

      .${id}-swatch {
        width: ${+swatchWidth}px;
        height: ${+swatchHeight}px;
        margin: 0 0.5em 0 0;
      }
    </style>
    <div style="width: 100%; columns: ${columns};">${nameColorMapping.map(value => {
      const label = value.name;
      return `<div class="${id}-item">
        <div class="${id}-swatch" style="background:${value.color};"></div>
        <div class="${id}-label" title="${label.replace(/["&]/g, entity)}">${label}</div>
      </div>`;
    })}
    </div>
  </div>`;

  return `<div style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;">
    <style>

  .${id} {
    display: inline-flex;
    align-items: center;
    margin-right: 1em;
    color: rgb(180, 180, 180);
  }

  .${id}::before {
    content: "";
    width: ${+swatchWidth}px;
    height: ${+swatchHeight}px;
    margin-right: 0.5em;
    background: var(--color);
  }

  </style>
  <div>${nameColorMapping.map(value => `<span class="${id}" style="--color: ${value.color}">${value.name}</span>`).join("")}</div>`;
}

const xScale = d3.scaleLinear().domain([-35, 35]);
const yScale = d3.scaleLinear().domain([-35, 35]);
const xScaleOriginal = xScale.copy();
const yScaleOriginal = yScale.copy();

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const pointSeries = fc
  .seriesWebglPoint()
  .equals((a, b) => a === b)
  // point size
  .size(8)
  .crossValue(d => d.x)
  .mainValue(d => d.y);

const zoom = d3
  .zoom()
  .scaleExtent([1, 100])
  .on("zoom", (event) => {
    // update the scales based on current zoom
    xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
    yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());
    redraw();
  });

const annotations = [];

const pointer = fc.pointer()
.on("point", ([coord]) => {
  annotations.pop();

  if (!coord || !quadtree) {
    return;
  }

  // find the closes datapoint to the pointer
  const x = xScale.invert(coord.x);
  const y = yScale.invert(coord.y);
  const radius = Math.abs(xScale.invert(coord.x) - xScale.invert(coord.x - 20));
  const closestDatum = quadtree.find(x, y, radius);

  // if the closest point is within 20 pixels, show the annotation
  if (closestDatum) {
    annotations[0] = createAnnotationData(closestDatum);
  }

  redraw();
})

const clicker = fc.clicker()
.on("click", ([coord]) => {
  if (!coord || !quadtree) {
    return;
  }  

  // find the closes datapoint to the pointer
  const x = xScale.invert(coord.x);
  const y = yScale.invert(coord.y);
  const radius = Math.abs(xScale.invert(coord.x) - xScale.invert(coord.x - 20));
  const closestDatum = quadtree.find(x, y, radius);
  // if the closest point is within 20 pixels, show the annotation
  if (closestDatum) {
    document.getElementById("attributepane-container").appendChild(createAttributePane(closestDatum));
  }
  
  redraw();
});


function createAttributePane(closestDatum) {
  let attributePane = document.createElement("div");
  let attributeHeadertext = document.createElement("div");
  let attributeText = document.createElement("div");
  
  let currentNumPanes = document.getElementsByClassName("attributepane").length;

  attributePane.classList.add("attributepane");
  attributePane.id = "pane-" + closestDatum.id
  attributeHeadertext.classList.add("attributeheadertext");
  attributeText.classList.add("attributetext");
  
  attributePane.innerHTML = `<span style="float:right; font-size:0.8em;" onclick="closeAttributePane('${attributePane.id}')">[x]</span>`
  attributeHeadertext.innerHTML = "<a href='" + closestDatum.id + "' target='_blank'>" + closestDatum.label + "</a>";
  updateAttributePaneDetailsHTML(closestDatum);
  
  attributePane.appendChild(attributeHeadertext);
  attributePane.appendChild(attributeText);

  if (currentNumPanes === 0) {
    // also add a [close all] buttom
    let closeAllButton = document.createElement("div")
    closeAllButton.id = "close-all-button";
    closeAllButton.innerHTML = `<span style="float:right; font-size:0.8em; color:rgb(180, 180, 180)" onclick="closeAllAttributePanes()">[close all]</span>`;
    attributePane.appendChild(closeAllButton);
  }
  
  return attributePane
}

function updateAttributePaneDetailsHTML(closestDatum) {
  // update attribute pane inner HTML with connections
  getConnections(closestDatum.id).then(data => {
    const connectionsTo = data[closestDatum.id].to;
    const connectionsFrom = data[closestDatum.id].from;
    var connectionToFound = false;
    var connectionFromFound = false;
    
    let html = "(" + closestDatum.collection_category + ")"
    let tempHTML = html + "</br> connections loading..."

    document.getElementById(`pane-${closestDatum.id}`).getElementsByClassName('attributetext')[0].innerHTML = tempHTML;
    
    if (connectionsTo.length > 0) {
      var connectionsToHTMLList = "<em>connections to this item:</em> <ul>";
      connectionsTo.forEach(c => {
        let abbrevPredicate = abbreviateURI(c.predicate.value);
        if (!predicatesToIgnoreInAttributePane.includes(abbrevPredicate)) {
          connectionToFound = true;
          if (c.subjectLabel) {
            connectionsToHTMLList += `<li><a href='${c.subject.value}' target='_blank'>${c.subjectLabel.value}</a></li> → ${abbrevPredicate} → this`;
          } else if (c.subject.type === "uri") {
            connectionsToHTMLList += `<li><a href='${c.subject.value}' target='_blank'>${abbreviateURI(c.subject.value)}</a></li> → ${abbrevPredicate} → this`;
          } else {
            connectionsToHTMLList += `<li>${c.subject.value} → ${abbrevPredicate} → this</li>`;
          }
        }
      })
      connectionsToHTMLList += "</ul>";
    }
    
    if (connectionsFrom.length > 0) {
      var connectionsFromHTMLList = "<em>connections from this item:</em> <ul>";
      connectionsFrom.forEach(c => {
        let abbrevPredicate = abbreviateURI(c.predicate.value);
        if (!predicatesToIgnoreInAttributePane.includes(abbrevPredicate)) {
          connectionFromFound = true;
          if (c.objectLabel) {
            connectionsFromHTMLList += `<li>this → ${abbrevPredicate} → <a href='${c.object.value}' target='_blank'>${c.objectLabel.value} </a></li>`;
          } else if (c.object.type === "uri") {
            connectionsFromHTMLList += `<li>this → ${abbrevPredicate} → <a href='${c.object.value}' target='_blank'>${abbreviateURI(c.object.value)}</a></li>`;
          } else {
            connectionsFromHTMLList += `<li>this → ${abbrevPredicate} → ${c.object.value}</li>`;
          }
        }
      })
      connectionsFromHTMLList += "</ul>";
    }

    if (connectionToFound | connectionFromFound) {
      html += "</br> <details> <summary>show connections</summary>";
      if (connectionToFound) {html += `<p>${connectionsToHTMLList}</p>`};
      if (connectionFromFound) {html += `<p>${connectionsFromHTMLList}</p>`};
      html += "</details>";
    }

    document.getElementById(`pane-${closestDatum.id}`).getElementsByClassName('attributetext')[0].innerHTML = html;
  })
}

async function getConnections(url) {
  // get connections in graph for entity with url `url`.

  var data = {
    "entities": [url],
    "labels": true
  }

  const response = await fetch(api_url.concat('/connections'), {
      method: 'POST',
      mode: (debug) ? 'same-origin' : 'cors',
      headers: {'Content-Type': 'application/json'},      
      body: JSON.stringify(data)
  })

  return response.json();
}

function abbreviateURI(uri) {
  for (const [key, value] of Object.entries(predicateAbbreviationMapping)) {
      if (uri.startsWith(key)) {
          return value + ':' + uri.replace(key, '')
      }
  }

  return uri
}

const predicateAbbreviationMapping = {
  'http://www.w3.org/2000/01/rdf-schema#': 'RDFS',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'RDF',
  'http://www.w3.org/2004/02/skos/core#': 'SKOS',
  'http://www.w3.org/2001/XMLSchema#': 'XSD',
  'http://xmlns.com/foaf/0.1/': 'FOAF',
  'http://www.w3.org/2002/07/owl#': 'OWL',
  'http://www.w3.org/ns/prov#': 'PROV',
  'https://schema.org/': 'SDO',
  'http://www.wikidata.org/entity/': 'WD',
  'http://www.wikidata.org/prop/direct/': 'WDT',
  'http://www.heritageconnector.org/RDF/': 'HC',
  'https://collection.sciencemuseumgroup.org.uk/people/': 'SMGP',
  'https://collection.sciencemuseumgroup.org.uk/objects/': 'SMGO',
  'https://collection.sciencemuseumgroup.org.uk/documents/': 'SMGD',
  'https://blog.sciencemuseum.org.uk/': 'SMGBLOG',
  'http://journal.sciencemuseum.ac.uk/browse/': 'SMGJOURNAL',
}


const annotationSeries = seriesSvgAnnotation()
  .notePadding(15)
  .type(d3.annotationCallout);

const chart = fc
  .chartCartesian(xScale, yScale)
  .webglPlotArea(
    // only render the point series on the WebGL layer
    fc
      .seriesWebglMulti()
      .series([pointSeries])
      .mapping(d => d.data)
  )
  .svgPlotArea(
    // only render the annotations series on the SVG layer
    fc
      .seriesSvgMulti()
      .series([annotationSeries])
      .mapping(d => d.annotations)
  )
  .decorate(sel =>
    sel
      .enter()
      .select("d3fc-svg.plot-area")
      .on("measure.range", (event) => {
        xScaleOriginal.range([0, event.detail.width]);
        yScaleOriginal.range([event.detail.height, 0]);
      })
      .call(zoom)
      .call(pointer)
      .call(clicker)
  );
  
// render the chart with the required data
// Enqueues a redraw to occur on the next animation frame
const redraw = () => {
  d3.select("#chart").datum({ annotations, data }).call(chart);
};
