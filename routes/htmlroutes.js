var path = require("path");
module.exports = (app)=>{
    app.use("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/index.html"));
  });
}