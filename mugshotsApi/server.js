// ==================================================
// DEPENDENCIES
//===================================================
const express=require("express");

const bodyParser = require("body-parser");
const logger = require("morgan");
const app = express();
var cors = require('cors')
app.use(cors())

// deploy: remove dotenv refs
const dotenv=require("dotenv");
dotenv.config();

// Boilerplate bodyparser middleware config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" })); 

// Static directory
console.log("Path:",__dirname);
app.use(express.static(__dirname + "/public"));

// ===================================================
// ROUTES
// apiroutes handles request to BCDC mugshot XML output.
// htmlRoutes serves up a simple homepage
// ===================================================

require("./routes/apiroutes")(app);
require("./routes/htmlroutes")(app);

// Sets a development and production port. 
var PORT = process.env.PORT || 80;

// ==================================================
// start our server
// ==================================================
app.listen(PORT, function() {
  console.log(`App listening on port ${PORT}`);
});