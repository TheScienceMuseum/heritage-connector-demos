// Bookmarklet

// http://code.tutsplus.com/tutorials/create-bookmarklets-the-right-way--net-18154

// http://stackoverflow.com/questions/5281007/bookmarklets-which-creates-an-overlay-on-page

var observer = null;

var debug = false;
//debug = true;

// remote
var annotation_url = '//pid-demonstrator.herokuapp.com/api_annotations_for_page.php?uri=';

// local
// annotation_url = '//localhost/~rpage/pid-demonstrator/api_annotations_for_page.php?uri=';

init();

function init() {
    //--------------------------------------------------------------------------------------------------
    // http://code.tutsplus.com/tutorials/create-bookmarklets-the-right-way--net-18154
    // Test for presence of jQuery, if not, add it
    if (!($ = window.jQuery)) { // typeof jQuery=='undefined' works too
        // Create a script tag to load the bookmarklet
        script = document.createElement('script');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js';
        script.onload = openSidebar;
        document.body.appendChild(script);
    }
    else {
        openSidebar();
    }
}

//--------------------------------------------------------------------------------------------------
function closeSidebar(id) {
    $('#' + id).remove();
}


//--------------------------------------------------------------------------------------------------
// annotations?
function show_annotations(uri) {

    var e = $('#pidannotate');

    $.ajax({
        type: "GET",
        url: annotation_url +
            encodeURIComponent(uri),
        success: function (data) {
            console.log(JSON.stringify(data, null, 2));
            
            // TEST DATA
            data = [
                {url: 'url_1', title: 'title_1'},
                {url: 'url_2', title: 'title_2'},
                {url: 'url_3', title: 'title_3'},
            ]

            console.log(data)

            if (data) {
                var html = '<ul>';
                for (var i = 0; i < data.length; i++) {

                    var list_style = 'list-style-type:circle;';

                    if (data[i].favicon) {
                        if (data[i].favicon.match(/\.ico$/)) {
                            // ICO files treated as is
                            list_style = 'list-style-image: url(' + data[i].favicon + ');';
                        } else {
                            // could be a big image (e.g., EJT) so ensure we resize it
                            list_style = 'list-style-image: url(https://aipbvczbup.cloudimg.io/s/height/16/' + data[i].favicon + ');';
                        }
                    }

                    html += '<li style="' + list_style + '">';
                    html += '<a href="' + data[i].url + '">';
                    html += data[i].title;
                    html += '</a>';

                    if (data[i].image) {
                        html += '<div class="pidannotate-image-container">';
                        html += '<div class="pidannotate-image-item">';
                        html += '<img src="https://aipbvczbup.cloudimg.io/s/height/100/' + data[i].image + '">';
                        html += '</div>';
                        html += '</div>';
                    }

                    html += '</li>';
                }
                html += '</ul>';

                e.html(e.html() + html);


            }
        }
    });

}

show_annotations("test_uri")


//--------------------------------------------------------------------------------------------------
function openSidebar() {
    // The Kraken has been released, master!
    // Yes, I'm being childish. Place your code here 
    //alert('kraken');


    var e = null;
    if (!$('#pidannotate').length) {

        // create the element:
        e = $('<div class="pidannotate" id="pidannotate"></div>');

        // append it to the body:
        $('body').append(e);

        var styles = `
    	.pidannotate {
			position:    		fixed;
			top:         		0px;
			right:       		0px;
			width:       		300px;
			height:      		100vh;
			padding:     		20px;
			background-color: 	white;
			color:       		black;
			text-align:  		left;
			font-size:   		12px;
			font-weight: 		normal;
			font-family: 		Helvetica, Arial, sans-serif;
			box-shadow:  		-5px 5px 5px 0px rgba(50, 50, 50, 0.3);
			z-index:     		200000;
			overflow-y:			auto;
    	}
    	
    	.pidannotate h1 {
    		font-size:14px;
    		line-height:18px;
    		font-weight:bold;
    		margin: 4px;
    		font-family: Helvetica, Arial, sans-serif;
    	}
    	
    	.pidannotate h2 {
    		font-size:12px;
    		line-height:14px;
    		font-weight:bold;
    		margin: 4px;
    		font-family: Helvetica, Arial, sans-serif;
    	}
    	    	
    	.pidannotate a {
    		text-decoration:none;
			color:rgb(28,27,168);
    	}   
    	
    	.pidannotate a:hover {
			text-decoration:underline;
		}
		
		.pidannotate-image-container {
			display: flex;
			flex-wrap: wrap;
			padding: 5px;
			justify-content: space-evenly;
			background: rgb(228,228,228); 
			border-radius: 12px;
		}		
		
		.pidannotate-image-item {
			margin: 5px;
			border:1px solid rgb(228,228,228);
			object-fit: cover;
		}	
		
		.pidannotate img {
			height:100px;
		}	
		
		.pidannotate ul {
			margin:0;
   			padding-left:24px;
   			text-indent: 0;
   			list-style-type: 0;
		}

				
    `;

        var styleSheet = document.createElement("style")
        styleSheet.type = "text/css"
        styleSheet.innerText = styles
        document.head.appendChild(styleSheet)

        /*
        // style it:
        e.css({
          position: 'fixed',
          top: '0px',
          right: '0px',
          width: '300px',
          height: '100vh',
          padding: '20px',
          backgroundColor: "white",
          color: 'black',
          'text-align': 'left',
          'font-size': '12px',
          'font-weight': 'normal',
          'font-family': '\'Helvetica Neue\', Helvetica, Arial, sans-serif',
          'box-shadow': '-5px 5px 5px 0px rgba(50, 50, 50, 0.3)',
          'z-index': '200000'
        });
        */

        $('#pidannotate').data("top", $('#pidannotate').offset().top);
    }
    else {
        e = $('#pidannotate');
    }

    var html = '<span style="float:right;" onclick="rdmp_close(\'pidannotate\')">Close [x]</span>';

    // Title
    html += '<h1>' + window.document.title + '</h1>';
    e.html(html);

    // Get identifier(s) from page elements or URL
    // http://stackoverflow.com/questions/7524585/how-do-i-get-the-information-from-a-meta-tag-with-javascript

    var guid = {
        namespace: null,
        identifier: null
    };

    var metas = document.getElementsByTagName('meta');

    for (i = 0; i < metas.length; i++) {

        // Google Scholar tags----------------------------------------------------------------
        if (metas[i].getAttribute("name") == "citation_doi") {
            guid.namespace = 'doi';
            guid.identifier = metas[i].getAttribute("content");

            // NHM WTF
            guid.identifier = guid.identifier.replace(/doi:/, '');

            guid.uri = 'https://doi.org/' + guid.identifier;
        }

        // Dublin Core------------------------------------------------------------------------
        // Taylor and Francis
        if (metas[i].getAttribute("name") == "dc.Identifier") {
            if (metas[i].getAttribute("scheme") == "doi") {
                guid.namespace = 'doi';
                guid.identifier = metas[i].getAttribute("content");
                guid.uri = 'https://doi.org/' + guid.identifier;
            }
        }


        // Open Edition Journals--------------------------------------------------------------
        // https://journals.openedition.org/cve/6886
        if (metas[i].getAttribute("name") == "DC.identifier") {
            if (metas[i].getAttribute("scheme") == "DOI") {
                guid.namespace = 'doi';
                guid.identifier = metas[i].getAttribute("content");
                guid.uri = 'https://doi.org/' + guid.identifier;
            }
        }

        // Ingenta----------------------------------------------------------------------------
        if (metas[i].getAttribute("name") == "DC.identifier") {
            if (metas[i].getAttribute("scheme") == "URI") {
                if (metas[i].getAttribute("content").match(/info:doi\//)) {
                    guid.namespace = 'doi';
                    guid.identifier = metas[i].getAttribute("content");
                    guid.identifier = guid.identifier.replace(/info:doi\//, "");
                    guid.uri = 'https://doi.org/' + guid.identifier;
                }
            }
        }

        // OJS (e.g. EJT)---------------------------------------------------------------------
        if (metas[i].getAttribute("name") == "DC.Identifier.DOI") {
            guid.namespace = 'doi';
            guid.identifier = metas[i].getAttribute("content");
            guid.uri = 'https://doi.org/' + guid.identifier;
        }

        // BHL--------------------------------------------------------------------------------
        if (metas[i].getAttribute("name") == "DC.identifier.URI") {
            var m = metas[i].getAttribute("content").match(/https?:\/\/(?:www.)?biodiversitylibrary.org\/item\/(\d+)/);
            if (m) {
                guid.namespace = 'bhl';
                guid.identifier = m[1];
                guid.uri = 'https://www.biodiversitylibrary.org/item/' + guid.identifier;
            }
        }

        // Facebook og tags ------------------------------------------------------------------
        if (!guid.namespace) {
            if (metas[i].getAttribute("property") == "og:url") {
                var url = metas[i].getAttribute("content");

                // GBIF
                if (url.match(/gbif.org\/occurrence/)) {
                    guid.namespace = 'occurrence';
                    guid.url = url;
                    guid.identifier = guid.url.replace(/https?:\/\/(www\.)?gbif.org\/occurrence\//, '');
                }

                // ALA
                if (url.match(/bie.ala.org.au\/species\/urn:lsid/)) {
                    guid.namespace = 'ala';
                    guid.url = url;
                    guid.identifier = guid.url.replace(/https?:\/\/bie.ala.org.au\/species\//, '');
                }

                // NHMUK
                if (url.match(/data.nhm.ac.uk\/object/)) {
                    guid.namespace = 'nhmuk';
                    guid.uri = url;
                    guid.identifier = guid.uri.replace(/https?:\/\/data.nhm.ac.uk\/object\//, '');
                }

                // BL
                if (url.match(/access.bl.uk\/item\/viewer\/ark/)) {

                    guid.namespace = 'ark';
                    guid.uri = url;
                    guid.identifier = guid.uri.replace(/https?:\/\/access.bl.uk\/item\/viewer\/ark:\//, '');
                }

            }
        }

    }

    // No GUID from meta tags, try other rules
    if (!guid.namespace) {

        // canonical link---------------------------------------------------------------------
        // <link rel="canonical" href="https://www.jstor.org/stable/24532712">
        var elements = document.querySelectorAll('link[rel="canonical"]');
        for (i = 0; i < elements.length; i++) {
            guid.namespace = 'uri';
            guid.identifier = elements[i].getAttribute("href");
            guid.uri = guid.identifier;
        }

    }

    /*
    // 	<link rel="alternate" type="text/n3" href="https://data.nhm.ac.uk/object/31a84c68-6295-4e5b-aa0a-5c2844f1fb50.n3">
    if (!guid.namespace) {
      var elements = document.querySelectorAll('link[rel="alternate"]');
      for (i = 0; i < elements.length; i++) {
          if (elements[i].getAttribute('type') == 'text/n3') {
            guid.namespace = 'uri';
            guid.identifier = elements[i].getAttribute("href");
            guid.identifier = guid.identifier.replace(/\.n3/, '');
          }
      }
    }
   */

    // Still nothing, let's get more specific (and dive into the HTML)
    if (!guid.namespace) {

        // RBGE-------------------------------------------------------------------------------
        var elements = document.querySelectorAll('[alt="Stable URI"]');
        for (i = 0; i < elements.length; i++) {
            guid.namespace = 'uri';
            guid.identifier = elements[i].getAttribute("href");
            // HTTPS
            guid.identifier = guid.identifier.replace("http:", "https:");
            guid.uri = guid.identifier;
        }


    }

    if (!guid.namespace) {

        // IPNI-------------------------------------------------------------------------------
        var elements = document.querySelectorAll('dl dd');
        for (i = 0; i < elements.length; i++) {
            var text = elements[i].textContent;
            if (text.match(/urn:lsid/)) {
                guid.namespace = 'ipni';
                guid.identifier = text;
                guid.uri = guid.identifier;
            }
        }

    }

    if (!guid.namespace) {

        // GenBank----------------------------------------------------------------------------
        var elements = document.querySelectorAll('p[class="itemid"]');
        for (i = 0; i < elements.length; i++) {
            var text = elements[i].textContent;
            var m = text.match(/GenBank:\s+([A-Z]+\d+)(\.\d+)$/);
            if (m) {
                guid.namespace = 'genbank';
                guid.identifier = m[1];
                guid.uri = 'https://www.ncbi.nlm.nih.gov/nuccore/' + guid.identifier;
            }
        }

    }

    if (!guid.namespace) {

        // Kew--------------------------------------------------------------------------------
        var elements = document.querySelectorAll('div[id=downloadButtonsDetails] a');
        for (i = 0; i < elements.length; i++) {
            var url = elements[i].href;
            var m = url.match(/barcode=(.*)$/);
            if (m) {
                guid.namespace = 'uri';
                guid.identifier = m[1];
                guid.uri = 'http://specimens.kew.org/herbarium/' + guid.identifier;
            }
        }

    }

    if (!guid.namespace) {

        // Meise------------------------------------------------------------------------------
        var elements = document.querySelectorAll('md-card-actions a');
        for (i = 0; i < elements.length; i++) {
            var url = elements[i].href;
            var m = url.match(/specimen\/(.*)\/rdf/);
            if (m) {
                guid.namespace = 'uri';
                guid.identifier = m[1];
                guid.uri = 'https://www.botanicalcollections.be/specimen/' + guid.identifier;
            }
        }

    }



    // Still no GUID, use page URL
    if (!guid.namespace) {
        // Last resort use URL...
        // var pattern = /gbif.org\/occurrence\/(\d+)/;	
        // var m  = pattern.exec(window.location.href);

        // Smithsonian specimen (via URL)
        var pattern = /ark=ark:\/(.*)/;
        var m = pattern.exec(window.location.href);
        if (m) {
            guid.namespace = 'ark';
            guid.identifier = m[1];

            // Not actually a UUID as these are 9-4-4-4-12 and a UUID is 8-4-4-4-12 FFS

            // 3715cc0ec8f0244ba8bd700371fae6ab9
            // 3715cc0ec-8f02-44ba-8bd7-00371fae6ab9

            // 65665/3715cc0ec8f0244ba8bd700371fae6ab9

            var uuid = '';
            uuid += guid.identifier.substring(0, 15);
            uuid += '-' + guid.identifier.substring(15, 19);
            uuid += '-' + guid.identifier.substring(19, 23);
            uuid += '-' + guid.identifier.substring(23, 27);
            uuid += '-' + guid.identifier.substring(27);

            console.log(uuid);

            guid.uri = 'http://n2t.net/ark:/' + uuid;

        }

        if (!guid.namespace) {

            // Google Books (Google are such hypocrites when it comes to web standards)
            // [0-9A-Za-z_\-]{12}

            pattern = /google(.*)(id=|\/)([0-9A-Za-z_\-]{12})\b/;
            m = pattern.exec(window.location.href);
            if (m) {
                guid.namespace = 'google';
                guid.identifier = m[3];
                guid.uri = 'https://books.google.com/books?id=' + guid.identifier;

                guid.uri = window.location.href;
            }
        }

        if (!guid.namespace) {

            // /URKEDwAAQBAJ?hl=en

            pattern = /google(.*)\/([0-9A-Za-z_\-]{12})\?/;
            m = pattern.exec(window.location.href);
            if (m) {
                guid.namespace = 'google';
                guid.identifier = m[2];
                guid.uri = 'https://books.google.com/books?id=' + guid.identifier;

                guid.uri = window.location.href;
            }
        }




    }

    console.log(JSON.stringify(guid, null, 2));

    //--------------------------------------------------------------------------------------
    // Now we (might) have an identifier, what can we do with it?

    // 1. display entity
    // 2. List of linked entities (data feed)

    if (guid.namespace) {

        var h = '<p>PID ' + guid.namespace + ':' + guid.identifier + '</p>';
        e.html(e.html() + h);

        // e.html(e.html() + "<h2>Links</h2>");

        switch (guid.namespace) {

            case 'bhl':
                // BHL pages can change as user browses content, so we use a MutationObserver
                // to track current PageID, so that we could then display annotations relevant
                // to the page being displayed.

                if (debug) {
                    e.html(e.html() + JSON.stringify(guid, null, 2));
                }

                var html = '<div id="bhl_page"></div><div id="bhl_links"></div>';
                e.html(e.html() + '<br />' + html);

                var currentpageURL = document.querySelector('[id=currentpageURL]');

                document.getElementById('bhl_page').innerHTML = currentpageURL;

                show_annotations(currentpageURL, true);

                // https://stackoverflow.com/questions/41424989/javascript-listen-for-attribute-change
                observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        if (mutation.type == "attributes") {
                            var currentpageURL = document.querySelector('[id=currentpageURL]');
                            document.getElementById('bhl_page').innerHTML = currentpageURL;
                            document.getElementById('bhl_links').innerHTML = "";
                            console.log("attributes changed")

                            show_annotations(currentpageURL, true);

                        }
                    });
                });

                observer.observe(currentpageURL, {
                    attributes: true //configure it to listen to attribute changes
                });
                break;

            /*
                  case 'occurrence':
                    $.getJSON('//api.gbif.org/v1/occurrence/' + guid.identifier + '?callback=?',
                      function(data) {
                        if (data.key == guid.identifier) {
                          var html = '<div style="text-align:left;">';
                          html += '<div>' + data.institutionCode + ' ' + data.catalogNumber + '</div>';
            
                          if (data.decimalLongitude && data.decimalLatitude) {
                            html += '<span>[' + data.decimalLatitude + ',' + data.decimalLongitude + ']</span>' + '<br />';
                            html += '<img width="100" src="https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s(' + data.decimalLongitude + ',' + data.decimalLatitude + ')/' + data.decimalLongitude + ',' + data.decimalLatitude + ',2/100x100@2x?access_token=pk.eyJ1IjoicmRtcGFnZSIsImEiOiJjajJrdmJzbW8wMDAxMnduejJvcmEza2k4In0.bpLlN9O6DylOJyACE8IteA">';
                          }
            
                          if (data.media) {
                            for (var i in data.media) {
                              html += '<img src="http://exeg5le.cloudimg.io/s/height/100/' + data.media[i].identifier + '" height="100">';
                            }
                          }
            
                          html += '</div>';
                          e.html(e.html() + html);
                        }
                      });
                    break;
            */

            case 'ark':
            case 'doi':
            case 'nhmuk':
            default:
                if (debug) {
                    e.html(e.html() + JSON.stringify(guid, null, 2));
                }
                show_annotations(guid.uri);

                break;
        }


    }

}

//----------------------------------------------------------------------------------------
/* Can't use jquery at this point because it might not have been loaded yet */
// https://stackoverflow.com/a/17494943/9684

var startProductBarPos = -1;

window.onscroll = function () {
    var bar = document.getElementById('pidannotate');
    if (startProductBarPos < 0) startProductBarPos = findPosY(bar);

    if (pageYOffset > startProductBarPos) {
        bar.style.position = 'fixed';
        bar.style.top = 0;
    }
    else {
        bar.style.position = 'fixed';
    }

};

function findPosY(obj) {
    var curtop = 0;
    if (typeof (obj.offsetParent) != 'undefined' && obj.offsetParent) {
        while (obj.offsetParent) {
            curtop += obj.offsetTop;
            obj = obj.offsetParent;
        }
        curtop += obj.offsetTop;
    }
    else if (obj.y)
        curtop += obj.y;
    return curtop;
}