<script>
  import Typeahead from "svelte-typeahead";
  let data = [];
  const streamingLoaderWorker = new Worker("streaming-tsv-parser.js");
  streamingLoaderWorker.onmessage = ({
    data: { items, totalBytes, finished }
  }) => {
    const rows = items
    .map(d => ({
      id: d.id,
      label: d.label,
      type: d.type,
    }))
    .filter(d => d.label);
    data = data.concat(rows);

    if (finished) {
      console.log("finished loading data")
    }
  }
  streamingLoaderWorker.postMessage("data.tsv");
	
	let events = [];
</script>

<Typeahead
  placeholder={`Search Heritage Connector`}
  hideLabel
  data={data}
  extract={(item) => item.label}
  on:select={({ detail }) => {
	  events = [...events, JSON.stringify(detail, null, 2)]
  }}
	on:clear={() => {
	  events = [...events, "clear"]
	}} />

{#each events as e}
  <div><pre>{e}</pre></div>
{/each}
	
<style>:global([role="listbox"]) { margin: 0; }</style>
