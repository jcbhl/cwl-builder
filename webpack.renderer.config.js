const rules = require('./webpack.rules');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const plugins = require('./webpack.plugins');
const path = require('path');

rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugins: [require("tailwindcss"), require("autoprefixer")],
        },
      },
    },],
});

rules.push({
  test: /\.s[ac]ss$/i,
  use: [
    "style-loader",
    "css-loader",
    "sass-loader",
  ],
})

rules.push({
  test: /\.(png|jpg|svg|gif)$/,
  loader: 'file-loader',
  options: {
    name: '[hash]-[name].[ext]',
    publicPath: '..',
    context: 'src',
  }
});

plugins.push(new CopyWebpackPlugin({patterns: [{from: path.join("src", "static"), to: "static"}]}));

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    // fallback: {
    //   os: require.resolve('os-browserify/browser'),
    // }
  },
};
