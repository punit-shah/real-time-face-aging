const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const path = require('path');
const fs = require('fs');

const babelConfig = JSON.parse(fs.readFileSync('.babelrc'));

const config = {
  context: path.resolve(__dirname, 'src'),
  entry: {
    'js/index': [],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          path.resolve(__dirname, 'src', 'js', 'lib'),
          path.resolve(__dirname, 'node_modules'),
        ],
        use: {
          loader: 'eslint-loader',
          options: {
            configFile: path.resolve(__dirname, '.eslintrc.json'),
          },
        },
        enforce: 'pre',
      },
      {
        test: /\.js/,
        exclude: path.resolve(__dirname, 'node_modules'),
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      },
      {
        test: /.scss/,
        use: ExtractTextPlugin.extract({
          use: [
            {
              loader: 'css-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                outputStyle: 'compressed',
              },
            },
          ],
        }),
      },
    ],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new ExtractTextPlugin({
      filename: (getPath) => {
        return getPath('css/[name].css').replace('css/js', 'css');
      },
    }),
    new CopyWebpackPlugin([
      {from: '*.html'},
      {from: 'img/*'},
    ])
  ],
};

fs.readdirSync('src/js').map((file) => {
  if (file.endsWith('.js')) {
    const name = file.slice(0, -3);
    config.entry['js/index'].push(`./js/${name}`);
  }
});

fs.readdirSync('src/scss').map((file) => {
  if (file.endsWith('.scss') && !file.startsWith('_')) {
    const name = file.slice(0, -5);
    config.entry['js/index'].push(`./scss/${file}`);
  }
});

module.exports = config;
