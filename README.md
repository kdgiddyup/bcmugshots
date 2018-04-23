# bcdcMugshots
Node/Express project to snag booking details from Beaufort County Detention Center xml output

* Using xml2js https://www.npmjs.com/package/xml2js

* api pulls bookings up to 90 days prior when start days and end days are supplied as /api/mugshots/<start days>/<end days> Example: /api/mugshots/5/2 will return bookings between 5 and 2 days ago. 

* Returns array of JSON objects representing booking details on individuals
