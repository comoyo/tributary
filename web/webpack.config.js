var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    app: ["./lib/entry.jsx"]
  },
  output: {
    path: __dirname,
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /.(jsx|js)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
  plugins: [
    // Avoid publishing files when compilation failed
    new webpack.NoErrorsPlugin(),
  ],
  // Create Sourcemaps for the bundle
  devtool: 'source-map',
};
