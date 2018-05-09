// set up xml to js conversion tool
var parseString = require('xml2js').parseString;

// we'll use request-promise to port in the xml
var request = require("request-promise");

// booking XML data source
var bookingSrc = "http://mugshots.bcgov.net/booked90.xml";
//var bookingSrc = "http://mugshots.bcgov.net/rel15a.xml";

// we don't care about every value in each booking object. To limit which we want, to create more user-friendly keys and to check for the absence of data, let's build an object that maps replacement keys to select incoming keys: 
var detailKeys = {
    "nl":{"key":"last"},
    "nf":{"key":"first"},
    "nm":{"key":"middle"},
    "csz":{"key":"city"},
    "race":{"key":"race"},
    "sex":{"key":"sex"},
    "dob":{"key":"dob"},
    "age":{"key":"age"},
    "ht":{"key":"height"},
    "wt":{"key":"weight"},
    "bd":{"key":"booktime"},
    "bn":{"key":"booknum"},
    "nn":{"key":"inmatenum"},
    "dtout":{"key":"reldate"},
    "image1":{"key":"photo"},
    "ar":{"key":"arrestinfo"}
}

module.exports = (app) => {

    // handle get request for arrest data from <start> days ago to <end> days ago
    app.get("/mugshots/api/:start/:end", (req, res)=> {
        
        // front end should guard against this but what if some screwball decides to poke at the api and the end is before the start, or either is too far back?
        if (req.params.end > req.params.start) {
            req.params.end = req.params.start
        };

        if (req.params.start > 90) {
            req.params.start = 90;
        };
        if (req.params.end > 90) {
            req.params.end = 90;
        };

        // options for request-promise; nothing fancy, just return the body of bookingSrc, which is already in XML
        var options = {
            uri: bookingSrc,
            transform: (body)=> {
            return body;
            }
        };

        // make request to bookingSrc URI, a page of XML passed into the callback as "xml"
        request(options).then( (xml)=> {

            // turn xml into JSON as "result"; thank you, xml2js.parseString(), for doing the heavy lifting
            parseString(xml, (err, result)=> {
                
                // bookings will be an array of complex inmate data objects. See sample.js file for structure
                var bookings = result.envelop.ins[0].in;
                
                // date operations to establish start and end periods for booking retrieval
                // there's likely a more elegant way, but this is working
                var today = new Date();
                
                // subtract req.params.start and req.params.end values, which are integers representing days, from date objects
                var startDate = new Date().setDate(today.getDate()-req.params.start);
                var endDate = new Date().setDate(today.getDate()-req.params.end);
                
                // result is millisecond strings, so reconstitute as a date, and zero out hours, mins, secs, millisecs
                startDate = new Date(startDate);
                startDate.setHours(0,0,0,0);
                endDate = new Date(endDate);
                endDate.setHours(0,0,0,0);

                // filter results for bookings that match date window
                var requestedBookings = bookings.filter( (inmate) => {
                   
                    // in case there are multiple arrests, we want the booking date on the last arrest for any inmate, which we obtain with inmate.bd.slice(-1)[0]; also, zero out hours
                    var bookDate = new Date(inmate.bd.slice(-1)[0]);
                    bookDate.setHours(0,0,0,0);
                    
                    // is date in our window? add it to the new array
                    if  (startDate <= bookDate && endDate >= bookDate){
                        return true;
                    }
                    return false;    
                });

                // Map these date-matched bookings to our final response data object, using our detailKeys object to leave out unneeded data, check for missing info, process some in a special way, and transform the ugly source keys with more user-friendly ones
                var cleanedBookings = requestedBookings.map( (inmate) => {
                    var cleanedBooking = {};
                    
                    for (var detKey in detailKeys) {
                        
                        // does this key exist in the data?
                        if (inmate[detKey]) {

                            // is it gender?
                            if (detKey === "sex") {

                                // change abbreviations into full strings, for filtering on front-end
                                if (inmate.sex[0] === "F") {
                                    cleanedBooking.sex = "Female";

                                }
                                else if (inmate.sex[0] === "M") {
                                    cleanedBooking.sex = "Male"
                                }
                                else {
                                    cleanedBooking.sex = inmate.sex[0];
                                }
                            }
                        
                            // is it the photo?
                            else if (detKey === "image1") {
                               
                                // we just want the src of the last image 
                                cleanedBooking.photo = inmate.image1.slice(-1)[0].$.src
                            }

                            // is it the arrest info?
                            else if (detKey === "ar") {
                                
                                //we want the whole array; we'll process this deep data on the front end
                                cleanedBooking.arrestinfo = inmate.ar;

                                // set a "present" flag at the zero index to help the front end
                                // IE, on the front end, if (data.arrestinfo[0].present) { do something }
                                cleanedBooking.arrestinfo.unshift({"present": true});
                            }
                            
                            // everything else
                            else {
                            
                                // use the detKey.key and assign it the first element in the source value array
                                cleanedBooking[detailKeys[detKey].key] = inmate[detKey][0]
                            }
                        }
                        // key is not present in data
                        else {
                            // is it the photo?
                            if (detKey === "image1") {
                                cleanedBooking.photo = "http://media.islandpacket.com/static/news/crime/mugshots/noPhoto.jpg";
                            }

                            // is it the arrest info?
                            // create it, but set a flag so the front-end knows it has no data
                            if (detKey === "ar") {
                                cleanedBooking.arrestinfo = [{"present": false}];
                                }
                                                        
                            // everything else not present gets a simple N/A
                            else {
                                cleanedBooking[detailKeys[detKey].key] = "No data";
                            }
                        }
                    } // end of for loop
                    return cleanedBooking;
                });
                
                // send response back to front-end
                if (err) {
                    res.json( {
                        "success":false,
                        "error":JSON.stringify(err)
                    });
                }
                else 
                {
                    res.json( {
                        "success":true,
                        "data": cleanedBookings
                    });
                };
        });
    }).catch( (err)=> {
        console.log(JSON.stringify(err));
    });
});
};