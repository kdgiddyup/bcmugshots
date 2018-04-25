console.log(type);
// establish 90-day boundary
var today = new Date();
today.setHours(0, 0, 0, 0);
var minDate = new Date().setDate(today.getDate() - 90);

// datepicker requires ISO format
minDate = new Date(minDate).toISOString().split("T")[0];

// get info from localStorage, if any
var bookingData = JSON.parse(localStorage.getItem("bcBookingData")) || {};
var bn = bookingData.bn;
var detaineeDate = bookingData.date;
var qStart = bookingData.start;
var qEnd = bookingData.end;
var qTerms = bookingData.terms;

// malformed url?
if (bn && !detaineeDate) {
  console.log("no date!");
  var isError = true;
} else if (detaineeDate && !bn) {
  console.log("no booking number!");
  var isError = true;
} else {
  var isError = false;
}

// where is our API?
// deploy: update with new API url
//var ajaxSrc = "http://localhost:3000/mugshots/api";
var ajaxSrc = "http://com.mugshots.local:8888/server/v1.1.php";

// for filtering purposes, create an array of stringified detainee data
var filterSource = [];

// global variable autoRun will be used to set timeout on filter keyup function
var autoRun;

$(document).ready(function() {
  // only need to see the filter spinner when filtering is happening ...
  $("#filterSpinner").hide();

  if (isError) {
    $("#inmate").html(
      "<p>There was an error fetching data from the Beaufort County Detention Center. Either the URL is malformed or the data is not available. Click or tap the button below to try again.</p>"
    );
  }

  // if this is a story page, we don't need a lot of data, just one day's worth, the detaineeDate
  if (type === "detail") {
    detaineeDate = new Date(parseInt(detaineeDate));
    var daysBack = Math.round((today - detaineeDate) / (1000 * 60 * 60 * 24));
    // get data, going back 1 extra day for safety
    getData(daysBack + 1, daysBack, qStart, qEnd, qTerms);
  } else {
    // it's the index page so check for default start/end params
    // if no params (qStart,qEnd) were placed in local storage, default start and end is today
    if (qStart != null) {
      var startDate = new Date().setDate(today.getDate() - qStart);
      startDate = new Date(startDate).toISOString().split("T")[0];
      var start = qStart;
    } else {
      // no start params set; default to today's date and 0 days back
      var startDate = new Date().toISOString().split("T")[0];
      var start = 0;
    }
    if (qEnd != null) {
      var endDate = new Date().setDate(today.getDate() - qEnd);
      endDate = new Date(endDate).toISOString().split("T")[0];
      var end = qEnd;
    } else {
      // no end param set; default to today's date and 0 days back
      var endDate = startDate;
      var end = 0;
    }

    // update date picker to show start and end values
    $("#startDate").val(startDate);
    $("#endDate").val(endDate);

    // if qStart is not null, update date range message
    if (qStart != null) {
      $("#dateRange").html(
        "Bookings from " +
          toLocaleFromIso(startDate) +
          " to " +
          toLocaleFromIso(endDate)
      );
    }
    // get data using passed parameters (set to 0 if not sent in)
    getData(start, end, qStart, qEnd, qTerms);
  }

  // update date picker with min/max attributes and default values
  $("#startDate,#endDate").attr({
    min: minDate,
    max: new Date().toISOString().split("T")[0]
  });

  // add click listener to date submit button
  $("#dateSubmitBtn").on("click", function() {
    // what are filter terms, if any?
    var termsAtDateSubmit = $("#filterInput")
      .val()
      .trim()
      .toLowerCase();

    // access form values
    var startVal = $("#startDate").val();
    if (startVal === "") {
      // if no value set days offset to 90
      var startDays = 1;
    } else {
      //compute start days offset
      var start = new Date(startVal);
      var startDays = Math.round((today - start) / (1000 * 60 * 60 * 24));
    }

    var endVal = $("#endDate").val();
    if (endVal === "") {
      // if no value set days offset to 0
      var endDays = 0;
    } else {
      //compute end days offset
      var end = new Date(endVal);
      var endDays = Math.round((today - end) / (1000 * 60 * 60 * 24));
    }
    // did the user pick an end date earlier than the start date? default to that date
    if (endDays > startDays) {
      endDays = startDays;
    }

    // update date range
    $("#dateRange").html(
      "Bookings from " +
        toLocaleFromIso(startVal) +
        " to " +
        toLocaleFromIso(endVal)
    );

    // fetch new data
    getData(startDays, endDays, qStart, qEnd, termsAtDateSubmit);
  });

  // add click listener to date shortcut buttons
  $(".dateShortcut").on("click", function() {
    // what button?
    var timeBack = $(this).attr("data-time-back");

    // update date range message
    var message =
      timeBack === "1"
        ? "Today's bookings"
        : "Bookings for the last " + timeBack + " days";

    $("#dateRange").html(message);

    // check for filter text
    var terms = $("#filterInput")
      .val()
      .trim()
      .toLowerCase();

    // fetch data based on button attribute and current filter
    getData(timeBack - 1, 0, qStart, qEnd, terms);
  });
}); // end doc ready

// update stats tag here since there's no byline
// mistats.contentsource="Posted by Kelly Davis | Source: Beaufort County Detention Center";

// function that calls API to retrieve booking data
function getData(start, end, qStart, qEnd, terms) {
  // replace any content in bookingPanel or inmate divs with load spinner
  $("#inmate, #inmates").html(
    '<div id="loadSpinner"><i class="fa fa-spinner fa-pulse fa-5x fa-fw"></i><span class="sr-only">Loading...</span></div>'
  );

  // reset sort buttons and icons to default values
  $("#sortAlpha").attr("data-sort", "asc");
  $("#alphaSortIcon").removeClass();

  $("#sortDate").attr("data-sort", "asc");
  $("#dateSortIcon")
    .removeClass()
    .addClass("fa fa-arrow-down");

  $.get(ajaxSrc + "?start=" + start + "&end=" + end, function(response) {
    if (response.success) {
      // are we on index page or details page?
      var pageType = $(".bookings").attr("data-page-type");

      if (pageType === "bookingIndex") {
        // sort desc by booking date/time
        response.data.sort(sortDateDesc);
        displayInmates(response.data, start, end, terms);
      } else if (pageType === "bookingDetails") {
        displayInmate(response.data, qStart, qEnd, terms);
      }
    } else {
      console.log(response);
      $("#bookingPanel, #inmates").html(
        "<h2>Error</h2><p>There was an error fetching data from the Beaufort County Detention Center. Please try again later. There might be more information in the browser console.</p>"
      );
    }
  }).fail(function(err) {
    $("#bookingPanel, #inmates, #inmate").html(
      "<h2>Error</h2><p>There was an error fetching inmate data. Either our server or the Beaufort County Detention Center inmate inquiry system is down. There might be more information in the browser console.</p>"
    );
    console.log("Error retrieving data:", JSON.stringify(err));
  });
}

function displayInmates(data, start, end, terms) {
  // remove any existing html, including the loading spinner
  $("#inmates").html("");

  // loop through inmate data returned from API
  for (var i = 0; i < data.length; i++) {
    var detainee = data[i];

    // add stringified version to filterSource
    filterSource.push(JSON.stringify(detainee));

    // build content block
    var inmateBlock =
      '<div data-booking-number="' +
      detainee.booknum +
      '" data-booktime = "' +
      detainee.booktime +
      '" class="detaineeIndex col-lg-2 col-md-2 col-sm-4 col-xs-6">';

    // start mugshot/details row
    inmateBlock += '<div class="row"><div class="col-lg-12">';

    // photo; if image error, fall back to "no photo" option
    inmateBlock +=
      '<img onerror="this.src=\'http://media.islandpacket.com/static/news/crime/mugshots/noPhoto.jpg\'" class="bcmugshot" src="' +
      detainee.photo +
      '" title="' +
      detainee.first +
      " " +
      detainee.middle +
      " " +
      detainee.last +
      '" alt="' +
      detainee.first +
      " " +
      detainee.middle +
      " " +
      detainee.last +
      '"/><div class="caption"><h2 class="name">' +
      detainee.first +
      " " +
      detainee.last +
      '</h2><p class="booktime"><strong>Booked:</strong> ' +
      detainee.booktime +
      "</p></div></div></div>";

    // place name, image on page
    $("#inmates").append(inmateBlock);
  } // end inmate data loop

  // process any passed in filter terms
  if (terms != null) {
    terms = decodeURI(terms);

    // update filter input
    $("#filterInput").val(terms);

    // send terms to filter
    // reveal spinner to cue user that filtering is occuring
    $("#filterSpinner").show("fast", function() {
      runFilter(terms);
    });
  }

  // add click listener to get user to mugshot story page
  var url = "detail.html";
  // deploy: change url to "http://www.islandpacket.com/news/local/crime/local-arrests/article157204724.html";

  $(".detaineeIndex").on("click", function() {
    // in format 04:51:40 10/04/17 but for wider (ie, IE) compatibility, need date with yyyy
    // can assume century comes from this year, so lets get first two digits of this year
    var year = new Date().getFullYear().toString();
    var century = year.slice(0, 2);
    // create array of date elements
    var bookdate = $(this)
      .attr("data-booktime")
      .split(" ")[1]
      .split("/");

    // add century element to year
    bookdate[2] = century + bookdate[2];

    // reconstitute date string
    bookdate = Date.parse(bookdate.join("/"));
    console.log(bookdate);

    // place terms in localStorage
    var bookingData = {
      bn: $(this).attr("data-booking-number"),
      date: bookdate,
      terms: encodeURI(
        $("#filterInput")
          .val()
          .trim()
          .toLowerCase()
      ),
      start: start,
      end: end
    };
    localStorage.setItem("bcBookingData", JSON.stringify(bookingData));
    $(location).attr({
      // build URL with booking number, date/time (in milliseconds), start/end dates of search period and filter terms if any; these will be passed back to index page to return it to same state user left it.
      href: url,
      target: "_blank"
    });
  }); // end click function

  // now that detainee blocks are on the DOM, add event listeners; we use the .off() to remove any first since displayInmates() is called on sorts and we don't want to add listeners on top of listeners

  // keyup listener for filter input
  $("#filterInput")
    .off()
    .on("keyup", function(event) {
      // clear any existing timeouts if a key is pressed
      clearTimeout(autoRun);

      // grab and normalize value from input
      var value = $(this)
        .val()
        .toLowerCase()
        .trim();

      // if value is "", user has cleared input field; clear timeout, show 'em all and get out
      if (value === "") {
        $(".detaineeIndex").show("fast");
        return;
      }

      //if a space key (32) or enter key (13) is pressed, filter right away
      if (event.which === 32 || event.which === 13) {
        // clear any timeout running
        clearTimeout(autoRun);

        // reveal spinner to cue user that filtering is occuring
        $("#filterSpinner").show("fast", function() {
          runFilter(value);
        });
        return;
      }

      // engage filter if no key is pressed after 1 second
      autoRun = setTimeout(function() {
        // reveal spinner to cue user that filtering is occuring
        $("#filterSpinner").show("fast", function() {
          runFilter(value);
        });
      }, 1000);
    });

  // add clear-filter listener
  $("#clearFilter")
    .off()
    .on("click", function() {
      //clear filter input
      $("#filterInput").val("");
      terms = null;

      // since this is not a keyup operation, we have to programmatically show all detaineeIndex classes
      $(".detaineeIndex").show("fast");
    });

  // add click listeners to sort buttons
  // Alphabetic by detainee last name
  $("#sortAlpha")
    .off()
    .on("click", function() {
      // get current filter terms
      var currentTerms = $("#filterInput")
        .val()
        .trim()
        .toLowerCase();

      // if either type of alpha sort is invoked, set date sort to "desc" and remove sort icon
      $("#sortDate").attr("data-sort", "desc");
      $("#dateSortIcon").removeClass();

      // sorting toggles between asc and desc; what sort are we doing now?
      if ($(this).attr("data-sort") === "desc") {
        // toggle data-sort to desc, change icon and call the sort
        $(this).attr("data-sort", "asc");
        $("#alphaSortIcon")
          .removeClass()
          .addClass("fa fa-arrow-down");
        data.sort(sortAlphaDesc);
        displayInmates(data, start, end, currentTerms);
      } else {
        // toggle data-sort to asc, update icon and call the sort
        $(this).attr("data-sort", "desc");
        $("#alphaSortIcon")
          .removeClass()
          .addClass("fa fa-arrow-up");
        data.sort(sortAlphaAsc);
        displayInmates(data, start, end, currentTerms);
      }
    });

  // Numeric by detainee booking date
  $("#sortDate")
    .off()
    .on("click", function() {
      // get current filter terms
      var currentTerms = $("#filterInput")
        .val()
        .trim()
        .toLowerCase();

      // if either type of date sort is invoked, set alpha sort flag to "asc" and update icon to neutral
      $("#sortAlpha").attr("data-sort", "asc");
      $("#alphaSortIcon").removeClass();

      // determine current sort order and call sort
      if ($(this).attr("data-sort") === "asc") {
        $(this).attr("data-sort", "desc");
        $("#dateSortIcon")
          .removeClass()
          .addClass("fa fa-arrow-up");
        data.sort(sortDateAsc);
        displayInmates(data, start, end, currentTerms);
      } else {
        $(this).attr("data-sort", "asc");
        $("#dateSortIcon")
          .removeClass()
          .addClass("fa fa-arrow-down");
        data.sort(sortDateDesc);
        displayInmates(data, start, end, currentTerms);
      }
    });
} // end displayInmates function

// for story page
function displayInmate(data, start, end, terms) {
  for (var i = 0; i < data.length; i++) {
    var inmate = data[i];

    // build content block if inmate matches URL param
    if (inmate.booknum === bn) {
      // we'll need the full name a couple places, so let's build it once:
      inmate.name = inmate.first + " " + inmate.middle + " " + inmate.last;

      // change browser title and headline to be this inmate and add booking number attribute to inmate div:
      $("#story-header > h3").html("Booking details: " + inmate.name);
      $("#inmate").attr("data-booking-number", inmate.booknum);

      // start photo column
      var inmateBlock =
        '<div class="row"><div class="col-lg-6 col-md-6 col-sm-6 col-xs-12">';

      inmateBlock +=
        '<img onerror="this.src=\'http://media.islandpacket.com/static/news/crime/mugshots/noPhoto.jpg\'" class="bcmugshot" src="' +
        inmate.photo +
        '" title="' +
        inmate.name +
        '" alt="' +
        inmate.name +
        '" /></div>';

      // set up detail column, including Return button
      inmateBlock +=
        '<div class="col-lg-6 col-md-6 col-sm-6 col-xs-12"><h4>Arrest information <button class="btn btn-primary pull-right" id="returnBtn">Return to Local Arrests</button></h4>';

      // start details table
      inmateBlock +=
        '<table class="details table table-hover table-striped"><tr><th>Booking date / time</th><td>' +
        inmate.booktime +
        "</td></tr><tr><th>Release date</th><td>" +
        inmate.reldate +
        "</td></tr><tr><th>Height / weight</th><td>" +
        inmate.height +
        ", " +
        inmate.weight +
        "lbs.</td></tr><tr><th>Date of birth</th><td>" +
        inmate.dob +
        " (age " +
        inmate.age +
        ")</td></tr><tr><th>City/ZIP</th><td>" +
        inmate.city +
        "</td></tr><tr><th>Race / gender</th><td>" +
        inmate.race +
        ", " +
        inmate.sex +
        "</td></tr></table>";

      // add div at end to hook in details
      inmateBlock +=
        '<div class="row"><div id="arrestDetails" class="col-lg-12"></div></div>';

      // place inmate info in DOM; using .html removes load spinner
      $("#inmate").html(inmateBlock);

      // Are there arrest details?
      // API returns a "present" flag at the beginning of the arrestinfo array:
      if (inmate.arrestinfo[0].present) {
        // loop through arrestinfo; start at 1 to skip "present" flag
        for (
          var arrestIndex = 1;
          arrestIndex < inmate.arrestinfo.length;
          arrestIndex++
        ) {
          // is there an agency listed for this arrest?
          if (inmate.arrestinfo[arrestIndex].aa[0].length === 0) {
            var agency = "None listed";
          } else {
            var agency = inmate.arrestinfo[arrestIndex].aa[0];
          }

          // is there an officer listed for this arrest?
          if (inmate.arrestinfo[arrestIndex].ao[0].length === 0) {
            var officer = "No arresting officer listed";
          } else {
            var officer = inmate.arrestinfo[arrestIndex].ao[0];
          }

          // start table for this arrest
          var detailBlock =
            '<table class="table table-hover agencyTable"><tr><th colspan="2" class="text-center">Agency: ' +
            agency +
            "</th><td></tr><tr><th>Arresting officer</th><td>" +
            officer +
            "</td></tr><tr><th>Charge/bond details</th><td>";

          // are there charges listed?
          if (inmate.arrestinfo[arrestIndex].of.length > 0) {
            //loop through offenses for this agency
            //first, alias this array for simplicity
            var offenses = inmate.arrestinfo[arrestIndex].of;
            for (var offIndex = 0; offIndex < offenses.length; offIndex++) {
              var thisOff = offenses[offIndex].ol[0];

              detailBlock +=
                '<div class="offense"><span class="leadin">Offense:</span> ' +
                thisOff +
                "<br/>";

              // if statute is not the same as the offense, create a statute row
              if (offenses[offIndex].os[0] !== offenses[offIndex].ol[0]) {
                detailBlock +=
                  '<span class="leadin">Statute:</span> ' +
                  offenses[offIndex].os[0] +
                  "<br/>";
              }
              detailBlock +=
                '<span class="leadin">Warrant:</span> ' +
                offenses[offIndex].ow[0] +
                '<br/><span class="leadin">Court:</span> ' +
                offenses[offIndex].oc[0] +
                "<br/>";

              // if bond info exists, add it
              if (offenses[offIndex].ob[0] !== "") {
                detailBlock +=
                  '<span class="leadin">Bond:</span> $' +
                  offenses[offIndex].ob[0] +
                  "</div>";
              } else {
                detailBlock += '<span class="leadin">Bond:</span> N/A</div>';
              }
            } // end offenses loop
            // close offenses row
            detailBlock += "</td></tr>";
          } // end charges exist conditional

          //no charges? close this row
          else {
            detailBlock += "None listed</td></tr>";
          }

          // close agency table
          detailBlock += "</table>";
        } // end arrestinfo loop
      } // end arrestinfo exists condition

      // no arrest info is present
      else {
        detailBlock += "No arrest info available</td></tr>";
      }
      // close table
      detailBlock += "</table>";

      // place arrest details in DOM
      $("#arrestDetails").html(detailBlock);
    } // end inmate found condition
  } // end inmate loop

  // add click listener to return button
  // deploy: change href to http://www.islandpacket.com/news/local/crime/local-arrests
  $("#returnBtn").on("click", function() {
    // set localStorage
    var bookingParams = {
      start: start,
      end: end,
      terms: terms
    };
    localStorage.setItem("bcBookingData", JSON.stringify(bookingParams));
    location.href = "index.html";
  });
} // end displayInmate function

// various helper functions

// filter
/* loop through stringified data stored in filterSource array and look for matches to passed in string as "value"; if found, show that offender. if not, hide it. 
// we target divs of class ".detaineeIndex" to show/hide by booking number attribute (data-booking-number)
*/
function runFilter(value) {
  // entered just a space? show everyone and get out
  if (!value) {
    $(".detaineeIndex").show("fast");
    $("#filterSpinner").hide("fast");
    return;
  }

  // separate terms by spaces, after removing any double spaces
  var values = value.replace(/\s{2,}/g, " ").split(" ");

  $(filterSource).each(function(index, element) {
    // reset isMatched flag
    var isMatched = false;

    // element represents the stringified version of each detainee object
    // create a JSON version to grab the booknum value
    var booknum = JSON.parse(element).booknum;

    // check this element string against each term
    for (var v = 0; v < values.length; v++) {
      // does the filter input value match any part of this detainee string?
      if (element.toLowerCase().indexOf(values[v]) === -1) {
        // no? set isMatched to false, exit loop because there's no need to keep searching
        isMatched = false;
        break;
      } else {
        // yes?
        // special case for 'male' since it is included in 'female'
        // if value being checked is male, but inmate record has "female", then this is not a match
        if (
          values[v] === "male" &&
          element.toLowerCase().indexOf("female") > -1
        ) {
          isMatched = false;
          break;
        }
        //set isMatched to true but keep checking other words in value array
        else isMatched = true;
      }
    }

    //after checking this element against each term currently in filter, is isMatched still true?
    if (isMatched) {
      $(".detaineeIndex[data-booking-number='" + booknum + "']").show("fast");
    }
    // otherwise, hide it
    else {
      $(".detaineeIndex[data-booking-number='" + booknum + "']").hide("fast");
    }

    if (index + 1 === filterSource.length) {
    }
  });
  // when filtering loop completes, remove spinner from input
  $("#filterSpinner").hide("fast");
}

// sort helpers; expects array of inmate ojects
function sortAlphaAsc(a, b) {
  var keyA = a.last;
  var keyB = b.last;

  if (keyA < keyB) return -1;
  if (keyA > keyB) return 1;
  return 0;
}

function sortAlphaDesc(a, b) {
  var keyA = a.last;
  var keyB = b.last;

  if (keyA < keyB) return 1;
  if (keyA > keyB) return -1;
  return 0;
}

function sortDateAsc(a, b) {
  // grab the date portion of the booktime string and turn it into a date
  var keyA = new Date(a.booktime);
  var keyB = new Date(b.booktime);

  // var keyA = new Date(a.booktime.split(" ")[1]);
  // var keyB = new Date(b.booktime.split(" ")[1]);
  return keyA - keyB;
}

function sortDateDesc(a, b) {
  // grab the date portion of the booktime string and turn it into a date
  var keyA = new Date(a.booktime);
  var keyB = new Date(b.booktime);
  return keyB - keyA;
}

// convert iso date strings to correct local date strings
// from zzzzBov answer at https://stackoverflow.com/questions/7556591/javascript-date-object-always-one-day-off
function toLocaleFromIso(isoDate) {
  // make a date out of the iso formatted date (yyyy-mm-dd)
  var dateString = new Date(isoDate);

  // correct for timezone offset
  dateString.setMinutes(
    dateString.getMinutes() + dateString.getTimezoneOffset()
  );

  // return date string as .toLocaleDateString() formatted string
  return dateString.toLocaleDateString();
}
