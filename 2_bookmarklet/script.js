// Bookmarklet

const bookmarkletTitle = 'Heritage Connector - connections found' //window.document.title

// SET ME TO FALSE BEFORE PUSHING
const debug = false;

var maxItemsToDisplayPerPredicate = 30;
var numSimilarItemsToDisplay = 20;

if (debug) {
    // local debugging
    var api_url = 'http://localhost:8010';
    var pageURI = 'http://collections.vam.ac.uk/item/O1165404/poster/';
} else {
    // remote: deployed
    var api_url = 'https://d0rgkq.deta.dev';
    var pageURI = window.location.href
}

var sheetsReviewURL = 'https://docs.google.com/spreadsheets/d/1nc10D5UwBDrEKXOkSJ440EjsvWjqqw5vq-1cG5cM_fw/edit#gid=0'

pageURI = normalizeSMGCollectionURL(pageURI);
pageURI = normalizeVANDACollectionURL(pageURI);
openSidebar();
show_annotations(pageURI);

//--------------------------------------------------------------------------------------------------
function closeSidebar(id) {
    document.getElementById(id).remove();
}

//--------------------------------------------------------------------------------------------------

async function getPredicateObjectFromAPI(url) {
    const response = await fetch(api_url.concat('/predicate_object/by_uri?labels=true&uri=', url), {
        method: 'POST',
        mode: (debug) ? 'same-origin' : 'cors'
    })

    return response.json();
}

async function getNearestNeighboursFromAPI(url, k) {

    var data = {
        "entities": [url],
        "k": k
    }

    const response = await fetch(api_url.concat('/neighbours'), {
        method: 'POST',
        mode: (debug) ? 'same-origin' : 'cors',
        headers: {'Content-Type': 'application/json'},      
        body: JSON.stringify(data)
    })

    return response.json();
}

async function getLabelsFromAPI(urls) {
    var data = {
        "uris": urls
    }

    const response = await fetch(api_url.concat('/labels'), {
        method: 'POST',
        mode: (debug) ? 'same-origin' : 'cors',
        headers: {'Content-Type': 'application/json'},      
        body: JSON.stringify(data)
    })

    return response.json()

}

function show_annotations(uri) {

    getPredicateObjectFromAPI(uri)
        .then(data => {
            const gbPredicate = groupBy(data, item => item.predicate.value, abbreviateURI)
            var html = '';

            // TODO: iterate through list of manually ordered predicates instead, so we can split them

            for (const [groupName, predicates] of Object.entries(predicateManualGroups)) {
                // html += "<div class='predicategroup'>"
                html += '<h2>' + groupName + '</h2>'
                html += '<ul>'

                predicates.forEach(function(predicate) {
                    if (gbPredicate.get(predicate)) {
                        if (gbPredicate.get(predicate).length > maxItemsToDisplayPerPredicate) {
                            html += '<h3>' + abbreviateURI(predicate) + ' (' + gbPredicate.get(predicate).length + ' total, ' + maxItemsToDisplayPerPredicate + ' shown)</h3>';
                        } else {
                            html += '<h3>' + abbreviateURI(predicate) + '</h3>';
                        }
                        gbPredicate.get(predicate).slice(0, maxItemsToDisplayPerPredicate).forEach(function(obj) {
                            html += '<li>';
                            if (obj.object.type == 'uri') {
                                if (obj.objectLabel) {
                                    html += '<a href="' + obj.object.value + '">' + obj.objectLabel.value + ' [' + abbreviateURI(obj.object.value) + ']' + '</a>'
                                    html += ' <a id="" target="_blank" href="' + getConnectionsPageForURL(obj.object.value) + '"></a>'
                                } else {
                                    html += '<a href="' + obj.object.value + '">' + abbreviateURI(obj.object.value) + '</a>'
                                    html += ' <a id="" target="_blank" href="' + getConnectionsPageForURL(obj.object.value) + '"></a>'
                                }
                            } else {
                                html += obj.object.value
                            }
                            html += '</li>'
                        })
                    };
                })
                html += '</ul> <hr>'
            }
            
            document.getElementById("pidannotate").innerHTML += html
        });

    getNearestNeighboursFromAPI(uri, numSimilarItemsToDisplay)
        .then(data => {
            
            const neighbours = data[uri].map(x => x[0]);
            // in JS to round to 2 d.p. we have to multiply by 100, round to integer, then divide by 100!
            const neighbourURIs = neighbours.filter(x => x.startsWith("http"));
            getLabelsFromAPI(neighbourURIs).then(labelMapping => {
                // ** THIS CODE DISPLAYS A LIST OF MOST SIMILAR ITEMS, NOT GROUPED IN ANY WAY **
                // var html = '<h2>' + numSimilarItemsToDisplay + ' most similar items (similarity)</h2> <ul>';
                
                // data[uri].forEach(item => {
                    //     html += '<li>';
                    
                    //     var similarity = Math.round((1-item[1])*100)/100
                    
                    //     if (labelMapping[item[0]]) {
                        //         // there is a label
                        //         // console.log(item[0], labelMapping[item[0]], item[1])
                        //         html += '<a href="' + item[0] + '">' + labelMapping[item[0]] + ' [' + abbreviateURI(item[0]) + ']</a> (' + similarity + ')'
                        //     } else {
                            //         // console.log("no label", item[0], item[1])
                            //         html += '<a href="' + item[0] + '">' + abbreviateURI(item[0]) + '</a> [' + similarity + ']'
                            //     }
                            //     html += '</li>'
                            // })
                            // html += '</ul> <hr>'
                            // document.getElementById("pidannotate").innerHTML += html
                
                // *****************************************************************************

                // ** THIS CODE DISPLAYS A LIST OF MOST SIMILAR ITEMS GROUPED BY TYPE (BASED ON RDF PREFIX)**
                data[uri].forEach((d) => {
                    if (d[0].startsWith('http')) {
                        d.push(abbreviateURI(d[0]).split(':')[0]);
                    } else {
                        d.push('LITERAL');
                    }
                })
                var neighboursGroupedByPrefix = groupBy(data[uri], item => item[2]);
                console.log(neighboursGroupedByPrefix);
                var html = '<h2>' + numSimilarItemsToDisplay + ' most similar items by type (similarity)</h2> <ul>';
                neighboursGroupedByPrefix.forEach((neighbourList, prefix) => {
                    html += `<h3>${prefixToPrettyName[prefix]}</h3>`;
                    neighbourList.forEach(item => {
                        html += '<li>'
                        var similarity = Math.round((1-item[1])*100)/100
                        
                        if (labelMapping[item[0]]) {
                            // there is a label
                            // console.log(item[0], labelMapping[item[0]], item[1])
                            html += '<a href="' + item[0] + '">' + labelMapping[item[0]] + ' [' + abbreviateURI(item[0]) + ']</a> (' + similarity + ')'
                            html += ' <a id="" target="_blank" href="' + getConnectionsPageForURL(item[0]) + '"></a>'
                        } else {
                            // console.log("no label", item[0], item[1])
                            html += '<a href="' + item[0] + '">' + abbreviateURI(item[0]) + '</a> [' + similarity + ']'
                            html += ' <a id="" target="_blank" href="' + getConnectionsPageForURL(item[0]) + '"></a>'
                        }
                        html += '</li>';
                    })
                    // html += '</br>';
                })
                html += '</ul> <hr>';
                document.getElementById("pidannotate").innerHTML += html
            });
        })

}

const prefixToPrettyName = {
    "SMGBLOG": "SMG Blog",
    "SMGJOURNAL": "SMG Journal",
    "SMGP": "SMG Person/Organisation",
    "SMGO": "SMG Object",
    "SMGD": "SMG Archival Document",
    "WD": "Wikidata Entity",
    "LITERAL": "Literal",
}

function getConnectionsPageForURL(url) {
    // get the API's /view_connections page for a URL

    return `${api_url}/view_connections?entity=${url}`
}


//--------------------------------------------------------------------------------------------------
function openSidebar() {
    if (!debug) {
        let sidebar = document.createElement("div")
        sidebar.setAttribute("id", "pidannotate");
        sidebar.setAttribute("class", "pidannotate");

        document.body.appendChild(sidebar)
    }
    var html = '<span style="float:right;" onclick="closeSidebar(\'pidannotate\')">Close [x]</span>';

    // Title
    html += '<h1>' + bookmarkletTitle + '</h1>';
    html += '<a style="margin: 0 4px" href=' + sheetsReviewURL + '" target="_blank">' + 'Log interesting/incorrect connections (HC team)</a>'
    html += '<hr>'
    document.getElementById('pidannotate').innerHTML = html;

}

function groupBy(list, keyGetter, keyModifier=null) {
    const map = new Map();
    list.forEach((item) => {
         var key = keyGetter(item);
         if (keyModifier) {key = keyModifier(key);};
         const collection = map.get(key);
         if (!collection) {
             map.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    return map;
}

function abbreviateURI(uri) {
    for (const [key, value] of Object.entries(predicateAbbreviationMapping)) {
        if (uri.startsWith(key)) {
            return value + ':' + uri.replace(key, '')
        }
    }

    return uri
}

const predicateManualGroups = {
    "Existing record metadata": [
        "RDFS:label",
        "HC:database",
        "RDF:type",
        "SKOS:hasTopConcept",
        "SDO:isPartOf",
        "XSD:additionalType",
        "SDO:birthDate",
        "SDO:deathDate",
        "SDO:birthPlace",
        "SDO:deathPlace",
        "SDO:hasOccupation",
        "SDO:nationality",
        "SDO:addressCountry",
        "SDO:foundingDate",
        "SDO:dissolutionDate",
        "SDO:material",
        "SDO:dateCreated",
        "SDO:author",
        "SDO:genre",
        "SDO:keywords",
        "SDO:identifier",
    ],
    "Existing links to other pages": [
        "SDO:mentions",
        "FOAF:maker",
        "FOAF:made",
        "SKOS.related",
    ],
    "sameAs/similar links": [
        "SKOS.relatedMatch",
        "OWL:sameAs",
    ],
    "From NER & NEL": [
        "HC:entityPERSON",
        "HC:entityORG",
        "HC:entityNORP",
        "HC:entityFAC",
        "HC:entityLOC",
        "HC:entityOBJECT",
        "HC:entityLANGUAGE",
        "HC:entityDATE",
        "HC:entityEVENT",
    ]
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
    'https://api.vam.ac.uk/v2/objects/search?id_organisation=': 'VAMORG',
    'https://api.vam.ac.uk/v2/objects/search?id_person=': 'VAMPERSON',
    'http://collections.vam.ac.uk/item/': 'VAMOBJECT',
    'https://api.vam.ac.uk/v2/objects/search?id_material=': "VAMMATERIAL",
    'https://api.vam.ac.uk/v2/objects/search?id_technique=': "VAMTECHNIQUE",  
}

function normalizeSMGCollectionURL(url) {
    // remove anything after cp/co/cd/aa-ID from the collection URL
    // if the URL is not a collection URL then it returns the original URL
    const regex = /https:\/\/(?:collection\.sciencemuseum).(?:\w.+)\/(?:co|cd|cp|aa)(?:\d+)/g
    if ((url.match(regex)) && (url.match(regex).length == 1)) {
        return url.match(regex)[0]
    } else {
        return url
    }
}

function normalizeVANDACollectionURL(url) {
    // remove anything after the ID from the collection URL. Also change from https to http.
    // if the URL is not a collection URL then it returns the original URL.
    const regex = /http:\/\/collections.vam.ac.uk\/item\/[A-Za-z\d]+/g
    const httpUrl = url.replace("https", "http")

    if ((httpUrl.match(regex)) && (httpUrl.match(regex).length == 1)) {
        return httpUrl.match(regex)[0]
    } else {
        return url
    }
}

//----------------------------------------------------------------------------------------
// TODO: what does this do?
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

//----------------------------------------------------------------------------------------
// `styles` is copy-pasted from `./styles.css`
var styles = `
.pidannotate {
    all: initial;
}

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
    font-family: 		Helvetica, Arial, sans-serif ;
    box-shadow:  		-5px 5px 5px 0px rgba(50, 50, 50, 0.3);
    z-index:     		200000;
    overflow-y:			auto;
}

.pidannotate * {
    font-family: Helvetica, Arial, sans-serif ;
}

.pidannotate hr {
    margin: 10px auto; 
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
    line-height:12px; 
    font-weight:bold; 
    margin: 4px; 
    padding: revert; 
    font-family: Helvetica, Arial, sans-serif; 
}

.pidannotate h3 {
    font-size:12px; 
    margin-top: 10px; 
    margin-bottom: 4px; 
    margin-left: -10px;
    line-height:12px; 
    font-weight:bold; 
    padding: revert; 
    font-family: Helvetica, Arial, sans-serif; 
}
        
.pidannotate a {
    text-decoration:none; 
    color:rgb(28,27,168); 
    padding: revert; 
}   

.pidannotate a:hover {
    text-decoration:underline; 
}

.pidannotate ul {
    margin: 0; 
    padding-left:15px; 
    text-indent: 0; 
    list-style-type: 0; 
}

.pidannotate li {
    font-size: 12px;
    margin-left: 10px; 
    line-height: 16px;
}

// .pidannotate .predicategroup {
//     border: 1px grey; 
//     border-style: solid none; 
//     border-width: 0 1px;
//     padding: 10px 0; 
// }

a[target=_blank]:after {
    content: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg==);
    margin: 0 3px 0 5px;
  }

hr:after {
    content:none;
}
`

// Add the styles above to a <style> tag before the first <script> tag in the body
var styleSheet = document.createElement("style")
styleSheet.innerText = styles
var ref = document.querySelector('script');
ref.parentNode.insertBefore(styleSheet, ref);
