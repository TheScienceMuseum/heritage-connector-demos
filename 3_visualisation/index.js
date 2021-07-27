import { seriesSvgAnnotation } from "./annotation-series.js";
import {
  distance,
  trunc,
  hashCode,
  webglColor,
  iterateElements
} from "./util.js";

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
      // year: Number(d.date)
    }))
    .filter(d => d.label);
  data = data.concat(rows);

  if (finished) {
    document.getElementById("loading").style.display = "none";

    // create legend
    const uniqueTypes = data.map(d => d.type).filter(onlyUnique);
    const typeColors = uniqueTypes.map(d => typeColorScale(hashCode(d) % 10));
    var typeColorMapping = uniqueTypes.map(function (x, i) { 
      return {name: x, color: typeColors[i]}
    });
    
    const uniqueCollectionCategories = data.map(d => d.collection_category).filter(onlyUnique);
    const collectionCategoryColors = uniqueCollectionCategories.map(d => typeColorScale(hashCode(d) % 20));
    var collectionCategoryColorMapping = uniqueCollectionCategories.map(function (x, i) { 
      return {name: x, color: collectionCategoryColors[i]}
    });
    
    document.getElementById("legend").innerHTML = createLegend(typeColorMapping);
    // console.log(collectionCategoryColorMapping);

    // compute the fill color for each datapoint
    const typeFill = d =>
      webglColor(typeColorScale(hashCode(d.type) % 10));
    const collectionCategoryFill = d =>
      webglColor(typeColorScale(hashCode(d.collection_category) % 20));
    // const yearFill = d => webglColor(yearColorScale(d.year));

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

const typeColorScale = d3.scaleOrdinal(d3.schemeCategory10);

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

const xScale = d3.scaleLinear().domain([-40, 40]);
const yScale = d3.scaleLinear().domain([-40, 40]);
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
    // document.getElementById("attributeheadertext").innerText = closestDatum.title;
    // document.getElementById("attributetext").innerHTML = "<ul><li><em>Date: </em>" + closestDatum.date + "</li> <li><em>Language: </em>" + closestDatum.language + "</li> <li><em>Author: </em>" + closestDatum.first_author_name + "</li></ul>";
  }

  redraw();
})

const clicker = fc.clicker()
.on("click", ([coord]) => {
  if (!coord || !quadtree) {
    return;
  }
  console.log("click!")
  

  // find the closes datapoint to the pointer
  const x = xScale.invert(coord.x);
  const y = yScale.invert(coord.y);
  const radius = Math.abs(xScale.invert(coord.x) - xScale.invert(coord.x - 20));
  const closestDatum = quadtree.find(x, y, radius);
  // if the closest point is within 20 pixels, show the annotation
  if (closestDatum) {
    document.getElementById("attributepane").style.display = "block"; 
    document.getElementById("attributeheadertext").innerHTML = "<a href='" + closestDatum.id + "' target='_blank'>" + closestDatum.label + "</a>";
    document.getElementById("attributetext").innerHTML = "<ul><li><em>Category: </em>" + closestDatum.collection_category + "</li></ul>";
  }
  
  redraw();
});

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
