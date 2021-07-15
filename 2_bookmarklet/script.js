// Bookmarklet

// http://code.tutsplus.com/tutorials/create-bookmarklets-the-right-way--net-18154

// http://stackoverflow.com/questions/5281007/bookmarklets-which-creates-an-overlay-on-page

// remote
var api_url = 'http://ec2-63-34-20-84.eu-west-1.compute.amazonaws.com:8501/predicate_object/by_uri?labels=true&uri=';

// local
// var api_url = 'http://localhost:8010/predicate_object/by_uri?labels=true&uri=';

const debug = false;

const bookmarkletTitle = 'Heritage Connector - connections found' //window.document.title

openSidebar();
show_annotations("https://collection.sciencemuseumgroup.org.uk/objects/co33")

//--------------------------------------------------------------------------------------------------
function closeSidebar(id) {
    document.getElementById(id).remove();
}

//--------------------------------------------------------------------------------------------------

async function getDataFromAPI(url) {
    const response = await fetch(api_url.concat(url), {
        method: 'POST',
        mode: 'same-origin'
    })

    return response.json();
}

// annotations?
function show_annotations(uri) {

    getDataFromAPI(uri)
        .then(data => {
            const gbPredicate = groupBy(data, item => item.predicate.value, abbreviateURI)
            console.log(gbPredicate)
            var html = '';

            // TODO: iterate through list of manually ordered predicates instead, so we can split them

            for (const [groupName, predicates] of Object.entries(predicateManualGroups)) {
                html += "<div class='predicategroup'>"
                html += '<h2>' + groupName + '</h2>'
                html += '<ul>'

                predicates.forEach(function(predicate) {
                    if (gbPredicate.get(predicate)) {
                        html += '<h3>' + abbreviateURI(predicate) + '</h3>';
                        gbPredicate.get(predicate).forEach(function(obj) {
                            html += '<li>';
                            if (obj.object.type == 'uri') {
                                if (obj.objectLabel) {
                                    html += '<a href="' + obj.object.value + '">' + obj.objectLabel.value + ' [' + abbreviateURI(obj.object.value) + ']' + '</a>'
                                } else {
                                    html += '<a href="' + obj.object.value + '">' + abbreviateURI(obj.object.value) + '</a>'
                                }
                            } else {
                                html += obj.object.value
                            }
                            html += '</li>'
                        })
                    };
                })
                html += '</ul> </div>'
            }
            
            document.getElementById("pidannotate").innerHTML += html
        });

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

.pidannotate h3 {
    font-size:12px;
    line-height:12px;
    font-weight:bold;
    margin: 4px -8px;
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
    margin: 0;
    padding-left:24px;
    text-indent: 0;
    list-style-type: 0;
}

.pidannotate .predicategroup {
    border: 1px grey;
    border-style: solid none;
    padding: 10px 0;
}
`

// Add the styles above to a <style> tag before the first <script> tag in the body
var styleSheet = document.createElement("style")
styleSheet.innerText = styles
var ref = document.querySelector('script');
ref.parentNode.insertBefore(styleSheet, ref);
