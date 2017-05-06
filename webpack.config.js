const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const path = require('path');
const fs = require('fs');

const babelConfig = JSON.parse(fs.readFileSync('.babelrc'));

const config = {
  context: path.resolve(__dirname, 'src'),

  entry: {
    'js/index': ['./js/index'],
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
        test: /\.js$/,
        exclude: path.resolve(__dirname, 'node_modules'),
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      },
      {
        test: /.scss$/,
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
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new ExtractTextPlugin({
      filename: (getPath) => getPath('css/[name].css').replace('css/js', 'css'),
    }),
    new CopyWebpackPlugin([
      {from: '*.html'},
      {from: 'img/**/*'},
    ])
  ],

  devServer: {
    contentBase: path.resolve(__dirname, 'build'),
    compress: true,
    hot: true,
  }
};

fs.readdirSync('src/scss').map((file) => {
  if (file.endsWith('.scss') && !file.startsWith('_')) {
    const name = file.slice(0, -5);
    config.entry['js/index'].push(`./scss/${file}`);
  }
});

module.exports = config;
