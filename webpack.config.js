'use strict';

const Path = require('path');
const Webpack = require('webpack');

module.exports = {
  entry: './src/main.js',
  output: {
    path: Path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: 'facile-audio.js'
  },
  resolveLoader: {
    root: Path.join(__dirname, 'node_modules')
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel',
      exclude: [
        /node_modules/
      ]
    }]
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true
  },
  devtool: '#eval-source-map'
};

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#source-map';
  module.exports.module.loaders.push({
    test: /\.js$/,
    loader: 'strip-loader?strip[]=console.log'
  });
  module.exports.plugins = (module.exports.plugins || []).concat([
    new Webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new Webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new Webpack.optimize.OccurenceOrderPlugin()
  ]);
}
