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

    // compute the fill color for each datapoint
    const typeFill = d =>
      webglColor(typeColorScale(hashCode(d.type) % 10));
    const yearFill = d => webglColor(yearColorScale(d.year));

    const fillColor = fc.webglFillColor().value(typeFill).data(data);
    pointSeries.decorate(program => fillColor(program));

    // wire up the fill color selector
    iterateElements(".controls a", el => {
      el.addEventListener("click", () => {
        iterateElements(".controls a", el2 => el2.classList.remove("active"));
        el.classList.add("active");
        fillColor.value(el.id === "type" ? typeFill : yearFill);
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
const yearColorScale = d3
  .scaleSequential()
  .domain([1850, 2000])
  .interpolator(d3.interpolateRdYlGn);
const xScale = d3.scaleLinear().domain([-50, 50]);
const yScale = d3.scaleLinear().domain([-50, 50]);
const xScaleOriginal = xScale.copy();
const yScaleOriginal = yScale.copy();

const pointSeries = fc
  .seriesWebglPoint()
  .equals((a, b) => a === b)
  // point size
  .size(8)
  .crossValue(d => d.x)
  .mainValue(d => d.y);

const zoom = d3
  .zoom()
  .scaleExtent([0.8, 100])
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
