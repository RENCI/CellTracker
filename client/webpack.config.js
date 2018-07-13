const path = require('path');

var HtmlWebpackPlugin = require("html-webpack-plugin");
var HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: __dirname + "/app/index.html",
  filename: "index.html",
  inject: "body"
});

module.exports = {
  entry: [
    "./app/app.js"
  ],
  output: {
    path: path.resolve(__dirname, "../server/ct_core/static/ct_core/js"),
    filename: "index_bundle.js"
  },
  module: {
    rules: [
      {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}
    ]
  },
  plugins: [HtmlWebpackPluginConfig]
};
