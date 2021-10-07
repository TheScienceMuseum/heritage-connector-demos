# KG embeddings visualisation

Visualisation of knowledge graph embeddings, projected to 2D via UMAP, created for the Heritage Connector project. 

```
NOTE: this is a direct copy of the single collection visualisation in 3_visualisation with a few parameters modified, as github pages doesn't allow setting of environments.
```

Hosted at [https://thesciencemuseum.github.io/heritage-connector-demos/3_visualisation/index.html](https://thesciencemuseum.github.io/heritage-connector-demos/3_visualisation/index.html).

This implementation uses [D3FC](https://github.com/d3fc/d3fc) and is based on [Colin Berhardt's Hathi Trust demo](https://colineberhardt.github.io/d3fc-webgl-hathi-explorer/#).

## For developers

This visualisation uses a fork of D3FC which adds support for click events. It's bundled into `d3fc.js` from [this branch of the fork](https://github.com/kdutia/d3fc/tree/clicker_new_component).
